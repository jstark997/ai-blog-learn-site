#!/usr/bin/env node
// Builds the application, serves it on a free port, asserts that the routes
// below respond as expected, and shuts the server down cleanly.
//
// The blog assertions are derived from `content/blog/`, not hard-coded: every
// published post must return 200 and every draft must return 404, so adding a
// post extends the check automatically (application spec §54.1). Later phases
// add the learn routes, the sitemap and the RSS feed.
//
// The server runs with SHOW_DRAFTS=false, so `pnpm verify` always measures
// *production* draft behaviour whatever the ambient environment says (spec §16).
//
// Never run `next start` in the foreground from an agent session; use this.

import { spawn } from "node:child_process";
import { once } from "node:events";
import { readdir, readFile } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import matter from "gray-matter";

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BLOG_ROOT = path.join(REPOSITORY_ROOT, "content", "blog");

/** The environment the build and the server run in: production behaviour. */
const SERVER_ENV = { ...process.env, SHOW_DRAFTS: "false" };

const SKIP_BUILD = process.env.VERIFY_SKIP_BUILD === "true";
const STARTUP_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 250;

/**
 * @typedef {object} Assertion
 * @property {string} path
 * @property {number} status
 * @property {string} description
 * @property {string[]} [bodyExcludes] substrings the response must not contain
 */

/**
 * Every post in `content/blog/`, as `{ slug, draft }`.
 *
 * The frontmatter is read here rather than through `lib/content/blog.ts` for
 * two reasons. This script is the independent oracle: it should assert what the
 * *content* says, not what the code under test believes about it — importing
 * `showDrafts` to decide which slugs must 404 would let one bug hide another.
 * And Node's type stripping cannot resolve that module's extensionless relative
 * imports, so a plain `.mjs` script cannot load it anyway.
 *
 * Slug derivation and the `_`/`.` scaffolding prefixes mirror the content
 * utilities (spec §9.2, §18). Validity is already settled: `prebuild` runs
 * `validate:content` before the build this script performs.
 *
 * @returns {Promise<{ slug: string; draft: boolean }[]>}
 */
async function blogPosts() {
  const entries = await readdir(BLOG_ROOT, { withFileTypes: true });
  const files = entries.filter(
    (entry) =>
      entry.isFile() &&
      entry.name.endsWith(".mdx") &&
      !entry.name.startsWith("_") &&
      !entry.name.startsWith("."),
  );

  return Promise.all(
    files.map(async (entry) => {
      const source = await readFile(path.join(BLOG_ROOT, entry.name), "utf8");
      return {
        slug: entry.name.slice(0, -".mdx".length),
        draft: matter(source).data.draft === true,
      };
    }),
  );
}

/** @returns {Promise<Assertion[]>} */
async function assertions() {
  const posts = await blogPosts();
  const published = posts.filter((post) => !post.draft);
  const drafts = posts.filter((post) => post.draft);

  if (published.length === 0) {
    throw new Error("No published blog posts found; there is nothing to verify");
  }
  if (drafts.length === 0) {
    throw new Error("No draft blog post found; draft gating would go unverified");
  }

  return [
    { path: "/", status: 200, description: "homepage" },
    {
      path: "/blog",
      status: 200,
      description: "blog index, with no draft on it",
      // A draft that reached the index would show up as its own URL.
      bodyExcludes: drafts.map((post) => `/blog/${post.slug}`),
    },
    { path: "/learn", status: 200, description: "learn index" },
    { path: "/about", status: 200, description: "about page" },
    ...published.map((post) => ({
      path: `/blog/${post.slug}`,
      status: 200,
      description: "published post",
    })),
    ...drafts.map((post) => ({
      path: `/blog/${post.slug}`,
      status: 404,
      description: "draft post, hidden in production",
    })),
    { path: "/blog/no-such-post-exists", status: 404, description: "unknown post" },
    { path: "/no-such-page", status: 404, description: "custom 404" },
  ];
}

async function findFreePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Could not determine a free port");
  }
  const { port } = address;
  server.close();
  await once(server, "close");
  return port;
}

function run(command, args, options = {}) {
  const child = spawn(command, args, { stdio: "inherit", ...options });
  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });
}

async function waitForServer(baseUrl, child) {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Server exited early with code ${child.exitCode}`);
    }
    try {
      await fetch(baseUrl, { signal: AbortSignal.timeout(2_000) });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }
  throw new Error(`Server did not start within ${STARTUP_TIMEOUT_MS}ms`);
}

async function stopServer(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  const timer = setTimeout(() => child.kill("SIGKILL"), 5_000);
  await once(child, "exit").catch(() => {});
  clearTimeout(timer);
}

async function main() {
  const checks = await assertions();

  if (SKIP_BUILD) {
    console.log("verify: VERIFY_SKIP_BUILD=true, reusing the existing build\n");
  } else {
    console.log("verify: building with SHOW_DRAFTS=false\n");
    await run("node_modules/.bin/next", ["build"], { env: SERVER_ENV });
  }

  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`\nverify: starting the production server on ${baseUrl}\n`);

  const server = spawn("node_modules/.bin/next", ["start", "--port", String(port)], {
    stdio: "inherit",
    env: { ...SERVER_ENV, PORT: String(port) },
  });

  /** @type {string[]} */
  const failures = [];
  try {
    await waitForServer(baseUrl, server);

    for (const { path, status, description, bodyExcludes = [] } of checks) {
      const response = await fetch(`${baseUrl}${path}`, {
        redirect: "manual",
        signal: AbortSignal.timeout(15_000),
      });
      const body = bodyExcludes.length > 0 ? await response.text() : "";
      const leaked = bodyExcludes.filter((excluded) => body.includes(excluded));

      const ok = response.status === status && leaked.length === 0;
      console.log(
        `${ok ? "PASS" : "FAIL"}  ${path}  ${response.status} (expected ${status})  ${description}`,
      );
      if (response.status !== status) {
        failures.push(`${path}: expected ${status}, received ${response.status}`);
      }
      for (const excluded of leaked) {
        failures.push(`${path}: body must not mention ${excluded}`);
      }
    }
  } finally {
    await stopServer(server);
  }

  if (failures.length > 0) {
    console.error(`\nverify: ${failures.length} assertion(s) failed`);
    for (const failure of failures) console.error(`  ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log(`\nverify: ${checks.length} assertion(s) passed`);
}

main().catch((error) => {
  console.error(`\nverify: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
