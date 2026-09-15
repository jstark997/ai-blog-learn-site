/**
 * The heading rank a listing card renders, chosen by the page around it.
 *
 * The same card appears under an `<h1>` on an index page and under a section's
 * `<h2>` on the homepage; a fixed rank would skip a level on one of them. Both
 * the blog and the lesson card take it, so the choice is spelled out once.
 */
export type CardHeadingLevel = "h2" | "h3";
