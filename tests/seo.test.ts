// @vitest-environment node
import type { Metadata } from "next";

import { beforeAll, describe, expect, it, vi } from "vitest";

import { blogEntries, lessonEntries, type ContentEntry, type LessonEntry } from "./content-oracle";

/**
 * Page metadata, the sitemap and `robots.txt` (spec §25, development plan
 * phase 16).
 *
 * The completion criteria are the assertions: titles are unique, descriptions
 * come from frontmatter, published content is in the sitemap and drafts are
 * not. They run against the real `content/` tree and the real route modules,
 * with `SHOW_DRAFTS=false` — production behaviour, whatever the ambient
 * environment says.
 *
 * What the content tree contains is read from the filesystem rather than from
 * `lib/content`, for the reason `tests/content-oracle.ts` sets out: a metadata
 * test that asked the code under test which posts exist would pass on an empty
 * list. `tests/feed.test.ts` covers the feed and `tests/seo-drafts.test.ts` the
 * preview case, where drafts are visible and must still stay out of both.
 */

// Before any module under test is imported: both values are read once, at
// module scope, so the environment has to be settled first.
vi.stubEnv("SHOW_DRAFTS", "false");
vi.stubEnv("VERCEL_ENV", undefined);
vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.test");

const SITE_URL = "https://example.test";
const FEED_PATH = "/rss.xml";

/** What Next passes `generateMetadata`; both halves are Promises. */
function routeProps<Params>(params: Params) {
  return { params: Promise.resolve(params), searchParams: Promise.resolve({}) };
}

type Route = {
  path: string;
  metadata: Metadata;
  /** Whether this route renders a dated article rather than an index. */
  article: boolean;
};

/**
 * Every route the site serves, with the metadata it would emit — collected the
 * way Next collects it: a static `metadata` export, or `generateMetadata` over
 * the params `generateStaticParams` produced.
 */
async function collectRoutes(): Promise<Route[]> {
  const [home, blog, learn, about, topics, posts, lessons] = await Promise.all([
    import("@/app/page"),
    import("@/app/blog/page"),
    import("@/app/learn/page"),
    import("@/app/about/page"),
    import("@/app/learn/[topic]/page"),
    import("@/app/blog/[slug]/page"),
    import("@/app/learn/[topic]/[lesson]/page"),
  ]);

  const [topicParams, postParams, lessonParams] = await Promise.all([
    topics.generateStaticParams(),
    posts.generateStaticParams(),
    lessons.generateStaticParams(),
  ]);

  return [
    { path: "/", metadata: home.metadata, article: false },
    { path: "/blog", metadata: blog.metadata, article: false },
    { path: "/learn", metadata: learn.metadata, article: false },
    { path: "/about", metadata: await about.generateMetadata(), article: false },
    ...(await Promise.all(
      topicParams.map(async ({ topic }) => ({
        path: `/learn/${topic}`,
        metadata: await topics.generateMetadata(routeProps({ topic })),
        article: false,
      })),
    )),
    ...(await Promise.all(
      postParams.map(async ({ slug }) => ({
        path: `/blog/${slug}`,
        metadata: await posts.generateMetadata(routeProps({ slug })),
        article: true,
      })),
    )),
    ...(await Promise.all(
      lessonParams.map(async ({ topic, lesson }) => ({
        path: `/learn/${topic}/${lesson}`,
        metadata: await lessons.generateMetadata(routeProps({ topic, lesson })),
        article: true,
      })),
    )),
  ];
}

let routes: Route[] = [];
let siteName = "";
let posts: ContentEntry[] = [];
let lessons: LessonEntry[] = [];

beforeAll(async () => {
  const { site } = await import("@/lib/site");
  siteName = site.name;
  [routes, posts, lessons] = await Promise.all([collectRoutes(), blogEntries(), lessonEntries()]);
});

/** The `<title>` a route resolves to: its own, or the root layout's default. */
function resolvedTitle(route: Route): string {
  return typeof route.metadata.title === "string" ? route.metadata.title : siteName;
}

describe("every route's metadata", () => {
  it("covers the homepage, both indexes, the about page, the topics and the articles", () => {
    expect(routes.map((route) => route.path)).toEqual(
      expect.arrayContaining(["/", "/blog", "/learn", "/about"]),
    );
    expect(routes.length).toBeGreaterThan(4);
  });

  it("gives each route a canonical URL that is its own path", () => {
    for (const route of routes) {
      expect(route.metadata.alternates?.canonical).toBe(route.path);
    }
  });

  it("carries a description on every route", () => {
    for (const route of routes) {
      expect(route.metadata.description, route.path).toEqual(expect.any(String));
      expect(String(route.metadata.description).trim().length).toBeGreaterThan(0);
    }
  });

  it("takes each article's description from its frontmatter", async () => {
    const { getAllBlogPosts } = await import("@/lib/content/blog");
    const { getAllLessons } = await import("@/lib/content/learn");
    const content = new Map<string, string>([
      ...(await getAllBlogPosts()).map(
        (post) => [`/blog/${post.slug}`, post.metadata.description] as const,
      ),
      ...(await getAllLessons()).map(
        (lesson) =>
          [`/learn/${lesson.topicId}/${lesson.lessonId}`, lesson.metadata.description] as const,
      ),
    ]);

    for (const route of routes.filter((candidate) => candidate.article)) {
      expect(route.metadata.description, route.path).toBe(content.get(route.path));
    }
  });

  it("gives every route a title no other route has", () => {
    const titles = routes.map(resolvedTitle);

    expect(titles).toHaveLength(new Set(titles).size);
  });

  it("advertises the feed from every page", () => {
    for (const route of routes) {
      expect(route.metadata.alternates?.types?.["application/rss+xml"]).toBe(FEED_PATH);
    }
  });

  it("emits Open Graph tags that agree with the page", () => {
    for (const route of routes) {
      const openGraph = route.metadata.openGraph;

      expect(openGraph?.siteName, route.path).toBe(siteName);
      expect(openGraph?.url, route.path).toBe(route.path);
      expect(openGraph?.title, route.path).toBe(resolvedTitle(route));
      expect(openGraph?.description, route.path).toBe(route.metadata.description);
    }
  });

  it("marks articles as articles, with their publication dates, and indexes as websites", () => {
    const dates = new Map<string, ContentEntry>(
      [...posts, ...lessons].map((entry) => [entry.url, entry]),
    );

    for (const route of routes) {
      const openGraph = route.metadata.openGraph;

      // Matched rather than read: `type` discriminates the `OpenGraph` union,
      // so it is not a property of the union itself.
      if (!route.article) {
        expect(openGraph, route.path).toMatchObject({ type: "website" });
        continue;
      }

      const entry = dates.get(route.path);
      expect(openGraph, route.path).toMatchObject({
        type: "article",
        publishedTime: entry?.publishedAt,
        modifiedTime: entry?.updatedAt,
      });
    }
  });

  it("leaves published pages indexable", () => {
    for (const route of routes) {
      expect(route.metadata.robots, route.path).toBeUndefined();
    }
  });
});

describe("the sitemap, with SHOW_DRAFTS=false", () => {
  it("lists every published route once, and nothing else", async () => {
    const { default: sitemap } = await import("@/app/sitemap");
    const urls = (await sitemap()).map((entry) => entry.url);

    const expected = [
      "/",
      "/blog",
      "/learn",
      "/about",
      ...new Set(lessons.filter((lesson) => !lesson.draft).map((lesson) => `/learn/${lesson.topicId}`)),
      ...posts.filter((post) => !post.draft).map((post) => post.url),
      ...lessons.filter((lesson) => !lesson.draft).map((lesson) => lesson.url),
    ].map((path) => (path === "/" ? SITE_URL : `${SITE_URL}${path}`));

    expect(urls).toHaveLength(new Set(urls).size);
    expect(urls.toSorted()).toEqual(expected.toSorted());
  });

  it("dates each entry from the content rather than from the build", async () => {
    const { default: sitemap } = await import("@/app/sitemap");
    const entries = new Map((await sitemap()).map((entry) => [entry.url, entry.lastModified]));

    for (const entry of [...posts, ...lessons].filter((candidate) => !candidate.draft)) {
      expect(entries.get(`${SITE_URL}${entry.url}`), entry.url).toBe(
        entry.updatedAt ?? entry.publishedAt,
      );
    }
  });

  it("puts the homepage first, so a crawler meets the site before its parts", async () => {
    const { default: sitemap } = await import("@/app/sitemap");

    expect((await sitemap())[0]?.url).toBe(SITE_URL);
  });
});

describe("robots.txt", () => {
  it("allows every crawler and names the sitemap absolutely", async () => {
    const { default: robots } = await import("@/app/robots");
    const output = robots();

    expect(output.rules).toEqual({ userAgent: "*", allow: "/" });
    expect(output.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });
});
