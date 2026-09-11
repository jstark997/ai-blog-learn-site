// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `showDrafts` is a module-level constant, so each case re-imports the module
 * with a different environment. The leaked-draft failure mode is the one this
 * project can least afford, so the table is spelled out (spec §16).
 */
async function showDraftsIn(env: Record<string, string | undefined>): Promise<boolean> {
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  vi.resetModules();
  return (await import("@/lib/content/env")).showDrafts;
}

beforeEach(() => {
  vi.stubEnv("SHOW_DRAFTS", undefined);
  vi.stubEnv("VERCEL_ENV", undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("showDrafts", () => {
  it("shows drafts in development", async () => {
    await expect(showDraftsIn({ NODE_ENV: "development" })).resolves.toBe(true);
  });

  it("hides drafts in a production deployment", async () => {
    await expect(showDraftsIn({ NODE_ENV: "production", VERCEL_ENV: "production" })).resolves.toBe(false);
  });

  // A preview deployment is a *production* Next.js build, which is why the
  // rule cannot key on NODE_ENV alone: a preview URL is where a draft most
  // needs reviewing (spec §33).
  it("shows drafts on a preview deployment", async () => {
    await expect(showDraftsIn({ NODE_ENV: "production", VERCEL_ENV: "preview" })).resolves.toBe(true);
  });

  it("hides drafts in a local production build, where no VERCEL_ENV is set", async () => {
    await expect(showDraftsIn({ NODE_ENV: "production" })).resolves.toBe(false);
  });

  it("lets SHOW_DRAFTS force drafts on, for a host that is not Vercel", async () => {
    await expect(
      showDraftsIn({ NODE_ENV: "production", VERCEL_ENV: "production", SHOW_DRAFTS: "true" }),
    ).resolves.toBe(true);
  });

  it("lets SHOW_DRAFTS force drafts off, to rehearse production locally", async () => {
    await expect(showDraftsIn({ NODE_ENV: "development", SHOW_DRAFTS: "false" })).resolves.toBe(false);
  });
});
