// @vitest-environment node
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * What the homepage selects (spec §8.2, §8.3, §34), exercised against
 * throwaway content trees rather than `content/`, so these tests keep meaning
 * something after the author has replaced the sample posts and lessons.
 *
 * `showDrafts` is a module-level constant, so every case re-imports
 * `lib/content/homepage` with the environment it wants — the same approach
 * `tests/blog.test.ts` and `tests/learn.test.ts` take.
 */
type HomepageModule = typeof import("@/lib/content/homepage");

const roots: string[] = [];

async function contentTree(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "homepage-"));
  roots.push(root);
  for (const [relativePath, body] of Object.entries(files)) {
    const file = path.join(root, relativePath);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body, "utf8");
  }
  return root;
}

/** Loads the module with drafts visible or hidden, whichever the case needs. */
async function homepageWithDrafts(visible: boolean): Promise<HomepageModule> {
  vi.stubEnv("SHOW_DRAFTS", visible ? "true" : "false");
  vi.resetModules();
  return import("@/lib/content/homepage");
}

beforeEach(() => {
  vi.stubEnv("VERCEL_ENV", undefined);
});

afterEach(async () => {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
  roots.length = 0;
  vi.unstubAllEnvs();
  vi.resetModules();
});

function post(title: string, publishedAt: string, extra: string[] = []): string {
  return [
    "---",
    `title: "${title}"`,
    `description: "About ${title}."`,
    `publishedAt: "${publishedAt}"`,
    ...extra,
    "---",
    "",
    `Body of ${title}.`,
  ].join("\n");
}

function lesson(title: string, order: number, extra: string[] = []): string {
  return [
    "---",
    `title: "${title}"`,
    `description: "About ${title}."`,
    `order: ${order}`,
    'publishedAt: "2026-01-01"',
    ...extra,
    "---",
    "",
    `Body of ${title}.`,
  ].join("\n");
}

describe("getRecentPosts", () => {
  it("returns the newest posts, in order, and no more than the limit", async () => {
    const tree = await contentTree({
      "first.mdx": post("First", "2026-01-01"),
      "second.mdx": post("Second", "2026-02-01"),
      "third.mdx": post("Third", "2026-03-01"),
      "fourth.mdx": post("Fourth", "2026-04-01"),
    });
    const { getRecentPosts, RECENT_POST_COUNT } = await homepageWithDrafts(false);

    const slugs = (await getRecentPosts(RECENT_POST_COUNT, tree)).map((entry) => entry.slug);

    expect(slugs).toEqual(["fourth", "third", "second"]);
  });

  it("never lists a draft in production, however recent it is", async () => {
    const tree = await contentTree({
      "published.mdx": post("Published", "2026-01-01"),
      "unfinished.mdx": post("Unfinished", "2026-12-01", ["draft: true"]),
    });
    const { getRecentPosts } = await homepageWithDrafts(false);

    const slugs = (await getRecentPosts(3, tree)).map((entry) => entry.slug);

    expect(slugs).toEqual(["published"]);
  });

  it("shows a draft where drafts are visible, so a preview deployment is useful", async () => {
    const tree = await contentTree({
      "published.mdx": post("Published", "2026-01-01"),
      "unfinished.mdx": post("Unfinished", "2026-12-01", ["draft: true"]),
    });
    const { getRecentPosts } = await homepageWithDrafts(true);

    const slugs = (await getRecentPosts(3, tree)).map((entry) => entry.slug);

    expect(slugs).toEqual(["unfinished", "published"]);
  });

  it("returns an empty list rather than failing when nothing is published", async () => {
    const tree = await contentTree({ "unfinished.mdx": post("Unfinished", "2026-01-01", ["draft: true"]) });
    const { getRecentPosts } = await homepageWithDrafts(false);

    expect(await getRecentPosts(3, tree)).toEqual([]);
  });
});

describe("getFeaturedLessons", () => {
  async function learnTree(): Promise<string> {
    return contentTree({
      "neural-networks/introduction.mdx": lesson("What a Neural Network Is", 10),
      "neural-networks/gradient-descent.mdx": lesson("Gradient Descent", 30),
      "neural-networks/backpropagation.mdx": lesson("Backpropagation", 40, ["draft: true"]),
      "transformers/attention.mdx": lesson("Attention", 20),
    });
  }

  it("resolves the configured paths in configured order, not in lesson order", async () => {
    const tree = await learnTree();
    const { getFeaturedLessons } = await homepageWithDrafts(false);

    const featured = await getFeaturedLessons(
      ["transformers/attention", "neural-networks/introduction"],
      tree,
    );

    expect(featured.map((entry) => `${entry.topicId}/${entry.lessonId}`)).toEqual([
      "transformers/attention",
      "neural-networks/introduction",
    ]);
    expect(featured[0]?.metadata.title).toBe("Attention");
  });

  it("drops a featured draft in production rather than linking to a page that 404s", async () => {
    const tree = await learnTree();
    const { getFeaturedLessons } = await homepageWithDrafts(false);

    const featured = await getFeaturedLessons(
      ["neural-networks/backpropagation", "neural-networks/introduction"],
      tree,
    );

    expect(featured.map((entry) => entry.lessonId)).toEqual(["introduction"]);
  });

  it("drops a path that names nothing, so a rename cannot break the page", async () => {
    const tree = await learnTree();
    const { getFeaturedLessons } = await homepageWithDrafts(false);

    const featured = await getFeaturedLessons(
      ["neural-networks/renamed-away", "not-a-topic/attention", "attention", ""],
      tree,
    );

    expect(featured).toEqual([]);
  });

  // The one case that reads the real tree on purpose: a typo in
  // `featuredLessonPaths` drops a lesson silently, and the homepage is the
  // wrong place to notice it. If the author retires a featured lesson, this
  // fails until the configuration follows.
  it("ships a default selection that names real, published lessons", async () => {
    const { getFeaturedLessons, featuredLessonPaths } = await homepageWithDrafts(false);

    const featured = await getFeaturedLessons();

    expect(featuredLessonPaths.length).toBeGreaterThan(0);
    expect(featured.map((entry) => `${entry.topicId}/${entry.lessonId}`)).toEqual([
      ...featuredLessonPaths,
    ]);
  });
});
