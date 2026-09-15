import type { MetadataRoute } from "next";

import { SITEMAP_PATH } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

/**
 * `robots.txt` (spec §25), generated so the sitemap it names is built from the
 * same `NEXT_PUBLIC_SITE_URL` as everything else — a `robots.txt` committed as
 * static text is a second place the domain is written down, and the one nobody
 * updates.
 *
 * Everything public is crawlable. Nothing on this site is private, and the
 * pages that must not be indexed — drafts, on a preview deployment — say so
 * themselves with `noindex`, which is the directive that actually keeps a page
 * out of an index. `Disallow` would only stop the crawl, leaving a URL
 * someone linked to indexable on the strength of the link alone (spec §16).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: absoluteUrl(SITEMAP_PATH),
  };
}
