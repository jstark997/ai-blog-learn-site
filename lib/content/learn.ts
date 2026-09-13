/**
 * Lesson retrieval — discovery, parsing, validation, topic grouping, ordering,
 * draft filtering and adjacency, with no UI in sight (spec §17).
 *
 * The shape of the tree is the data model (spec §11.1):
 *
 * ```text
 * content/learn/neural-networks/attention.mdx
 *               ^^^^^^^^^^^^^^^ ^^^^^^^^^
 *               topic id        lesson id   ->  /learn/neural-networks/attention
 * ```
 *
 * Nothing in frontmatter repeats either id. `lib/content/topics.ts` supplies a
 * topic's title and position and nothing else.
 *
 * **Drafts are removed before adjacency is computed.** That ordering is the
 * whole reason adjacency lives here rather than in a page: previous/next are
 * derived from the same filtered list the topic page lists, so a hidden lesson
 * can never be linked to from a published one (spec §13, §16).
 *
 * Files are read at build time; there is no API route, no database and no
 * cache, for the same reason `lib/content/blog.ts` has none. `content` is the
 * raw MDX body — `renderMdx` turns it into React, and keeping this module free
 * of JSX is what lets the sitemap and the tests use it without compiling a
 * lesson.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";

import { showDrafts } from "./env";
import {
  MDX_EXTENSION,
  displayPath,
  idFromFilename,
  isContentFile,
  isIgnoredEntry,
  isReadableSegment,
} from "./paths";
import { lessonSchema, type LessonMetadata } from "./schemas";
import { topicRank } from "./topics";
import { parseFrontmatter } from "./validate";

const LEARN_ROOT = path.join(process.cwd(), "content", "learn");

export type Lesson = {
  /** The parent directory name. There is no `topic` field in frontmatter. */
  topicId: string;
  /** Derived from the filename. There is no `slug` field either. */
  lessonId: string;
  metadata: LessonMetadata;
  /** The MDX body, frontmatter stripped. Hand it to `renderMdx` to display. */
  content: string;
};

/** Either neighbour is `null` at the first or last lesson of a topic. */
export type AdjacentLessons = {
  previous: Lesson | null;
  next: Lesson | null;
};

/** Whether a lesson may be seen at all in the current environment (spec §16). */
function isVisible(lesson: Lesson): boolean {
  return showDrafts || !lesson.metadata.draft;
}

/**
 * Reads and validates one lesson. Returns `null` when the file is absent, or
 * when it is a draft whose frontmatter does not validate — `parseFrontmatter`
 * warns about that one and throws for invalid published content (spec §18).
 */
async function readLesson(root: string, topicId: string, lessonId: string): Promise<Lesson | null> {
  const file = path.join(root, topicId, `${lessonId}${MDX_EXTENSION}`);

  let source: string;
  try {
    source = await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }

  const { data, content } = matter(source);
  const metadata = parseFrontmatter(lessonSchema, data, displayPath(file));
  if (metadata === null) return null;

  return { topicId, lessonId, metadata, content };
}

/** Directory entries, or nothing at all when the directory does not exist. */
async function readEntries(directory: string) {
  try {
    return await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

/**
 * By `order` ascending, with the lesson id as a deterministic tiebreak
 * (spec §13). A duplicate `order` within a topic is already a
 * `validate:content` error; the tiebreak is the safety net that keeps a build
 * from ordering two lessons differently each time it runs.
 */
function byLessonOrder(a: Lesson, b: Lesson): number {
  return a.metadata.order - b.metadata.order || a.lessonId.localeCompare(b.lessonId);
}

/**
 * Every visible lesson in one topic, in reading order.
 *
 * `root` exists so a test can hand this function a content tree of its own,
 * the way `scripts/validate-content.mjs` already accepts one. Application code
 * calls `getLessonsByTopic(topicId)`.
 */
export async function getLessonsByTopic(
  topicId: string,
  root: string = LEARN_ROOT,
): Promise<Lesson[]> {
  if (!isReadableSegment(topicId)) return [];

  const entries = await readEntries(path.join(root, topicId));
  const lessonIds = entries
    .filter((entry) => entry.isFile() && isContentFile(entry.name))
    .map((entry) => idFromFilename(entry.name));

  const lessons = await Promise.all(lessonIds.map((id) => readLesson(root, topicId, id)));

  return lessons
    .filter((lesson): lesson is Lesson => lesson !== null && isVisible(lesson))
    .toSorted(byLessonOrder);
}

/**
 * Every visible lesson on the site, grouped by topic in `topics.ts` order and
 * ordered within each topic. Flat, because the callers that want it grouped —
 * the Learn index — group it themselves from `learningTopics`, and the
 * callers that do not — the sitemap — would only have to flatten it again.
 */
export async function getAllLessons(root: string = LEARN_ROOT): Promise<Lesson[]> {
  const entries = await readEntries(root);
  const topicIds = entries
    .filter((entry) => entry.isDirectory() && !isIgnoredEntry(entry.name))
    .map((entry) => entry.name)
    .toSorted((a, b) => topicRank(a) - topicRank(b) || a.localeCompare(b));

  const byTopic = await Promise.all(topicIds.map((topicId) => getLessonsByTopic(topicId, root)));

  return byTopic.flat();
}

/**
 * One lesson by its route path, or `null` when there is no such lesson — and
 * `null` for a draft whenever drafts are hidden, so the route can call
 * `notFound()` and a draft URL 404s in production (spec §16).
 */
export async function getLessonByPath(
  topicId: string,
  lessonId: string,
  root: string = LEARN_ROOT,
): Promise<Lesson | null> {
  if (!isReadableSegment(topicId) || !isReadableSegment(lessonId)) return null;

  const lesson = await readLesson(root, topicId, lessonId);
  if (lesson === null) return null;

  return isVisible(lesson) ? lesson : null;
}

/**
 * The lessons either side of this one within its topic (spec §13).
 *
 * Computed from `getLessonsByTopic`, which has already dropped the drafts, so
 * "next" skips a hidden lesson rather than linking to a page that 404s. A
 * lesson that is not in the visible list — it does not exist, or it is itself
 * a hidden draft — has no neighbours, which is what a 404 page wants anyway.
 */
export async function getAdjacentLessons(
  topicId: string,
  lessonId: string,
  root: string = LEARN_ROOT,
): Promise<AdjacentLessons> {
  const lessons = await getLessonsByTopic(topicId, root);
  const index = lessons.findIndex((lesson) => lesson.lessonId === lessonId);

  if (index === -1) return { previous: null, next: null };

  return {
    previous: lessons[index - 1] ?? null,
    next: lessons[index + 1] ?? null,
  };
}

/**
 * A prerequisite, resolved against the content tree (spec §12).
 *
 * `title` is `null` when nothing resolves the path. `validate:content` fails a
 * build on an unresolvable prerequisite, so in a published tree that case means
 * the target is a draft the current environment hides — a lesson page then
 * names the prerequisite without linking to a page that would 404.
 */
export type Prerequisite = {
  topicId: string;
  lessonId: string;
  title: string | null;
};

/**
 * Resolves `<topic-id>/<lesson-id>` prerequisite paths to the titles their
 * targets carry, so a lesson page can link to them by name rather than by
 * identifier and the two cannot drift apart when a title is edited.
 *
 * Lives here rather than in the page because it is content lookup, not
 * presentation: the route only turns the result into anchors.
 */
export async function getPrerequisites(
  paths: readonly string[],
  root: string = LEARN_ROOT,
): Promise<Prerequisite[]> {
  return Promise.all(
    paths.map(async (prerequisite) => {
      const [topicId = "", lessonId = ""] = prerequisite.split("/");
      const lesson = await getLessonByPath(topicId, lessonId, root);

      return { topicId, lessonId, title: lesson?.metadata.title ?? null };
    }),
  );
}
