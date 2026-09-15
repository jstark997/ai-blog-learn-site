/**
 * Page metadata, assembled in one place (spec §25).
 *
 * Seven route types need the same four things — a unique title, a description
 * taken from content rather than invented, a canonical URL, and Open Graph
 * tags that agree with all three. Writing that out seven times is how a
 * canonical link goes missing from one route and nobody notices for a year, so
 * every route calls `pageMetadata` and the shape is checkable once, in
 * `tests/seo.test.ts`.
 *
 * Paths are passed relative — `/blog/why-machines-learn`, not the absolute
 * URL. Next resolves them against the `metadataBase` set in the root layout,
 * which is `siteUrl`, so the canonical link, `og:url`, the sitemap and the feed
 * cannot drift apart. `lib/site.ts` holds that value; nothing here reads the
 * environment.
 *
 * No JSX and no rendering: this module produces plain `Metadata` objects, and
 * the sitemap and the feed import the same constants from it.
 */
import type { Metadata } from "next";

import { site } from "./site";

/** The RSS feed's route, referenced by the feed itself and by every `<head>`. */
export const FEED_PATH = "/rss.xml";

/** Where Next serves `app/sitemap.ts`; `robots.txt` has to name it in full. */
export const SITEMAP_PATH = "/sitemap.xml";

/**
 * The dates an article carries. Both are already normalised to `YYYY-MM-DD` by
 * the `isoDate` preprocessor, which is what Open Graph's `article:published_time`
 * wants (spec §10, §12).
 */
export type ArticleDates = {
  publishedAt: string;
  updatedAt?: string;
  tags?: readonly string[];
};

export type PageMetadataInput = {
  /** The route path this page answers on, leading slash, no origin. */
  path: string;
  /**
   * Omitted only by the homepage, which wants the root layout's `title.default`
   * rather than the `%s · site` template applied to the site's own name.
   */
  title?: string;
  description: string;
  /** Present on a post or a lesson; absent on an index or a standalone page. */
  article?: ArticleDates;
  /**
   * A draft is reachable on a preview deployment (spec §16, §33), and a preview
   * URL is crawlable the moment anything links to it. `noindex` is the defence;
   * keeping drafts out of the sitemap and the feed is the other half.
   */
  draft?: boolean;
};

/**
 * Open Graph for one page. Split on `article` rather than spread conditionally
 * because `type` discriminates the union: a `type` computed at runtime would
 * not narrow, and the article-only fields would not type-check.
 */
function openGraphFor({
  path,
  title,
  description,
  article,
}: PageMetadataInput): Metadata["openGraph"] {
  const shared = {
    siteName: site.name,
    url: path,
    // Open Graph has no title template, so the page's own title is spelt out.
    title: title ?? site.name,
    description,
  };

  if (article === undefined) return { ...shared, type: "website" };

  return {
    ...shared,
    type: "article",
    authors: [site.author],
    publishedTime: article.publishedAt,
    // Only where the frontmatter carries one; an article that has never been
    // revised should not claim a modification date (spec §25).
    modifiedTime: article.updatedAt,
    tags: article.tags === undefined ? undefined : [...article.tags],
  };
}

/** One page's metadata: title, description, canonical URL and Open Graph. */
export function pageMetadata(input: PageMetadataInput): Metadata {
  const { path, title, description, draft = false } = input;

  return {
    // Spread rather than `title: undefined`: an explicit key would replace the
    // root layout's `title.default` with nothing on the homepage.
    ...(title === undefined ? {} : { title }),
    description,
    alternates: {
      canonical: path,
      // Every page advertises the feed, so a reader's browser or reader
      // extension finds it from wherever they happen to have landed.
      types: { "application/rss+xml": FEED_PATH },
    },
    ...(draft ? { robots: { index: false, follow: false } } : {}),
    openGraph: openGraphFor(input),
  };
}
