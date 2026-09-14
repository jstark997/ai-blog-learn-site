/**
 * The demo registry (spec §15): the interactive demonstrations a lesson may
 * embed. Lesson pages render with `{ ...proseComponents, ...demoComponents }`;
 * article pages render with the prose registry alone, so no demo is ever in an
 * article's module graph.
 *
 * **Every entry must be wrapped in `next/dynamic`.** That is what keeps a demo's
 * JavaScript out of the lessons that do not use it: the registry is passed to
 * every lesson, but a lazily-imported component's chunk is only requested when
 * something actually renders it. An entry added as a direct import would load on
 * all of them and would contradict spec §30.
 *
 * `ssr: false` is not an option here — `next/dynamic` rejects it inside a Server
 * Component, and a demo should render its initial state into the HTML anyway.
 * The demos are Client Components; the `"use client"` directive belongs in each
 * demo file, not in this one.
 *
 * Phases 11 and 12 fill this in, each demo in the form:
 *
 * ```ts
 * export const demoComponents = {
 *   ActivationFunctionExplorer: dynamic(
 *     () => import("@/components/learn/neural-networks/ActivationFunctionExplorer"),
 *   ),
 * } satisfies MdxComponents;
 * ```
 *
 * It is empty until then, and deliberately so: a placeholder demo would be
 * scaffolding prose in component form (spec §3.1), and an MDX file naming a demo
 * that does not exist yet fails the build, which is the intended behaviour.
 */
import type { MdxComponents } from "@/lib/content/mdx";

export const demoComponents = {} satisfies MdxComponents;
