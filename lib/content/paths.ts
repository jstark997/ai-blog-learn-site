/**
 * The path conventions both content trees share: what counts as a content
 * file, how a file is named in an error, and which URL segments are safe to
 * turn back into a filesystem path.
 *
 * Blog and Learn answer these the same way, and they have to: a file either
 * counts for the retrieval utilities and for `scripts/validate-content.mjs`,
 * or for neither. Keeping the answers here means the two trees cannot drift
 * apart one helper at a time.
 */
import path from "node:path";

export const MDX_EXTENSION = ".mdx";

/**
 * Scaffolding and editor droppings are not content. The `_` and `.` prefixes
 * are the same convention `scripts/validate-content.mjs` walks the tree with.
 */
export function isIgnoredEntry(name: string): boolean {
  return name.startsWith(".") || name.startsWith("_");
}

/** How a file is named in a validation error: relative to the repository. */
export function displayPath(file: string): string {
  return path.relative(process.cwd(), file);
}

/** `introduction.mdx` -> `introduction`. */
export function idFromFilename(name: string): string {
  return name.slice(0, -MDX_EXTENSION.length);
}

/** A content file, as opposed to a `.md`, a `README.txt` or scaffolding. */
export function isContentFile(name: string): boolean {
  return name.endsWith(MDX_EXTENSION) && !isIgnoredEntry(name);
}

/**
 * A segment that could escape the content directory, name a dotfile, or reach
 * a nested path is not an id — it is a traversal attempt or a typo. Rejecting
 * it here is what lets a lookup build a path out of an untrusted URL segment.
 */
export function isReadableSegment(segment: string): boolean {
  return segment.length > 0 && !segment.startsWith(".") && path.basename(segment) === segment;
}
