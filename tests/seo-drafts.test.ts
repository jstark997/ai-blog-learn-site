// @vitest-environment node
import { beforeAll, describe, expect, it, vi } from "vitest";

import { blogEntries, lessonEntries, type ContentEntry } from "./content-oracle";

/**
 * The case `tests/draft-audit.test.ts` and `scripts/verify.mjs` cannot reach:
 * a preview deployment, where drafts are *deliberately* visible (spec §16,
 * §33) — and where the sitemap and the feed must still carry none.
 *
 * Both of those run with `SHOW_DRAFTS=false`, so every draft is already gone
 * before the sitemap or the feed is built and the filters in them are never
 * exercised. This file runs with `SHOW_DRAFTS=true`: the draft posts and
 * lessons are visible at their own URLs, the indexes list them, and the two
 * crawler-facing artefacts must go on excluding them regardless. A sitemap is
 * an instruction to a search engine, not a listing of what the environment
 * happens to show.
 */

vi.stubEnv("SHOW_DRAFTS", "true");
vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.test");

const SITE_URL = "https://example.test";

let drafts: ContentEntry[] = [];
let published: ContentEntry[] = [];

beforeAll(async () => {
  const entries = [...(await blogEntries()), ...(await lessonEntries())];
  drafts = entries.filter((entry) => entry.draft);
  published = entries.filter((entry) => !entry.draft);
});

describe("with drafts visible", () => {
  it("has drafts to catch, and the content utilities are showing them", async () => {
    const { getAllBlogPosts } = await import("@/lib/content/blog");

    expect(drafts.length).toBeGreaterThan(0);
    expect((await getAllBlogPosts()).some((post) => post.metadata.draft)).toBe(true);
  });

  it("keeps every draft out of the sitemap, and keeps the published pages in", async () => {
    const { default: sitemap } = await import("@/app/sitemap");
    const urls = (await sitemap()).map((entry) => entry.url);

    for (const draft of drafts) {
      expect(urls, draft.url).not.toContain(`${SITE_URL}${draft.url}`);
    }
    for (const entry of published) {
      expect(urls, entry.url).toContain(`${SITE_URL}${entry.url}`);
    }
  });

  it("keeps every draft out of the feed", async () => {
    const { GET } = await import("@/app/rss.xml/route");
    const body = await (await GET()).text();

    for (const draft of drafts) {
      expect(body, draft.url).not.toContain(draft.url);
    }
    for (const post of published.filter((entry) => entry.url.startsWith("/blog/"))) {
      expect(body, post.url).toContain(post.url);
    }
  });

  it("marks a visible draft noindex, so a preview URL cannot be indexed", async () => {
    const { generateMetadata } = await import("@/app/blog/[slug]/page");

    for (const draft of drafts.filter((entry) => entry.url.startsWith("/blog/"))) {
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: draft.url.slice("/blog/".length) }),
        searchParams: Promise.resolve({}),
      });

      expect(metadata.robots).toEqual({ index: false, follow: false });
    }
  });
});
