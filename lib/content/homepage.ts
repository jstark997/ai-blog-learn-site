/**
 * What the homepage shows — the content selection, not the copy (spec §8.2,
 * §8.3, §34). The words the page says about itself live in `lib/site.ts`.
 *
 * Recent posts are discovered, not listed: they come from `getAllBlogPosts`,
 * which has already ordered them and already dropped the drafts, so publishing
 * a post changes the homepage and nothing here needs editing (spec §34).
 *
 * Featured lessons are the one deliberately manual part. There is no
 * popularity signal on a static site and no "featured" flag in frontmatter —
 * a lesson's frontmatter describes the lesson, not the homepage — so the
 * selection is three paths in this file. Resolution goes through
 * `getLessonByPath`, which means a featured draft is invisible in production
 * for exactly the same reason every other draft is (spec §16).
 */
import { getAllBlogPosts, type BlogPost } from "./blog";
import { getLessonByPath, type Lesson } from "./learn";

/** How many posts the homepage lists (spec §34). */
export const RECENT_POST_COUNT = 3;

/**
 * The lessons the homepage puts forward, in the order it shows them, as
 * `<topic-id>/<lesson-id>` — the same form `prerequisites` frontmatter uses.
 *
 * Editing this list is the whole interface: no component changes with it.
 */
export const featuredLessonPaths: readonly string[] = [
  "neural-networks/introduction",
  "neural-networks/gradient-descent",
  "transformers/attention",
];

/**
 * The most recent posts, newest first, drafts already excluded.
 *
 * `limit` and `root` are parameters so a test can ask for a different number
 * against a content tree of its own; the homepage calls `getRecentPosts()`.
 */
export async function getRecentPosts(
  limit: number = RECENT_POST_COUNT,
  root?: string,
): Promise<BlogPost[]> {
  const posts = await getAllBlogPosts(root);
  return posts.slice(0, limit);
}

/**
 * The featured lessons that exist and may be seen, in configured order.
 *
 * An entry that resolves to nothing is dropped rather than rendered as a dead
 * link: in production that is a lesson still in draft, and while the author is
 * mid-rename it is a path that no longer names anything. The homepage shows
 * one lesson fewer either way, which is the only failure mode that does not
 * put a 404 in front of a first-time visitor.
 */
export async function getFeaturedLessons(
  paths: readonly string[] = featuredLessonPaths,
  root?: string,
): Promise<Lesson[]> {
  const lessons = await Promise.all(
    paths.map((featured) => {
      const [topicId = "", lessonId = ""] = featured.split("/");
      return getLessonByPath(topicId, lessonId, root);
    }),
  );

  return lessons.filter((lesson): lesson is Lesson => lesson !== null);
}
