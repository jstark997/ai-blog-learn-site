/**
 * Draft visibility — the one helper that decides it, everywhere (spec §16).
 *
 * No component, route, sitemap entry or feed item may read `NODE_ENV` for this
 * purpose. They all consult `showDrafts`, so the rule lives in one place and
 * can be reasoned about once.
 *
 * `NODE_ENV` alone is not enough: a Vercel preview deployment is a *production*
 * Next.js build, and a preview URL is exactly where a draft most needs looking
 * at — for maths, diagrams and responsive layout (spec §33). `VERCEL_ENV`
 * separates `production` from `preview`; `SHOW_DRAFTS` is the host-neutral
 * override for anywhere else.
 *
 * | Environment                                  | Drafts visible |
 * |----------------------------------------------|----------------|
 * | `pnpm dev`                                   | yes            |
 * | preview deployment (branch or pull request)  | yes            |
 * | production deployment from `main`            | no             |
 * | anywhere, with `SHOW_DRAFTS` set             | as set         |
 */
export const showDrafts: boolean =
  process.env.SHOW_DRAFTS === "true" ||
  (process.env.SHOW_DRAFTS !== "false" &&
    (process.env.VERCEL_ENV ?? process.env.NODE_ENV) !== "production");
