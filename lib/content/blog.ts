/**
 * Blog retrieval — discovery, parsing, validation, slug derivation, ordering
 * and draft filtering, with no UI in sight (spec §17).
 *
 * Every consumer of blog content goes through here: the index, an article
 * page, the home page's latest three, the sitemap and the feed. That is the
 * point. Draft filtering in particular lives in exactly one place, so a new
 * consumer inherits correct behaviour instead of improvising its own filter
 * and leaking an unfinished post (spec §16).
 *
 * Files are read from the filesystem at build time. There is no API route, no
 * database and no cache: a handful of `.mdx` files re-read a few times during a
 * static build costs less than the machinery to avoid it.
 *
 * `content` is returned as the raw MDX body, not as rendered React. Rendering
 * is `renderMdx`'s job and belongs to the route; keeping this module free of
 * JSX is what lets the sitemap, the feed and the tests use it without
 * compiling a single article.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";

import { showDrafts } from "./env";
import {
  MDX_EXTENSION,
  displayPath,
  idFromFilename,
  isContentFile,
  isReadableSegment,
} from "./paths";
import { blogPostSchema, type BlogPostMetadata } from "./schemas";
import { parseFrontmatter } from "./validate";

/** Posts are flat `.mdx` files; the filename is the slug (spec §9.2, §26). */
const BLOG_ROOT = path.join(process.cwd(), "content", "blog");

export type BlogPost = {
  /** Derived from the filename. There is no `slug` field in frontmatter. */
  slug: string;
  metadata: BlogPostMetadata;
  /** The MDX body, frontmatter stripped. Hand it to `renderMdx` to display. */
  content: string;
};

/**
 * Reads and validates one file. Returns `null` when the file is absent, or
 * when it is a draft whose frontmatter does not validate — `parseFrontmatter`
 * warns about that one and throws for invalid published content (spec §18).
 */
async function readPost(root: string, slug: string): Promise<BlogPost | null> {
  const file = path.join(root, `${slug}${MDX_EXTENSION}`);

  let source: string;
  try {
    source = await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }

  const { data, content } = matter(source);
  const metadata = parseFrontmatter(blogPostSchema, data, displayPath(file));
  if (metadata === null) return null;

  return { slug, metadata, content };
}

/**
 * Newest first (spec §9.1). ISO dates sort correctly as strings, which is half
 * of why `publishedAt` is normalised to `YYYY-MM-DD` by the schema. Two posts
 * published on the same day fall back to the slug, so a static build orders
 * them the same way every time rather than however the filesystem felt.
 */
function byNewestFirst(a: BlogPost, b: BlogPost): number {
  return (
    b.metadata.publishedAt.localeCompare(a.metadata.publishedAt) || a.slug.localeCompare(b.slug)
  );
}

/**
 * Every published post, newest first. Drafts are included only where
 * `showDrafts` says they may be seen — in development and on preview
 * deployments, never in production.
 *
 * `root` exists so a test can hand this function a content tree of its own,
 * the way `scripts/validate-content.mjs` already accepts one. Application code
 * calls `getAllBlogPosts()`.
 */
export async function getAllBlogPosts(root: string = BLOG_ROOT): Promise<BlogPost[]> {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }

  const slugs = entries
    .filter((entry) => entry.isFile() && isContentFile(entry.name))
    .map((entry) => idFromFilename(entry.name));

  const posts = await Promise.all(slugs.map((slug) => readPost(root, slug)));

  return posts
    .filter((post): post is BlogPost => post !== null && (showDrafts || !post.metadata.draft))
    .toSorted(byNewestFirst);
}

/**
 * One post by slug, or `null` when there is no such post — and `null` for a
 * draft whenever drafts are hidden, so the route can call `notFound()` and a
 * draft URL 404s in production (spec §16).
 */
export async function getBlogPostBySlug(
  slug: string,
  root: string = BLOG_ROOT,
): Promise<BlogPost | null> {
  if (!isReadableSegment(slug)) return null;

  const post = await readPost(root, slug);
  if (post === null) return null;

  return showDrafts || !post.metadata.draft ? post : null;
}
