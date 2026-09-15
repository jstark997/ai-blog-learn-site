/**
 * The sitemap (spec §25), served at `/sitemap.xml`.
 *
 * Every URL is derived from the content tree, so publishing a post or a lesson
 * adds it and nobody edits this file — the same rule the homepage and the
 * indexes already follow (spec §34).
 *
 * **Drafts are excluded unconditionally**, not by way of `showDrafts`. The
 * content utilities have already dropped them in production; the second filter
 * below covers the case they cannot, which is a preview deployment, where
 * drafts are deliberately visible (spec §16, §33). A sitemap is an instruction
 * to a crawler rather than a page, and an unfinished post has no business in
 * one whatever environment generated it. `lib/feed.ts` draws the same line.
 *
 * `changeFrequency` and `priority` are omitted. Google ignores both, and a
 * number nobody maintains is worse than a field nobody set.
 */
import type { MetadataRoute } from "next";

import { getAllBlogPosts } from "@/lib/content/blog";
import { getAllLessons } from "@/lib/content/learn";
import { getPage } from "@/lib/content/pages";
import { absoluteUrl } from "@/lib/site";

/** What the entry claims as its last change: the revision, else publication. */
function modifiedAt(metadata: { publishedAt: string; updatedAt?: string }): string {
  return metadata.updatedAt ?? metadata.publishedAt;
}

/** The most recent of a set of `YYYY-MM-DD` dates, which sort as strings. */
function latest(dates: readonly string[]): string | undefined {
  return dates.toSorted().at(-1);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [allPosts, allLessons, about] = await Promise.all([
    getAllBlogPosts(),
    getAllLessons(),
    getPage("about"),
  ]);

  const posts = allPosts.filter((post) => !post.metadata.draft);
  const lessons = allLessons.filter((lesson) => !lesson.metadata.draft);

  const postDates = posts.map((post) => modifiedAt(post.metadata));
  const lessonDates = lessons.map((lesson) => modifiedAt(lesson.metadata));
  const aboutDate = about.metadata.updatedAt;

  // Topics in the order `getAllLessons` grouped them, and only those with
  // something published in them: a topic whose every lesson is a draft has no
  // page to point at (spec §11.1).
  const topicIds = [...new Set(lessons.map((lesson) => lesson.topicId))];

  return [
    {
      url: absoluteUrl("/"),
      lastModified: latest([
        ...postDates,
        ...lessonDates,
        ...(aboutDate === undefined ? [] : [aboutDate]),
      ]),
    },
    { url: absoluteUrl("/blog"), lastModified: latest(postDates) },
    ...posts.map((post) => ({
      url: absoluteUrl(`/blog/${post.slug}`),
      lastModified: modifiedAt(post.metadata),
    })),
    { url: absoluteUrl("/learn"), lastModified: latest(lessonDates) },
    ...topicIds.map((topicId) => ({
      url: absoluteUrl(`/learn/${topicId}`),
      lastModified: latest(
        lessons
          .filter((lesson) => lesson.topicId === topicId)
          .map((lesson) => modifiedAt(lesson.metadata)),
      ),
    })),
    ...lessons.map((lesson) => ({
      url: absoluteUrl(`/learn/${lesson.topicId}/${lesson.lessonId}`),
      lastModified: modifiedAt(lesson.metadata),
    })),
    { url: absoluteUrl("/about"), lastModified: aboutDate },
  ];
}
