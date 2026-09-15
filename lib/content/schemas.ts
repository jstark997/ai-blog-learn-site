/**
 * Frontmatter schemas — the only definition of what a post or a lesson may
 * declare (spec §10, §12).
 *
 * The metadata types are derived from these schemas with `z.infer`; nothing is
 * hand-maintained alongside them, so a field cannot be added to one and
 * forgotten in the other.
 *
 * This module is imported by `scripts/validate-content.mjs` through Node's
 * TypeScript stripping, so it must stay free of path aliases, JSX and
 * non-erasable syntax.
 */
import { z } from "zod";

/**
 * `Date.parse("2026-02-30")` does not fail — it rolls over to 2 March — so the
 * regex alone would accept a date the author never meant. Round-tripping the
 * value through `Date` catches an impossible day or month.
 */
function isRealDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/**
 * YAML parses an unquoted `2026-09-04` into a JavaScript `Date`, not a string,
 * so a bare `z.string()` would reject every date the author forgot to quote —
 * a bug that surfaces on the first real post rather than on the carefully
 * quoted examples in the specification. The preprocessor coerces a `Date` back
 * to `YYYY-MM-DD` first (spec §12). Both date fields on both content types use
 * it.
 */
const isoDate = z.preprocess(
  (value) => (value instanceof Date ? value.toISOString().slice(0, 10) : value),
  z
    .string({ error: "Expected an ISO date, e.g. 2026-09-04" })
    // `abort` stops after a badly shaped date, so "yesterday" produces one
    // line of explanation rather than two.
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      error: "Expected an ISO date, e.g. 2026-09-04",
      abort: true,
    })
    .refine(isRealDate, "Expected a date that exists, e.g. not 2026-02-30"),
);

/** A required field that must carry actual words, not an empty string. */
function requiredText(expectation: string) {
  return z.string({ error: expectation }).trim().min(1, expectation);
}

/**
 * A prerequisite is a route path, `<topic-id>/<lesson-id>` (spec §12).
 * `validate:content` then checks that it resolves to a published lesson.
 */
const lessonPath = z
  .string({ error: 'Expected "<topic-id>/<lesson-id>", e.g. neural-networks/introduction' })
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Expected "<topic-id>/<lesson-id>", e.g. neural-networks/introduction',
  );

/**
 * Blog post frontmatter (spec §10).
 *
 * Unknown keys are rejected rather than ignored. A misspelt `drafts: true`
 * would otherwise publish an unfinished post in silence, which is the failure
 * mode this project can least afford; the cost is that a future field has to be
 * added here before it can be used in content.
 */
export const blogPostSchema = z.strictObject({
  title: requiredText("Expected a title"),
  description: requiredText("Expected a description"),
  publishedAt: isoDate,
  updatedAt: isoDate.optional(),
  tags: z.array(z.string({ error: "Expected a list of strings" }), {
    error: "Expected a list of tags",
  }).default([]),
  draft: z.boolean({ error: "Expected true or false" }).default(false),
});

export type BlogPostMetadata = z.infer<typeof blogPostSchema>;

/**
 * Lesson frontmatter (spec §12).
 *
 * Deliberately absent: `topic`, derived from the parent directory, and `slug`,
 * derived from the filename. Adding either back would create a second source of
 * truth for the route, and a typo in it would silently split a topic in two.
 */
export const lessonSchema = z.strictObject({
  title: requiredText("Expected a title"),
  description: requiredText("Expected a description"),
  // Sparse, in multiples of ten, so a lesson can be inserted between two
  // others without renumbering the topic (spec §13). The convention is not
  // enforced — an author who deliberately writes 15 has a reason — but
  // `validate:content` does reject a duplicate within a topic.
  order: z
    .int({ error: "Expected a whole number, sparse in tens: 10, 20, 30" })
    .positive("Expected a positive number, sparse in tens: 10, 20, 30"),
  difficulty: z
    .enum(["beginner", "intermediate", "advanced"], {
      error: 'Expected "beginner", "intermediate" or "advanced"',
    })
    .optional(),
  prerequisites: z
    .array(lessonPath, { error: "Expected a list of lesson paths" })
    .default([]),
  publishedAt: isoDate,
  updatedAt: isoDate.optional(),
  draft: z.boolean({ error: "Expected true or false" }).default(false),
});

export type LessonMetadata = z.infer<typeof lessonSchema>;

/**
 * Standalone page frontmatter (spec §24): `/about` today, and any other page
 * whose prose belongs in MDX rather than in a component.
 *
 * Narrower than the two content types on purpose. A page is not part of a
 * chronology, so it has no `publishedAt`; it is not in a reading order, so it
 * has no `order`; and it has no `draft` field, because a page is reached from
 * the global navigation on every route — an unfinished one is not committed, it
 * is not published with a flag to hide it. `strictObject` turns each of those
 * into a named error rather than a field that is silently ignored.
 */
export const pageSchema = z.strictObject({
  title: requiredText("Expected a title"),
  description: requiredText("Expected a description"),
  updatedAt: isoDate.optional(),
});

export type PageMetadata = z.infer<typeof pageSchema>;
