/**
 * Standalone pages — `/about` and anything else whose prose is authored rather
 * than generated (spec §24).
 *
 * The same shape as the other two content utilities, and for the same reasons:
 * one file per page under `content/pages/`, frontmatter validated by a Zod
 * schema, the body returned as raw MDX for `renderMdx` to compile, and no JSX
 * anywhere in this module.
 *
 * ```text
 * content/pages/about.mdx  ->  app/about/page.tsx renders it at /about
 *               ^^^^^
 *               page id
 * ```
 *
 * There is no discovery function here, and no `getAllPages`. A page exists
 * because a route reads it: the id is a literal in the route that renders it,
 * never a URL segment, so nothing here has to defend against a traversal
 * attempt the way `getLessonByPath` does. That is also why a missing file
 * throws instead of returning `null` — a route asking for a page names a file
 * the repository is supposed to contain, and a rename should stop the build
 * rather than quietly turn a navigation entry into a 404.
 *
 * Pages have no draft flag (see `pageSchema`), so there is no visibility rule
 * to get wrong and nothing for `showDrafts` to decide.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";

import { MDX_EXTENSION, displayPath } from "./paths";
import { pageSchema, type PageMetadata } from "./schemas";
import { ContentValidationError, checkFrontmatter } from "./validate";

const PAGES_ROOT = path.join(process.cwd(), "content", "pages");

export type Page = {
  /** Derived from the filename; the route that reads it supplies it. */
  id: string;
  metadata: PageMetadata;
  /** The MDX body, frontmatter stripped. Hand it to `renderMdx` to display. */
  content: string;
};

/**
 * One page by its id.
 *
 * Throws when the file is absent, and — through `parseFrontmatter` — when its
 * frontmatter is invalid (spec §18). Both are repository mistakes that a build
 * should refuse to paper over.
 *
 * `root` exists so a test can hand this function a tree of its own, the way the
 * blog and learn utilities already accept one. Application code calls
 * `getPage("about")`.
 */
export async function getPage(id: string, root: string = PAGES_ROOT): Promise<Page> {
  const file = path.join(root, `${id}${MDX_EXTENSION}`);

  let source: string;
  try {
    source = await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Missing page content: ${displayPath(file)}`);
    }
    throw error;
  }

  const { data, content } = matter(source);
  // `draftable: false` rather than `parseFrontmatter`: a page has no draft state
  // to excuse an invalid file, so there is no warn-and-skip branch here — every
  // problem throws, and the caller always gets a page (spec §18).
  const result = checkFrontmatter(pageSchema, data, displayPath(file), { draftable: false });
  if (!result.ok) throw new ContentValidationError(result.issue);

  return { id, metadata: result.metadata, content };
}
