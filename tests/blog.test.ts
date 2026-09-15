// @vitest-environment node
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Blog retrieval, exercised against throwaway content trees rather than
 * `content/blog/`, so these tests keep meaning something after the author has
 * replaced the sample posts with his own (spec §40.2).
 *
 * `showDrafts` is a module-level constant, so every case re-imports
 * `lib/content/blog` with the environment it wants — the same approach
 * `tests/env.test.ts` takes.
 */
type BlogModule = typeof import("@/lib/content/blog");

let root = "";

async function contentTree(files: Record<string, string>): Promise<string> {
  root = await mkdtemp(path.join(tmpdir(), "blog-"));
  for (const [relativePath, body] of Object.entries(files)) {
    const file = path.join(root, relativePath);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body, "utf8");
  }
  return root;
}

/** Loads the module with drafts visible or hidden, whichever the case needs. */
async function blogWithDrafts(visible: boolean): Promise<BlogModule> {
  vi.stubEnv("SHOW_DRAFTS", visible ? "true" : "false");
  vi.resetModules();
  return import("@/lib/content/blog");
}

beforeEach(() => {
  vi.stubEnv("VERCEL_ENV", undefined);
});

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
  root = "";
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetModules();
});

/** Frontmatter with everything optional left out, so defaults are exercised. */
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

describe("getAllBlogPosts", () => {
  it("discovers every .mdx file in the blog directory", async () => {
    const tree = await contentTree({
      "first.mdx": post("First", "2026-01-01"),
      "second.mdx": post("Second", "2026-01-02"),
    });
    const { getAllBlogPosts } = await blogWithDrafts(false);

    const slugs = (await getAllBlogPosts(tree)).map((entry) => entry.slug);

    expect(slugs).toEqual(["second", "first"]);
  });

  it("ignores files that are not posts, and anything nested", async () => {
    const tree = await contentTree({
      "real.mdx": post("Real", "2026-01-01"),
      "notes.md": post("Wrong extension", "2026-01-02"),
      "README.txt": "not content",
      "_scaffolding.mdx": post("Underscored", "2026-01-03"),
      ".hidden.mdx": post("Dotfile", "2026-01-04"),
      "nested/deep.mdx": post("Nested", "2026-01-05"),
    });
    const { getAllBlogPosts } = await blogWithDrafts(false);

    const slugs = (await getAllBlogPosts(tree)).map((entry) => entry.slug);

    expect(slugs).toEqual(["real"]);
  });

  it("returns nothing, rather than throwing, when the directory is absent", async () => {
    const tree = await contentTree({ "keep.mdx": post("Keep", "2026-01-01") });
    const { getAllBlogPosts } = await blogWithDrafts(false);

    await expect(getAllBlogPosts(path.join(tree, "nowhere"))).resolves.toEqual([]);
  });

  it("derives the slug from the filename, not from frontmatter", async () => {
    const tree = await contentTree({
      "why-agents-need-determinism.mdx": post("A title nothing derives from", "2026-01-01"),
    });
    const { getAllBlogPosts } = await blogWithDrafts(false);

    const [entry] = await getAllBlogPosts(tree);

    expect(entry.slug).toBe("why-agents-need-determinism");
  });

  it("parses frontmatter, applies defaults and strips it from the body", async () => {
    const tree = await contentTree({
      "full.mdx": post("Full", "2026-01-02", [
        'updatedAt: "2026-02-03"',
        "tags:",
        "  - agents",
        "  - llms",
      ]),
      "bare.mdx": post("Bare", "2026-01-01"),
    });
    const { getAllBlogPosts } = await blogWithDrafts(false);

    const [full, bare] = await getAllBlogPosts(tree);

    expect(full.metadata).toEqual({
      title: "Full",
      description: "About Full.",
      publishedAt: "2026-01-02",
      updatedAt: "2026-02-03",
      tags: ["agents", "llms"],
      draft: false,
    });
    expect(bare.metadata.tags).toEqual([]);
    expect(bare.metadata.draft).toBe(false);
    expect(bare.metadata.updatedAt).toBeUndefined();
    expect(bare.content.trim()).toBe("Body of Bare.");
    expect(bare.content).not.toContain("title:");
  });

  it("accepts an unquoted YAML date, which parses as a Date", async () => {
    const tree = await contentTree({
      "unquoted.mdx": ["---", "title: Unquoted", "description: D", "publishedAt: 2026-03-04", "---", "", "Body."].join("\n"),
    });
    const { getAllBlogPosts } = await blogWithDrafts(false);

    const [entry] = await getAllBlogPosts(tree);

    expect(entry.metadata.publishedAt).toBe("2026-03-04");
  });

  it("sorts reverse-chronologically, breaking ties on slug so builds are stable", async () => {
    const tree = await contentTree({
      "older.mdx": post("Older", "2026-01-01"),
      "newest.mdx": post("Newest", "2026-03-01"),
      "beta.mdx": post("Same day, later slug", "2026-02-01"),
      "alpha.mdx": post("Same day, earlier slug", "2026-02-01"),
    });
    const { getAllBlogPosts } = await blogWithDrafts(false);

    const slugs = (await getAllBlogPosts(tree)).map((entry) => entry.slug);

    expect(slugs).toEqual(["newest", "alpha", "beta", "older"]);
  });

  it("excludes drafts when showDrafts is false", async () => {
    const tree = await contentTree({
      "published.mdx": post("Published", "2026-01-01"),
      "unfinished.mdx": post("Unfinished", "2026-02-01", ["draft: true"]),
    });
    const { getAllBlogPosts } = await blogWithDrafts(false);

    const slugs = (await getAllBlogPosts(tree)).map((entry) => entry.slug);

    expect(slugs).toEqual(["published"]);
  });

  it("includes drafts when showDrafts is true", async () => {
    const tree = await contentTree({
      "published.mdx": post("Published", "2026-01-01"),
      "unfinished.mdx": post("Unfinished", "2026-02-01", ["draft: true"]),
    });
    const { getAllBlogPosts } = await blogWithDrafts(true);

    const slugs = (await getAllBlogPosts(tree)).map((entry) => entry.slug);

    expect(slugs).toEqual(["unfinished", "published"]);
  });

  // Matched by name and message rather than by class: `vi.resetModules()`
  // re-evaluates `lib/content/validate`, so the thrown error is an instance of
  // a different `ContentValidationError` than a top-level import would hold.
  it("fails on a published post with invalid frontmatter, naming the field", async () => {
    const tree = await contentTree({
      "broken.mdx": ["---", "title: No date", "description: D", "---", "", "Body."].join("\n"),
    });
    const { getAllBlogPosts } = await blogWithDrafts(false);

    await expect(getAllBlogPosts(tree)).rejects.toMatchObject({ name: "ContentValidationError" });
    await expect(getAllBlogPosts(tree)).rejects.toThrow(/broken\.mdx[\s\S]*publishedAt:/);
  });

  it("warns about an invalid draft and skips it, leaving published posts alone", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const tree = await contentTree({
      "published.mdx": post("Published", "2026-01-01"),
      "broken-draft.mdx": ["---", "title: No description", "publishedAt: 2026-02-01", "draft: true", "---", "", "Body."].join("\n"),
    });
    const { getAllBlogPosts } = await blogWithDrafts(true);

    const slugs = (await getAllBlogPosts(tree)).map((entry) => entry.slug);

    expect(slugs).toEqual(["published"]);
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain("broken-draft.mdx");
  });

  // Only a missing directory means "no posts". Any other failure — a bad
  // permission, a path that is not a directory at all — is a build that cannot
  // see the content, and a build that cannot see the content must stop rather
  // than deploy an empty blog over a full one.
  it("propagates a read failure that is not a missing directory", async () => {
    const tree = await contentTree({ "first.mdx": post("First", "2026-01-01") });
    const { getAllBlogPosts } = await blogWithDrafts(false);

    await expect(getAllBlogPosts(path.join(tree, "first.mdx"))).rejects.toMatchObject({
      code: "ENOTDIR",
    });
  });
});

describe("getBlogPostBySlug", () => {
  it("returns the post whose filename is the slug", async () => {
    const tree = await contentTree({ "wanted.mdx": post("Wanted", "2026-01-01") });
    const { getBlogPostBySlug } = await blogWithDrafts(false);

    const entry = await getBlogPostBySlug("wanted", tree);

    expect(entry?.metadata.title).toBe("Wanted");
    expect(entry?.content.trim()).toBe("Body of Wanted.");
  });

  it("returns null for a slug with no file", async () => {
    const tree = await contentTree({ "wanted.mdx": post("Wanted", "2026-01-01") });
    const { getBlogPostBySlug } = await blogWithDrafts(false);

    await expect(getBlogPostBySlug("missing", tree)).resolves.toBeNull();
  });

  // The route builds this path from a URL segment, so a slug that tries to
  // leave the content directory must not reach the filesystem.
  it("refuses a slug that is a path rather than a name", async () => {
    const tree = await contentTree({ "wanted.mdx": post("Wanted", "2026-01-01") });
    const { getBlogPostBySlug } = await blogWithDrafts(false);

    for (const slug of ["../wanted", "nested/wanted", "", ".hidden"]) {
      await expect(getBlogPostBySlug(slug, tree)).resolves.toBeNull();
    }
  });

  it("hides a draft when showDrafts is false, so its URL can 404", async () => {
    const tree = await contentTree({
      "unfinished.mdx": post("Unfinished", "2026-01-01", ["draft: true"]),
    });
    const { getBlogPostBySlug } = await blogWithDrafts(false);

    await expect(getBlogPostBySlug("unfinished", tree)).resolves.toBeNull();
  });

  it("returns a draft when showDrafts is true", async () => {
    const tree = await contentTree({
      "unfinished.mdx": post("Unfinished", "2026-01-01", ["draft: true"]),
    });
    const { getBlogPostBySlug } = await blogWithDrafts(true);

    const entry = await getBlogPostBySlug("unfinished", tree);

    expect(entry?.metadata.draft).toBe(true);
  });

  // The counterpart of the directory case above, one file down: an absent file
  // is a 404, but a file that exists and cannot be read is a broken build.
  it("propagates a read failure that is not a missing file", async () => {
    const tree = await contentTree({ "wanted.mdx": post("Wanted", "2026-01-01") });
    await mkdir(path.join(tree, "unreadable.mdx"));
    const { getBlogPostBySlug } = await blogWithDrafts(false);

    await expect(getBlogPostBySlug("unreadable", tree)).rejects.toMatchObject({ code: "EISDIR" });
  });
});

/**
 * The sample content itself (spec §37): two published posts and one draft.
 * Asserted loosely, on the properties that must hold however many posts the
 * author later adds.
 */
describe("content/blog", () => {
  it("hides the sample draft in production and keeps the published posts ordered", async () => {
    const { getAllBlogPosts } = await blogWithDrafts(false);

    const posts = await getAllBlogPosts();
    const dates = posts.map((entry) => entry.metadata.publishedAt);

    expect(posts.length).toBeGreaterThanOrEqual(2);
    expect(posts.every((entry) => !entry.metadata.draft)).toBe(true);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("ships a draft that is visible only when drafts are shown", async () => {
    const hidden = await blogWithDrafts(false);
    const shown = await blogWithDrafts(true);

    const published = await hidden.getAllBlogPosts();
    const all = await shown.getAllBlogPosts();

    expect(all.length).toBe(published.length + 1);
    expect(all.filter((entry) => entry.metadata.draft)).toHaveLength(1);
  });

  it("opens every sample file with a placeholder, so no prose reads as the author's", async () => {
    const { getAllBlogPosts } = await blogWithDrafts(true);

    for (const entry of await getAllBlogPosts()) {
      // The placeholder is the `Callout` of the prose registry (spec §15, §3.1),
      // opening the file so it cannot be scrolled past.
      expect(entry.content.trimStart()).toMatch(
        /^<Callout variant="warning" title="Placeholder content">/,
      );
    }
  });
});
