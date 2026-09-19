/**
 * The demo registry (spec §15): the interactive demonstrations a lesson may
 * embed. Lesson pages render with `{ ...proseComponents, ...demoComponents }`;
 * article pages render with the prose registry alone, so no demo is ever in an
 * article's module graph.
 *
 * **Every entry must come from `lazy-demos.ts`, never from a direct import.**
 * That is what keeps a demo's JavaScript out of the lessons that do not use it:
 * this registry is passed to every lesson, so a demo named here from anywhere
 * else is code the whole route carries. Why the deferral lives in a separate
 * `"use client"` module rather than in this one is explained there — calling
 * `next/dynamic` in a Server Component defers nothing at the route level.
 *
 * The demos are Client Components; the `"use client"` directive belongs in each
 * demo file and in `lazy-demos.ts`, not in this one.
 */
import { ActivationFunctionExplorer, GradientDescentDemo } from "@/components/learn/lazy-demos";
import type { MdxComponents } from "@/lib/content/mdx";

export const demoComponents = {
  ActivationFunctionExplorer,
  GradientDescentDemo,
} satisfies MdxComponents;
