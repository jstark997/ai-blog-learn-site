/**
 * Site-wide copy and identity, in one place: the specification asks for the
 * site's own words to be configurable rather than embedded throughout the
 * application (spec §8.1), and for one canonical URL behind every absolute
 * link the site emits about itself (spec §25).
 *
 * Everything the homepage says about itself lives under `home`. Which posts
 * and lessons it shows is a different question and lives in
 * `lib/content/homepage.ts` — copy here, content selection there.
 *
 * PLACEHOLDER — the name and the copy below are scaffolding written by a
 * coding agent, not editorial copy (spec §3.1). The author replaces them
 * before the site is pointed at a public domain.
 */
export const site = {
  name: "AI Blog & Learn",
  description: "Exploring how artificial intelligence works and what it means.",
  blogDescription: "Ideas, observations and commentary on artificial intelligence.",
  learnDescription: "Structured explanations with interactive demonstrations.",
  author: "Jeff Stark",

  home: {
    /** The hero's positioning statement, beneath the short description. */
    positioning:
      "Two ways in: essays on what these systems mean, and lessons that take the mechanics apart piece by piece.",
    blogCta: "Read the blog",
    learnCta: "Start learning",

    recent: {
      heading: "Recent writing",
      linkLabel: "All posts",
    },

    featured: {
      heading: "Start here",
      description: "A few lessons worth reading first.",
      linkLabel: "All topics",
    },

    /** The Blog/Learn distinction, spelled out for a first-time visitor (spec §8.4). */
    introduction: {
      heading: "Two kinds of writing",
      blog: "The blog is for ideas, observations and commentary — what a result means, why an approach works, where the field seems to be going.",
      learn: "Learn is for explanation: lessons in reading order, with interactive demonstrations you can work through rather than only read about.",
    },
  },
} as const;

/**
 * The fallback, so `pnpm dev`, `pnpm build` and the test suite all work with no
 * environment set at all. A production deployment sets the variable; one that
 * forgets emits canonical URLs pointing at localhost, which is the failure this
 * default trades for the convenience of a working local build.
 */
const DEVELOPMENT_SITE_URL = "http://localhost:3000";

/**
 * `process.env.NEXT_PUBLIC_SITE_URL` is read as a whole member expression:
 * Next replaces that text at build time, and destructuring it out of
 * `process.env` would defeat the substitution.
 *
 * A malformed value throws rather than being patched up. Metadata built on a
 * broken base is wrong on every page and silent about it; a build that stops
 * with the offending value quoted is the cheaper failure.
 */
function readSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured === undefined || configured === "") return DEVELOPMENT_SITE_URL;

  let parsed: URL;
  try {
    parsed = new URL(configured);
  } catch {
    throw new Error(
      `NEXT_PUBLIC_SITE_URL must be an absolute URL, e.g. https://example.com — received "${configured}"`,
    );
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`NEXT_PUBLIC_SITE_URL must be http or https — received "${configured}"`);
  }

  // A trailing slash here would double up in every URL built below.
  return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`;
}

/**
 * Where the site lives, with no trailing slash: `https://example.com`.
 *
 * Page metadata, the sitemap and the feed all resolve their absolute URLs from
 * this one value (spec §25), so moving the site to a new domain is one
 * environment variable rather than a search across three subsystems.
 */
export const siteUrl: string = readSiteUrl();

/**
 * A route path as an absolute URL — what a sitemap entry, a feed link and an
 * `og:url` each need. `"/"` resolves to the bare origin rather than to a
 * trailing slash, which is how Next's own `metadataBase` resolves it, so a
 * canonical link and a sitemap entry for the homepage agree.
 */
export function absoluteUrl(path: string): string {
  if (!path.startsWith("/")) {
    throw new Error(`absoluteUrl expects a route path beginning with "/" — received "${path}"`);
  }

  return path === "/" ? siteUrl : `${siteUrl}${path}`;
}
