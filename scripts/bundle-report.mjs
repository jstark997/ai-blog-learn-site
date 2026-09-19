#!/usr/bin/env node
// Reports what each prerendered route actually asks a browser to download:
// the client JavaScript and the stylesheets named in its HTML, raw and gzipped.
//
// This reads the output of the last `pnpm build` — it never builds. Run
// `pnpm build` first; the script says so if `.next` is missing or stale.
//
// Why parse the HTML rather than the build manifests: the manifests describe
// routes, and the number that matters is per *page*. `/learn/[topic]/[lesson]`
// is one route whose pages differ — a lesson embedding a demo fetches that
// demo's chunk and a lesson without one does not — and the prerendered HTML is
// where that difference is visible. It is also exactly what the browser sees.
//
// The `nomodule` polyfill chunk is excluded from the headline figure and
// reported separately: no browser that can run this site downloads it.
//
// The baseline these numbers were first recorded at is in `docs/decisions.md`
// (phase 19). Re-run this after any change to a client component, to
// `next/dynamic` usage, or to a dependency that reaches the browser.

import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUILD_ROOT = path.join(REPOSITORY_ROOT, ".next");
const PRERENDER_ROOT = path.join(BUILD_ROOT, "server", "app");

/** Assets Next serves from `/_next/…`, which is `.next/…` on disk. */
const ASSET_PREFIX = "/_next/";

/**
 * Routes that exist for the framework rather than for a reader. They are
 * measured like any other page but listed apart, so the table reads as the
 * site's own pages.
 */
const INTERNAL_PAGES = new Set(["/_global-error", "/_not-found"]);

/**
 * @typedef {object} Asset
 * @property {string} url The `/_next/…` URL as the HTML writes it.
 * @property {number} bytes Raw size on disk.
 * @property {number} gzipped Size gzipped at level 9 — roughly what is sent.
 */

/**
 * @typedef {object} PageReport
 * @property {string} pathname The URL a reader visits.
 * @property {Asset[]} scripts Module scripts, i.e. what a modern browser runs.
 * @property {Asset[]} legacyScripts `nomodule` scripts, which it skips.
 * @property {Asset[]} stylesheets
 * @property {Asset[]} fonts Preloaded font files, which are neither.
 */

/** Recursively lists the prerendered HTML files of a build. */
async function prerenderedPages(directory = PRERENDER_ROOT) {
  /** @type {string[]} */
  const files = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await prerenderedPages(entryPath)));
    } else if (entry.name.endsWith(".html")) {
      files.push(entryPath);
    }
  }

  return files.sort();
}

/** `.next/server/app/blog/a-post.html` → `/blog/a-post`; `index.html` → `/`. */
function pathnameOf(file) {
  const relative = path.relative(PRERENDER_ROOT, file).replace(/\.html$/, "");

  return relative === "index" ? "/" : `/${relative}`;
}

/**
 * Every asset URL the HTML names, tagged with whether the browser will skip it.
 *
 * Both `<script src>` and `<link href>` are read: Next preloads a chunk with a
 * link and executes it with a script, and a chunk named either way is fetched.
 * The same URL appearing in both forms is counted once.
 */
function referencedAssets(html) {
  /** @type {Map<string, boolean>} URL → is it `nomodule`. */
  const assets = new Map();

  // Matched whole and then read attribute by attribute: `nomodule` may sit on
  // either side of the URL, and a single expression cannot capture both.
  for (const [element] of html.matchAll(/<(?:script|link)\b[^>]*>/g)) {
    const url = element.match(/(?:src|href)="([^"]+)"/)?.[1];

    if (url === undefined || !url.startsWith(ASSET_PREFIX)) continue;

    const legacy = /\bnomodule\b/i.test(element);

    assets.set(url, (assets.get(url) ?? true) && legacy);
  }

  return assets;
}

/** Measures one asset, or returns null for a URL with no file behind it. */
async function measure(url) {
  const file = path.join(BUILD_ROOT, url.slice(ASSET_PREFIX.length));

  if (!existsSync(file)) return null;

  const contents = await readFile(file);

  return { url, bytes: contents.byteLength, gzipped: gzipSync(contents, { level: 9 }).byteLength };
}

/** @returns {Promise<PageReport>} */
async function reportPage(file) {
  const html = await readFile(file, "utf8");
  const scripts = [];
  const legacyScripts = [];
  const stylesheets = [];
  const fonts = [];

  for (const [url, legacy] of referencedAssets(html)) {
    const asset = await measure(url);

    if (asset === null) continue;

    // Bucketed by extension, not by tag: `next/font` preloads its `.woff2`
    // files with the same kind of `<link>` a stylesheet uses, and a font
    // counted as JavaScript would put ~50 kB of incompressible bytes into the
    // figure this script exists to report.
    if (url.endsWith(".css")) stylesheets.push(asset);
    else if (/\.(?:woff2?|ttf|otf)$/.test(url)) fonts.push(asset);
    else if (!url.endsWith(".js")) continue;
    else if (legacy) legacyScripts.push(asset);
    else scripts.push(asset);
  }

  return { pathname: pathnameOf(file), scripts, legacyScripts, stylesheets, fonts };
}

const total = (assets, field) => assets.reduce((sum, asset) => sum + asset[field], 0);
const kB = (bytes) => `${(bytes / 1024).toFixed(1)} kB`;

/** Formats one page as a table row. */
function row(page, sharedScripts) {
  const own = page.scripts.filter((asset) => !sharedScripts.has(asset.url));

  return [
    page.pathname.padEnd(46),
    kB(total(page.scripts, "gzipped")).padStart(9),
    kB(total(page.scripts, "bytes")).padStart(10),
    own.length === 0 ? "—" : `+${kB(total(own, "gzipped"))} in ${own.length}`,
  ].join("  ");
}

async function main() {
  if (!existsSync(PRERENDER_ROOT)) {
    console.error("bundle-report: no build found. Run `pnpm build` first.");
    process.exitCode = 1;
    return;
  }

  const files = await prerenderedPages();
  const pages = await Promise.all(files.map(reportPage));
  const site = pages.filter((page) => !INTERNAL_PAGES.has(page.pathname));
  const internal = pages.filter((page) => INTERNAL_PAGES.has(page.pathname));

  // The chunks every page of the site carries: the framework, the layout and
  // its navigation. Everything else is what a page pulled in on its own.
  const sharedScripts = new Set(
    site[0]?.scripts
      .map((asset) => asset.url)
      .filter((url) => site.every((page) => page.scripts.some((asset) => asset.url === url))) ?? [],
  );
  const shared = site[0]?.scripts.filter((asset) => sharedScripts.has(asset.url)) ?? [];

  const buildTime = (await stat(path.join(BUILD_ROOT, "BUILD_ID"))).mtime;
  console.log(`Client JavaScript per page — build of ${buildTime.toISOString()}\n`);
  console.log(
    `${"route".padEnd(46)}  ${"gzipped".padStart(9)}  ${"raw".padStart(10)}  beyond the shared chunks`,
  );
  console.log("-".repeat(46 + 2 + 9 + 2 + 10 + 2 + 24));

  for (const page of site) console.log(row(page, sharedScripts));
  console.log();
  for (const page of internal) console.log(row(page, sharedScripts));

  console.log(
    `\nShared by every page: ${shared.length} chunks, ` +
      `${kB(total(shared, "gzipped"))} gzipped (${kB(total(shared, "bytes"))} raw).`,
  );

  const stylesheets = site[0]?.stylesheets ?? [];
  console.log(
    `Stylesheets: ${stylesheets.length}, ` +
      `${kB(total(stylesheets, "gzipped"))} gzipped (${kB(total(stylesheets, "bytes"))} raw).`,
  );

  const fonts = site[0]?.fonts ?? [];
  if (fonts.length > 0) {
    console.log(`Preloaded fonts: ${fonts.length}, ${kB(total(fonts, "bytes"))} (already compressed).`);
  }

  const legacy = site[0]?.legacyScripts ?? [];
  if (legacy.length > 0) {
    console.log(
      `Excluded: ${kB(total(legacy, "gzipped"))} gzipped of \`nomodule\` polyfills, ` +
        "which a browser that supports modules never fetches.",
    );
  }
}

await main();
