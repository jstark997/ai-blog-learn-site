"use client";

/**
 * The lazy boundary for the interactive demonstrations (spec §15, §30).
 *
 * `next/dynamic` only defers a chunk from the module graph it is *called* in.
 * Called in a Server Component, it produces a client reference, and a route's
 * client references are collected at build time from the route's module graph —
 * not from what a particular page rendered. `/learn/[topic]/[lesson]` is one
 * route, so a demo imported that way was fetched by every lesson, including the
 * four that embed no demo at all. Measured before this file existed: one 31.7 kB
 * script carrying both demos on all six lesson pages.
 *
 * Calling `dynamic` behind `"use client"` moves the deferral into the browser
 * bundle. What the route references is then this module — the two loaders and
 * nothing else — and each demo becomes an async chunk fetched when something
 * renders it. A lesson with no demo fetches neither; a lesson with one fetches
 * one.
 *
 * `ssr: false` is deliberately not used: a demo should render its initial state
 * into the prerendered HTML, so that it is readable before hydration and
 * appears in the static output `pnpm verify` and the tests read.
 *
 * Each demo therefore needs a default export, which is what `import()` resolves
 * to here. Add a demo by adding a loader here and naming it in `registry.ts`;
 * importing one directly, in either file, puts it back on every lesson page.
 */

import dynamic from "next/dynamic";

export const ActivationFunctionExplorer = dynamic(
  () => import("@/components/learn/neural-networks/ActivationFunctionExplorer"),
);

export const GradientDescentDemo = dynamic(
  () => import("@/components/learn/neural-networks/GradientDescentDemo"),
);
