// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { blogEntries, lessonEntries, type ContentEntry, type LessonEntry } from "./content-oracle";

/**
 * The other side of the draft audit (spec §16): what a draft looks like where
 * it *is* visible — `pnpm dev` and a preview deployment.
 *
 * Hiding drafts in production is only half the requirement. The other half is
 * that a visible draft is unmistakably a draft, on its own page and in every
 * listing that offers a way to it, because a preview deployment is exactly
 * where someone reads an unfinished lesson and needs to know that is what it is
 * (spec §33).
 *
 * The badge components are unit-tested next to their listings — `PostCard` and
 * `LessonCard` in `tests/blog-ui` and `tests/learn-ui`, the sidebar, pager and
 * prerequisites in `tests/lesson-navigation` and `tests/learn-ui`. What this
 * file adds is that the routes actually wire them up: a badge no page renders
 * passes every component test there is.
 *
 * Which content is a draft comes from `tests/content-oracle.ts` rather than
 * from `lib/content`, for the reason set out there.
 */

// Before any module under test is imported: `showDrafts` is a module-level
// constant, so the environment has to be settled first.
vi.stubEnv("SHOW_DRAFTS", "true");

/** The badge's own markup, whichever size it is rendered at. */
const BADGE = ">Draft</span>";

/**
 * The part of a page an assertion is about, so that a badge somewhere else on
 * the page cannot stand in for the one being looked for — a lesson page carries
 * several, and `toContain` alone would be satisfied by any of them.
 */
function between(html: string, from: string, to: string): string {
  const start = html.indexOf(from);
  const end = html.indexOf(to, start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);

  return html.slice(start, end);
}

let posts: ContentEntry[] = [];
let lessons: LessonEntry[] = [];

beforeAll(async () => {
  [posts, lessons] = await Promise.all([blogEntries(), lessonEntries()]);
});

function routeProps<Params>(
  params: Params,
): {
  params: Promise<Params>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
} {
  return { params: Promise.resolve(params), searchParams: Promise.resolve({}) };
}

describe("with SHOW_DRAFTS=true", () => {
  it("shows the draft post on the blog index, badged", async () => {
    const { default: BlogIndexPage } = await import("@/app/blog/page");
    const html = renderToStaticMarkup(await BlogIndexPage());

    for (const draft of posts.filter((post) => post.draft)) {
      expect(html).toContain(`href="${draft.url}"`);
    }
    expect(html).toContain(BADGE);
  });

  it("shows the draft lesson on the learn index and its topic page, badged", async () => {
    const { default: LearnIndexPage } = await import("@/app/learn/page");
    const { default: TopicPage } = await import("@/app/learn/[topic]/page");
    const drafts = lessons.filter((lesson) => lesson.draft);

    const index = renderToStaticMarkup(await LearnIndexPage());
    expect(index).toContain(BADGE);

    for (const draft of drafts) {
      expect(index).toContain(`href="${draft.url}"`);

      const topic = renderToStaticMarkup(await TopicPage(routeProps({ topic: draft.topicId })));
      expect(topic).toContain(`href="${draft.url}"`);
      expect(topic).toContain(BADGE);
    }
  });

  /**
   * The header badge, the one a reader of the draft itself sees — and the
   * sidebar entry for the lesson being read, which is a listing like any other.
   */
  it("badges a draft lesson on its own page, which renders rather than 404s", async () => {
    const { default: LessonPage } = await import("@/app/learn/[topic]/[lesson]/page");

    for (const draft of lessons.filter((lesson) => lesson.draft)) {
      const html = renderToStaticMarkup(
        await LessonPage(routeProps({ topic: draft.topicId, lesson: draft.lessonId })),
      );

      expect(html).toContain(draft.title);
      // Above the title, in the article's own header — not merely somewhere on
      // a page that also lists the topic's other lessons.
      expect(between(html, "<article", "</h1>")).toContain(BADGE);
      // And in the sidebar, where this lesson is one entry among its siblings.
      expect(between(html, "<nav", "</nav>")).toContain(BADGE);
    }
  }, 60_000);

  it("badges a draft post on its own page", async () => {
    const { default: BlogPostPage } = await import("@/app/blog/[slug]/page");

    for (const draft of posts.filter((post) => post.draft)) {
      const slug = draft.url.slice("/blog/".length);
      const html = renderToStaticMarkup(await BlogPostPage(routeProps({ slug })));

      expect(html).toContain(draft.title);
      expect(between(html, "<article", "</h1>")).toContain(BADGE);
    }
  }, 60_000);

  /**
   * A published lesson whose neighbour is a draft: with drafts visible the
   * pager links to it, so the pager has to say what it leads to.
   */
  it("badges a draft that is the neighbour of a published lesson", async () => {
    const { default: LessonPage } = await import("@/app/learn/[topic]/[lesson]/page");
    const { getAdjacentLessons } = await import("@/lib/content/learn");

    const withDraftNeighbour = await Promise.all(
      lessons
        .filter((lesson) => !lesson.draft)
        .map(async (lesson) => {
          const { previous, next } = await getAdjacentLessons(lesson.topicId, lesson.lessonId);
          const neighbours = [previous, next].filter((entry) => entry !== null);
          return neighbours.some((entry) => entry.metadata.draft) ? lesson : null;
        }),
    );
    const candidates = withDraftNeighbour.filter((lesson) => lesson !== null);

    // The sample content puts a draft last in a topic, so there is one; without
    // it this case would pass by having nothing to check (spec §37).
    expect(candidates.length).toBeGreaterThanOrEqual(1);

    for (const lesson of candidates) {
      const html = renderToStaticMarkup(
        await LessonPage(routeProps({ topic: lesson.topicId, lesson: lesson.lessonId })),
      );

      // Inside the pager itself: this page is published, so its own header
      // carries no badge and only the neighbour's can satisfy this.
      expect(between(html, '<nav aria-label="Previous and next lessons"', "</nav>")).toContain(
        BADGE,
      );
    }
  }, 60_000);

  it("generates the draft routes, so a preview deployment serves them", async () => {
    const blog = await import("@/app/blog/[slug]/page");
    const learn = await import("@/app/learn/[topic]/[lesson]/page");

    const slugs = (await blog.generateStaticParams()).map(({ slug }) => `/blog/${slug}`);
    const paths = (await learn.generateStaticParams()).map(
      ({ topic, lesson }) => `/learn/${topic}/${lesson}`,
    );

    expect(slugs.toSorted()).toEqual(posts.map((post) => post.url).toSorted());
    expect(paths.toSorted()).toEqual(lessons.map((lesson) => lesson.url).toSorted());
  });
});
