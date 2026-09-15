/**
 * The RSS 2.0 feed of published blog posts (spec §25).
 *
 * A feed is what readers of a technical blog expect, and it is the one output
 * of this site that is read by machines rather than people — so it is built as
 * a string here, with escaping, rather than with JSX. No JSX, no rendering and
 * no filesystem access: `app/rss.xml/route.ts` hands this function the posts
 * `getAllBlogPosts` returned and serves what comes back.
 *
 * Two things are deliberate. Drafts are dropped *here*, not by the caller, so
 * the rule travels with the feed rather than with whoever remembers to apply
 * it — and unlike an index page, a feed is a crawler-facing artefact that
 * should carry no unfinished work even on a preview deployment, where
 * `showDrafts` is true (spec §16). And nothing in the output depends on the
 * moment of the build: `lastBuildDate` is the newest post's date, so two builds
 * of the same content produce the same bytes.
 */
import type { BlogPost } from "./content/blog";
import { FEED_PATH } from "./seo";
import { absoluteUrl, site } from "./site";

/** The five characters XML reserves. Titles contain the first four regularly. */
const XML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

/**
 * Escapes text for an XML element or attribute.
 *
 * Every author-supplied string in the feed goes through this. A single
 * ampersand in a post title is enough to make the document malformed, and a
 * malformed feed is not partially readable — a reader rejects the whole file.
 */
function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => XML_ESCAPES[character] ?? character);
}

/**
 * `YYYY-MM-DD` as the RFC 822 date RSS requires.
 *
 * Content dates are calendar days with no time and no time zone, so they are
 * read as UTC midnight — the same convention `lib/utils/date.ts` formats them
 * under, and for the same reason: a zone behind UTC would otherwise publish
 * every post a day early.
 */
function rfc822(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toUTCString();
}

function item(post: BlogPost): string {
  const url = absoluteUrl(`/blog/${post.slug}`);

  return [
    "    <item>",
    `      <title>${escapeXml(post.metadata.title)}</title>`,
    `      <link>${escapeXml(url)}</link>`,
    // The URL is the identity: these pages are static and never change address,
    // which is exactly the case `isPermaLink="true"` describes.
    `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
    `      <pubDate>${rfc822(post.metadata.publishedAt)}</pubDate>`,
    `      <description>${escapeXml(post.metadata.description)}</description>`,
    ...post.metadata.tags.map((tag) => `      <category>${escapeXml(tag)}</category>`),
    "    </item>",
  ].join("\n");
}

/**
 * The feed document, as XML.
 *
 * `posts` arrives in the order `getAllBlogPosts` established — newest first
 * (spec §9.1) — and that order is preserved rather than recomputed, so the
 * feed and the blog index cannot disagree about which post is the latest.
 *
 * The body is the post's description, not its prose: an MDX body would have to
 * be compiled, and compiling every post to build a feed is the kind of cost
 * this site does not pay. A summary feed is a legitimate feed; readers follow
 * the link.
 */
export function buildRssFeed(posts: readonly BlogPost[]): string {
  const published = posts.filter((post) => !post.metadata.draft);
  const newest = published[0]?.metadata.publishedAt;

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(site.name)}</title>`,
    `    <link>${escapeXml(absoluteUrl("/blog"))}</link>`,
    `    <description>${escapeXml(site.blogDescription)}</description>`,
    "    <language>en</language>",
    // `atom:link rel="self"` is what tells a reader where the feed it is
    // holding actually lives; feed validators require it.
    `    <atom:link href="${escapeXml(absoluteUrl(FEED_PATH))}" rel="self" type="application/rss+xml" />`,
    ...(newest === undefined ? [] : [`    <lastBuildDate>${rfc822(newest)}</lastBuildDate>`]),
    ...published.map(item),
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}
