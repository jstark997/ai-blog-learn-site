// @vitest-environment node
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { blogEntries, lessonEntries, type ContentEntry, type LessonEntry } from "./content-oracle";

/**
 * The draft audit (spec §16, development plan phase 15).
 *
 * Draft *filtering* was built in phases 5 and 7 and is tested there, a
 * consumer at a time, against synthetic content trees. This file is the
 * cross-cutting proof: with `SHOW_DRAFTS=false` — production behaviour,
 * whatever the ambient environment says — it renders the real routes over the
 * real `content/` tree and asserts that the drafts the repository ships appear
 * in no listing, are generated into no route, and 404 at their own URLs.
 *
 * **Which drafts exist is read from the filesystem, not from `lib/content`** —
 * see `tests/content-oracle.ts` for why that independence is the whole point.
 * `scripts/verify.mjs` makes the same assertions against a real server and real
 * status codes; this is their in-process counterpart, over the route modules
 * and what they render.
 *
 * Two things are deliberately *not* asserted. A draft's title is checked only
 * where a page renders metadata — an index, a card, a nav entry — and never
 * across a compiled MDX body, because published prose is allowed to mention an
 * unfinished lesson by name, and `content/learn/neural-networks/introduction`
 * already does. And the sitemap and the RSS feed are phase 16: the glob near
 * the foot of this file finds them by filename, so they join the audit on the
 * day they are written rather than when someone remembers this file.
 */

// Before any module under test is imported: `showDrafts` is a module-level
// constant, so the environment has to be settled first (spec §16).
vi.stubEnv("SHOW_DRAFTS", "false");
vi.stubEnv("VERCEL_ENV", undefined);

const REPOSITORY_ROOT = process.cwd();

let posts: ContentEntry[] = [];
let lessons: LessonEntry[] = [];
let drafts: ContentEntry[] = [];

beforeAll(async () => {
  [posts, lessons] = await Promise.all([blogEntries(), lessonEntries()]);
  drafts = [...posts, ...lessons].filter((entry) => entry.draft);
});

/** What Next passes a page or a `generateMetadata`; both halves are Promises. */
function routeProps<Params>(
  params: Params,
): {
  params: Promise<Params>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
} {
  return { params: Promise.resolve(params), searchParams: Promise.resolve({}) };
}

/** `notFound()` throws this digest; a 404 is the only thing that carries it. */
const NOT_FOUND_DIGEST = "NEXT_HTTP_ERROR_FALLBACK;404";

/** Anchors in rendered markup, as `[href, text]`. */
function links(html: string): { href: string; text: string }[] {
  return [...html.matchAll(/<a\b[^>]*?href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map((match) => ({
    href: match[1],
    text: match[2].replace(/<[^>]*>/g, ""),
  }));
}

/**
 * The assertion every listing has to satisfy: it links to no draft, and it does
 * not name one either. Both halves matter — a card rendered without its link
 * would still have leaked the fact that the post exists, and its description
 * with it.
 */
function expectNoDraftIn(html: string): void {
  const rendered = links(html);

  for (const draft of drafts) {
    expect(rendered.map((link) => link.href)).not.toContain(draft.url);
    expect(rendered.map((link) => link.text)).not.toContain(draft.title);
  }
}

/** The weaker half, for a page that also renders prose: no link to a draft. */
function expectNoDraftLinkIn(html: string): void {
  const hrefs = links(html).map((link) => link.href);

  for (const draft of drafts) {
    expect(hrefs).not.toContain(draft.url);
  }
}

/**
 * The audit is only worth running against content that has something to hide.
 * A repository with no drafts would pass every assertion below while proving
 * nothing, so the fixture is checked first — as `scripts/verify.mjs` checks it.
 */
describe("the sample content", () => {
  it("ships a draft post and a draft lesson, so the audit has something to catch", () => {
    expect(posts.filter((entry) => entry.draft).length).toBeGreaterThanOrEqual(1);
    expect(lessons.filter((entry) => entry.draft).length).toBeGreaterThanOrEqual(1);
  });
});

describe("indexes, with SHOW_DRAFTS=false", () => {
  it("keeps drafts off the homepage — recent posts and featured lessons alike", async () => {
    const { default: HomePage } = await import("@/app/page");

    expectNoDraftIn(renderToStaticMarkup(await HomePage()));
  });

  it("keeps drafts off the blog index", async () => {
    const { default: BlogIndexPage } = await import("@/app/blog/page");

    expectNoDraftIn(renderToStaticMarkup(await BlogIndexPage()));
  });

  it("keeps drafts off the learn index", async () => {
    const { default: LearnIndexPage } = await import("@/app/learn/page");

    expectNoDraftIn(renderToStaticMarkup(await LearnIndexPage()));
  });

  it("keeps drafts off every topic page that is generated", async () => {
    const { default: TopicPage, generateStaticParams } = await import("@/app/learn/[topic]/page");
    const generated = await generateStaticParams();
    expect(generated.length).toBeGreaterThan(0);

    for (const { topic } of generated) {
      expectNoDraftIn(renderToStaticMarkup(await TopicPage(routeProps({ topic }))));
    }
  });

  /**
   * A lesson page carries three listings of its own — the topic sidebar, the
   * prerequisites and the pager — and every one of them is built from the same
   * filtered ordering, so none may offer a way to a draft (spec §13).
   */
  it("keeps drafts out of the navigation on every lesson page that is generated", async () => {
    const { default: LessonPage, generateStaticParams } = await import(
      "@/app/learn/[topic]/[lesson]/page"
    );
    const generated = await generateStaticParams();
    expect(generated.length).toBeGreaterThan(0);

    for (const { topic, lesson } of generated) {
      const html = renderToStaticMarkup(await LessonPage(routeProps({ topic, lesson })));
      expectNoDraftLinkIn(html);
      // Nothing on a published page may be badged as a draft either.
      expect(html).not.toContain(">Draft<");
    }
  }, 60_000);
});

describe("static generation, with SHOW_DRAFTS=false", () => {
  it("generates no draft article, and pins dynamicParams so none is rendered on demand", async () => {
    const route = await import("@/app/blog/[slug]/page");
    const generated = (await route.generateStaticParams()).map(({ slug }) => `/blog/${slug}`);

    expect(generated.toSorted()).toEqual(
      posts
        .filter((post) => !post.draft)
        .map((post) => post.url)
        .toSorted(),
    );
    // Without this Next would render an unlisted — or draft — slug on demand;
    // omitting a route from generateStaticParams is not enough (spec §16).
    expect(route.dynamicParams).toBe(false);
  });

  it("generates no draft lesson, and pins dynamicParams too", async () => {
    const route = await import("@/app/learn/[topic]/[lesson]/page");
    const generated = (await route.generateStaticParams()).map(
      ({ topic, lesson }) => `/learn/${topic}/${lesson}`,
    );

    expect(generated.toSorted()).toEqual(
      lessons
        .filter((lesson) => !lesson.draft)
        .map((lesson) => lesson.url)
        .toSorted(),
    );
    expect(route.dynamicParams).toBe(false);
  });

  it("generates no topic that has nothing published in it", async () => {
    const route = await import("@/app/learn/[topic]/page");
    const generated = (await route.generateStaticParams()).map(({ topic }) => topic);
    const published = new Set(lessons.filter((lesson) => !lesson.draft).map((l) => l.topicId));

    expect(generated.toSorted()).toEqual([...published].toSorted());
    expect(route.dynamicParams).toBe(false);
  });
});

describe("a draft URL entered directly, with SHOW_DRAFTS=false", () => {
  it("404s for every draft post", async () => {
    const { default: BlogPostPage } = await import("@/app/blog/[slug]/page");

    for (const post of posts.filter((entry) => entry.draft)) {
      const slug = post.url.slice("/blog/".length);
      await expect(BlogPostPage(routeProps({ slug }))).rejects.toMatchObject({
        digest: NOT_FOUND_DIGEST,
      });
    }
  });

  it("404s for every draft lesson", async () => {
    const { default: LessonPage } = await import("@/app/learn/[topic]/[lesson]/page");

    for (const lesson of lessons.filter((entry) => entry.draft)) {
      await expect(
        LessonPage(routeProps({ topic: lesson.topicId, lesson: lesson.lessonId })),
      ).rejects.toMatchObject({ digest: NOT_FOUND_DIGEST });
    }
  });

  /**
   * A 404 that still emitted the draft's title in its `<head>` would have
   * leaked the thing the 404 was for. `generateMetadata` resolves through the
   * same helper the page does, so it has nothing to say about a hidden draft.
   */
  it("returns no metadata for a draft, so its title cannot leak into a 404", async () => {
    const blog = await import("@/app/blog/[slug]/page");
    const learn = await import("@/app/learn/[topic]/[lesson]/page");

    for (const post of posts.filter((entry) => entry.draft)) {
      const slug = post.url.slice("/blog/".length);
      await expect(blog.generateMetadata(routeProps({ slug }))).resolves.toEqual({});
    }
    for (const lesson of lessons.filter((entry) => entry.draft)) {
      await expect(
        learn.generateMetadata(routeProps({ topic: lesson.topicId, lesson: lesson.lessonId })),
      ).resolves.toEqual({});
    }
  });
});

/**
 * The other half of the audit, and the one the rendering tests cannot perform:
 * that the rule has exactly one implementation.
 *
 * Every assertion above would still pass if a component decided draft
 * visibility for itself and happened to get it right — and would go on passing
 * until the day it got it wrong. So the source is read instead: the environment
 * variables that carry the rule may be mentioned in `lib/content/env.ts` and
 * nowhere else, and `showDrafts` may be consulted only by the content
 * utilities, which is what makes "nothing here filters anything itself" a fact
 * rather than a comment (spec §16).
 */
const SOURCE_DIRECTORIES = ["app", "components", "lib"];

/** Every `.ts`/`.tsx` file under a directory, as repository-relative paths. */
async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(path.join(REPOSITORY_ROOT, directory), { withFileTypes: true });

  const nested = await Promise.all(
    entries.map(async (entry) => {
      const relative = path.join(directory, entry.name);
      if (entry.isDirectory()) return sourceFiles(relative);
      return /\.tsx?$/.test(entry.name) ? [relative] : [];
    }),
  );

  return nested.flat();
}

describe("the rule has one implementation", () => {
  let sources: { file: string; text: string }[] = [];

  beforeAll(async () => {
    const files = (await Promise.all(SOURCE_DIRECTORIES.map(sourceFiles))).flat();
    sources = await Promise.all(
      files.map(async (file) => ({
        file,
        text: await readFile(path.join(REPOSITORY_ROOT, file), "utf8"),
      })),
    );
  });

  it("reads NODE_ENV, VERCEL_ENV and SHOW_DRAFTS in lib/content/env.ts and nowhere else", () => {
    const offenders = sources
      .filter((source) => source.file !== path.join("lib", "content", "env.ts"))
      .filter((source) => /process\.env\.(NODE_ENV|VERCEL_ENV|SHOW_DRAFTS)/.test(source.text))
      .map((source) => source.file);

    expect(offenders).toEqual([]);
  });

  it("consults showDrafts only from the content utilities", () => {
    const importers = sources
      .filter((source) => /\bimport\b[^;]*\bshowDrafts\b/.test(source.text))
      .map((source) => source.file);

    expect(importers.toSorted()).toEqual(
      [path.join("lib", "content", "blog.ts"), path.join("lib", "content", "learn.ts")].toSorted(),
    );
  });
});

/**
 * Route modules that publish a list of URLs rather than a page: `sitemap.ts`
 * and any XML feed route (spec §25). Both arrive in phase 16. The globs are
 * resolved against the filesystem when this file is transformed, so they are
 * empty today and populate themselves the moment those files are written —
 * which is the only way this audit can cover code that does not exist yet.
 */
const urlListings: Record<string, () => Promise<unknown>> = {
  ...import.meta.glob("../app/**/sitemap.ts"),
  ...import.meta.glob("../app/**/*.xml/route.ts"),
};

/** A listing's output as text, whichever of the two shapes it has. */
async function listingBody(module: unknown): Promise<string> {
  const exports = module as { default?: unknown; GET?: unknown };

  if (typeof exports.GET === "function") {
    const response: unknown = await exports.GET(new Request("http://localhost/"));
    if (response instanceof Response) return response.text();
    return JSON.stringify(response);
  }
  if (typeof exports.default === "function") {
    return JSON.stringify(await exports.default());
  }

  throw new Error("A URL listing must export either a default function or GET");
}

describe.each(Object.keys(urlListings))("%s, with SHOW_DRAFTS=false", (name) => {
  it("lists no draft URL", async () => {
    const body = await listingBody(await urlListings[name]());

    for (const draft of drafts) {
      expect(body).not.toContain(draft.url);
    }
  });
});
