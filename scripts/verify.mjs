#!/usr/bin/env node
// Builds the application, serves it on a free port, asserts that the routes
// below respond as expected, and shuts the server down cleanly.
//
// The assertions are derived from `content/`, not hard-coded: every published
// post and lesson must return 200 and every draft must return 404, so adding
// either extends the check automatically (application spec §54.1). Later phases
// add the sitemap and the RSS feed.
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
const LEARN_ROOT = path.join(REPOSITORY_ROOT, "content", "learn");

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

/** Scaffolding and editor droppings are not content, in either tree. */
function isContentFile(name) {
  return name.endsWith(".mdx") && !name.startsWith("_") && !name.startsWith(".");
}

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
  const files = entries.filter((entry) => entry.isFile() && isContentFile(entry.name));

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

/** The route a lesson answers on, spelt out by its place in the tree. */
function lessonUrl({ topicId, lessonId }) {
  return `/learn/${topicId}/${lessonId}`;
}

/**
 * Every lesson in `content/learn/`, as `{ topicId, lessonId, draft }`.
 *
 * The tree is the data model: the directory is the topic and the filename is
 * the lesson (spec §11.1), so the route each entry must answer on is spelt out
 * by the path and nothing here consults frontmatter for it. Read directly, for
 * the same reason the posts are.
 *
 * @returns {Promise<{ topicId: string; lessonId: string; draft: boolean }[]>}
 */
async function lessons() {
  const topics = await readdir(LEARN_ROOT, { withFileTypes: true });
  const directories = topics.filter(
    (entry) => entry.isDirectory() && !entry.name.startsWith("_") && !entry.name.startsWith("."),
  );

  const byTopic = await Promise.all(
    directories.map(async (topic) => {
      const entries = await readdir(path.join(LEARN_ROOT, topic.name), { withFileTypes: true });
      const files = entries.filter((entry) => entry.isFile() && isContentFile(entry.name));

      return Promise.all(
        files.map(async (entry) => {
          const source = await readFile(path.join(LEARN_ROOT, topic.name, entry.name), "utf8");
          return {
            topicId: topic.name,
            lessonId: entry.name.slice(0, -".mdx".length),
            draft: matter(source).data.draft === true,
          };
        }),
      );
    }),
  );

  return byTopic.flat();
}

/** @returns {Promise<Assertion[]>} */
async function assertions() {
  const posts = await blogPosts();
  const publishedPosts = posts.filter((post) => !post.draft);
  const draftPosts = posts.filter((post) => post.draft);

  if (publishedPosts.length === 0) {
    throw new Error("No published blog posts found; there is nothing to verify");
  }
  if (draftPosts.length === 0) {
    throw new Error("No draft blog post found; draft gating would go unverified");
  }

  const allLessons = await lessons();
  const publishedLessons = allLessons.filter((lesson) => !lesson.draft);
  const draftLessons = allLessons.filter((lesson) => lesson.draft);

  if (publishedLessons.length === 0) {
    throw new Error("No published lessons found; there is nothing to verify");
  }
  if (draftLessons.length === 0) {
    throw new Error("No draft lesson found; draft gating would go unverified");
  }

  // Every draft lesson URL, in the form a link to it would take: no index and
  // no topic page may mention one in production (spec §16).
  const hiddenLessonUrls = draftLessons.map((lesson) => lessonUrl(lesson));

  // A topic page exists exactly where a published lesson does; a topic whose
  // every lesson is a draft is not generated at all.
  const publishedTopics = [...new Set(publishedLessons.map((lesson) => lesson.topicId))];
  const emptyTopics = [...new Set(allLessons.map((lesson) => lesson.topicId))].filter(
    (topicId) => !publishedTopics.includes(topicId),
  );

  return [
    { path: "/", status: 200, description: "homepage" },
    {
      path: "/blog",
      status: 200,
      description: "blog index, with no draft on it",
      // A draft that reached the index would show up as its own URL.
      bodyExcludes: draftPosts.map((post) => `/blog/${post.slug}`),
    },
    { path: "/about", status: 200, description: "about page" },
    ...publishedPosts.map((post) => ({
      path: `/blog/${post.slug}`,
      status: 200,
      description: "published post",
    })),
    ...draftPosts.map((post) => ({
      path: `/blog/${post.slug}`,
      status: 404,
      description: "draft post, hidden in production",
    })),
    { path: "/blog/no-such-post-exists", status: 404, description: "unknown post" },
    {
      path: "/learn",
      status: 200,
      description: "learn index, with no draft lesson on it",
      bodyExcludes: hiddenLessonUrls,
    },
    ...publishedTopics.map((topicId) => ({
      path: `/learn/${topicId}`,
      status: 200,
      description: "topic overview, with no draft lesson on it",
      bodyExcludes: hiddenLessonUrls,
    })),
    ...emptyTopics.map((topicId) => ({
      path: `/learn/${topicId}`,
      status: 404,
      description: "topic with nothing published in it",
    })),
    ...publishedLessons.map((lesson) => ({
      path: lessonUrl(lesson),
      status: 200,
      description: "published lesson",
    })),
    ...draftLessons.map((lesson) => ({
      path: lessonUrl(lesson),
      status: 404,
      description: "draft lesson, hidden in production",
    })),
    { path: "/learn/no-such-topic", status: 404, description: "unknown topic" },
    {
      path: `/learn/${publishedTopics[0]}/no-such-lesson`,
      status: 404,
      description: "unknown lesson in a real topic",
    },
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
