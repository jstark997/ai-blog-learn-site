// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * `NEXT_PUBLIC_SITE_URL` — the one value behind every absolute URL the site
 * emits about itself (spec §25).
 *
 * `siteUrl` is resolved once, at module scope, so each case here resets the
 * module registry and imports `lib/site.ts` afresh under a different
 * environment. That is why these cases live in a file of their own: the churn
 * stays where it can do no harm.
 */

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

/** `lib/site.ts`, loaded with the environment as it stands right now. */
async function loadSite(value?: string) {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", value);
  vi.resetModules();
  return import("@/lib/site");
}

describe("siteUrl", () => {
  it("falls back to the development server when nothing is configured", async () => {
    const { siteUrl } = await loadSite(undefined);

    expect(siteUrl).toBe("http://localhost:3000");
  });

  it("uses the configured origin", async () => {
    const { siteUrl } = await loadSite("https://example.com");

    expect(siteUrl).toBe("https://example.com");
  });

  it("strips a trailing slash, which would otherwise double up in every URL", async () => {
    const { siteUrl } = await loadSite("https://example.com/");

    expect(siteUrl).toBe("https://example.com");
  });

  it("keeps a base path, for a site served under a subdirectory", async () => {
    const { siteUrl, absoluteUrl } = await loadSite("https://example.com/writing/");

    expect(siteUrl).toBe("https://example.com/writing");
    expect(absoluteUrl("/blog")).toBe("https://example.com/writing/blog");
  });

  it("treats an empty value as unset rather than as an empty origin", async () => {
    const { siteUrl } = await loadSite("   ");

    expect(siteUrl).toBe("http://localhost:3000");
  });

  it("refuses a value that is not an absolute URL, rather than building on it", async () => {
    await expect(loadSite("example.com")).rejects.toThrow(/absolute URL/);
  });

  it("refuses a scheme a browser would not follow", async () => {
    await expect(loadSite("ftp://example.com")).rejects.toThrow(/http or https/);
  });
});

describe("absoluteUrl", () => {
  it("resolves the homepage to the bare origin, as metadataBase does", async () => {
    const { absoluteUrl } = await loadSite("https://example.com");

    expect(absoluteUrl("/")).toBe("https://example.com");
  });

  it("joins a route path without doubling the slash", async () => {
    const { absoluteUrl } = await loadSite("https://example.com");

    expect(absoluteUrl("/learn/transformers/attention")).toBe(
      "https://example.com/learn/transformers/attention",
    );
  });

  it("rejects anything that is not a route path, so a bad URL cannot be published", async () => {
    const { absoluteUrl } = await loadSite("https://example.com");

    expect(() => absoluteUrl("blog")).toThrow(/route path/);
  });
});
