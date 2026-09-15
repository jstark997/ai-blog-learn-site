import { beforeAll, describe, expect, it, vi } from "vitest";

import { blogEntries, type ContentEntry } from "./content-oracle";

/**
 * The RSS feed (spec §25, development plan phase 16).
 *
 * The completion criterion is that `/rss.xml` validates as well-formed XML, so
 * that is asserted literally: every document this file builds is handed to a
 * real XML parser, and a parse error fails the test. This runs in the default
 * jsdom environment for `DOMParser` — one is not worth a dependency, and a
 * regular-expression check for balanced tags would not have caught the
 * unescaped ampersand that is the actual failure mode.
 *
 * `lib/feed.ts` takes its posts as an argument, so the escaping and ordering
 * cases are built here rather than mined out of `content/`. The last block
 * drives the real route over the real tree.
 */

vi.stubEnv("SHOW_DRAFTS", "false");
vi.stubEnv("VERCEL_ENV", undefined);
vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.test");

const SITE_URL = "https://example.test";

/** Parses, and throws on anything a feed reader would reject. */
function parseXml(xml: string): Document {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  const error = document.querySelector("parsererror");

  if (error !== null) throw new Error(error.textContent ?? "malformed XML");
  return document;
}

/** The text of every `<tag>` in document order. */
function textOf(document: Document, tag: string): string[] {
  return [...document.querySelectorAll(tag)].map((element) => element.textContent ?? "");
}

type PostInput = {
  slug: string;
  title?: string;
  description?: string;
  publishedAt?: string;
  tags?: string[];
  draft?: boolean;
};

/** A `BlogPost`, as `lib/content/blog.ts` would have returned it. */
function post(input: PostInput) {
  return {
    slug: input.slug,
    content: "Body text, which a summary feed does not carry.",
    metadata: {
      title: input.title ?? input.slug,
      description: input.description ?? `About ${input.slug}.`,
      publishedAt: input.publishedAt ?? "2026-09-04",
      updatedAt: undefined,
      tags: input.tags ?? [],
      draft: input.draft ?? false,
    },
  };
}

describe("the feed document", () => {
  it("is well-formed XML with a channel and one item per post", async () => {
    const { buildRssFeed } = await import("@/lib/feed");
    const document = parseXml(
      buildRssFeed([post({ slug: "second", publishedAt: "2026-09-04" }), post({ slug: "first" })]),
    );

    expect(document.documentElement.tagName).toBe("rss");
    expect(document.documentElement.getAttribute("version")).toBe("2.0");
    expect(textOf(document, "channel > item > link")).toEqual([
      `${SITE_URL}/blog/second`,
      `${SITE_URL}/blog/first`,
    ]);
  });

  it("escapes the characters XML reserves, wherever an author can type them", async () => {
    const { buildRssFeed } = await import("@/lib/feed");
    const title = `Tools & Toys: <script> and "quotes" and 'apostrophes'`;
    const xml = buildRssFeed([post({ slug: "escaping", title, description: "5 > 3 & 2 < 4" })]);

    // The raw document must not contain the unescaped markup...
    expect(xml).not.toContain("<script>");
    expect(xml).toContain("&amp;");
    // ...and a parser must read the original text back out of it.
    const document = parseXml(xml);
    expect(textOf(document, "item > title")).toEqual([title]);
    expect(textOf(document, "item > description")).toEqual(["5 > 3 & 2 < 4"]);
  });

  it("leaves drafts out, wherever they sit in the list", async () => {
    const { buildRssFeed } = await import("@/lib/feed");
    const xml = buildRssFeed([
      post({ slug: "published-one" }),
      post({ slug: "unfinished", draft: true }),
      post({ slug: "published-two" }),
    ]);

    expect(xml).not.toContain("unfinished");
    expect(textOf(parseXml(xml), "item > guid")).toEqual([
      `${SITE_URL}/blog/published-one`,
      `${SITE_URL}/blog/published-two`,
    ]);
  });

  it("dates items as RFC 822, and the channel from the newest post", async () => {
    const { buildRssFeed } = await import("@/lib/feed");
    const document = parseXml(
      buildRssFeed([
        post({ slug: "newest", publishedAt: "2026-09-10" }),
        post({ slug: "older", publishedAt: "2026-08-21" }),
      ]),
    );

    expect(textOf(document, "item > pubDate")).toEqual([
      "Thu, 10 Sep 2026 00:00:00 GMT",
      "Fri, 21 Aug 2026 00:00:00 GMT",
    ]);
    // Derived from the content, so two builds of the same posts agree.
    expect(textOf(document, "channel > lastBuildDate")).toEqual(["Thu, 10 Sep 2026 00:00:00 GMT"]);
  });

  it("carries the channel identity and a self link a validator will accept", async () => {
    const { buildRssFeed } = await import("@/lib/feed");
    const { site } = await import("@/lib/site");
    const document = parseXml(buildRssFeed([post({ slug: "only" })]));

    expect(textOf(document, "channel > title")).toEqual([site.name]);
    // `:not([rel])` because a CSS selector ignores the prefix: the Atom self
    // link below is also a `link` child of the channel.
    expect(textOf(document, "channel > link:not([rel])")).toEqual([`${SITE_URL}/blog`]);
    expect(textOf(document, "channel > description")).toEqual([site.blogDescription]);

    const self = document.querySelector('channel > link[rel="self"]');
    expect(self?.getAttribute("href")).toBe(`${SITE_URL}/rss.xml`);
    expect(self?.getAttribute("type")).toBe("application/rss+xml");
  });

  it("stays well-formed with no posts at all", async () => {
    const { buildRssFeed } = await import("@/lib/feed");
    const document = parseXml(buildRssFeed([]));

    expect(document.querySelectorAll("item")).toHaveLength(0);
  });

  it("tags an item with each of its categories", async () => {
    const { buildRssFeed } = await import("@/lib/feed");
    const document = parseXml(buildRssFeed([post({ slug: "tagged", tags: ["agents", "r&d"] })]));

    expect(textOf(document, "item > category")).toEqual(["agents", "r&d"]);
  });
});

describe("/rss.xml, over the real content tree", () => {
  let body = "";
  let response: Response;
  let feedPosts: ContentEntry[] = [];

  beforeAll(async () => {
    const { GET } = await import("@/app/rss.xml/route");
    response = await GET();
    body = await response.clone().text();
    feedPosts = await blogEntries();
  });

  it("serves XML under the RSS media type", () => {
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/rss+xml; charset=utf-8");
    expect(() => parseXml(body)).not.toThrow();
  });

  it("carries every published post and no draft", () => {
    const links = textOf(parseXml(body), "item > link");

    for (const entry of feedPosts) {
      const url = `${SITE_URL}${entry.url}`;
      if (entry.draft) expect(links).not.toContain(url);
      else expect(links).toContain(url);
    }
  });

  it("is prerendered rather than rebuilt per request", async () => {
    const route = await import("@/app/rss.xml/route");

    expect(route.dynamic).toBe("force-static");
  });
});
