import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DraftBadge } from "@/components/content/DraftBadge";
import { Container } from "@/components/layout/Container";
import { demoComponents } from "@/components/learn/registry";
import { LessonMeta } from "@/components/lesson/LessonMeta";
import { PrerequisiteList } from "@/components/lesson/PrerequisiteList";
import { proseComponents } from "@/components/mdx/registry";
import { LessonPager } from "@/components/navigation/LessonPager";
import { TopicLessonNav } from "@/components/navigation/TopicLessonNav";
import {
  getAdjacentLessons,
  getAllLessons,
  getLessonByPath,
  getLessonsByTopic,
  getPrerequisites,
} from "@/lib/content/learn";
import { renderMdx } from "@/lib/content/mdx";
import { getTopic } from "@/lib/content/topics";

/**
 * What a lesson's MDX may use (spec §15): the prose components every page has,
 * plus this topic's interactive demonstrations. Built once, at module scope,
 * rather than per request.
 *
 * The demos are spread second, so a demo cannot be shadowed by a prose
 * component that happens to share its name. Every demo is wrapped in
 * `next/dynamic` inside its registry, which is what keeps the JavaScript of a
 * demo out of the lessons that do not embed it.
 */
const lessonComponents = { ...proseComponents, ...demoComponents };

/**
 * As on the article route: `generateStaticParams` alone would not keep a draft
 * out, because Next defaults `dynamicParams` to `true` and would render an
 * unlisted pair on demand. The `notFound()` guard below is the second defence
 * the specification asks for (spec §16).
 */
export const dynamicParams = false;

export async function generateStaticParams() {
  const lessons = await getAllLessons();

  return lessons.map((lesson) => ({ topic: lesson.topicId, lesson: lesson.lessonId }));
}

export async function generateMetadata({
  params,
}: PageProps<"/learn/[topic]/[lesson]">): Promise<Metadata> {
  // `params` is a Promise in Next 16.
  const { topic: topicId, lesson: lessonId } = await params;
  const lesson = await getLessonByPath(topicId, lessonId);
  if (lesson === null) return {};

  const { metadata } = lesson;
  return {
    title: metadata.title,
    description: metadata.description,
    // A visible draft is on a preview deployment or a development server; it is
    // still not something a crawler should index. Canonical URLs, the sitemap
    // and the feed are phase 16 (spec §25).
    robots: metadata.draft ? { index: false, follow: false } : undefined,
    openGraph: {
      type: "article",
      title: metadata.title,
      description: metadata.description,
      publishedTime: metadata.publishedAt,
      modifiedTime: metadata.updatedAt,
    },
  };
}

/**
 * One lesson (spec §11.2, §11.3). `getLessonByPath` returns `null` for a
 * lesson that does not exist *and* for a draft while drafts are hidden, so both
 * 404 through the same guard.
 *
 * The page template owns the `<h1>`; the MDX body starts its headings at `##`
 * (spec §12). It renders with both registries, `proseComponents` first so a
 * demo could never be shadowed by a prose component of the same name (spec
 * §15). Each demo is lazily imported, so a lesson downloads only the demos it
 * embeds; a lesson with none downloads no demo JavaScript at all.
 *
 * Navigation is built from metadata and never from the MDX (spec §13): the
 * sidebar lists the topic, the pager carries the neighbours, and both come from
 * the same draft-filtered ordering, so neither can offer a link to a lesson
 * this environment hides. A topic the presentation table does not declare is a
 * `validate:content` failure and so cannot reach a build; while `pnpm dev` is
 * showing one, the directory name stands in for the title.
 */
export default async function LessonPage({ params }: PageProps<"/learn/[topic]/[lesson]">) {
  const { topic: topicId, lesson: lessonId } = await params;
  const lesson = await getLessonByPath(topicId, lessonId);
  if (lesson === null) notFound();

  const { metadata } = lesson;
  const [prerequisites, content, siblings, adjacent] = await Promise.all([
    getPrerequisites(metadata.prerequisites),
    renderMdx({ source: lesson.content, components: lessonComponents }),
    getLessonsByTopic(topicId),
    getAdjacentLessons(topicId, lessonId),
  ]);

  return (
    <Container className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-12">
      <TopicLessonNav
        topicId={topicId}
        topicTitle={getTopic(topicId)?.title ?? topicId}
        lessons={siblings}
        currentLessonId={lessonId}
        className="mb-10 lg:sticky lg:top-8 lg:mb-0"
      />

      <div className="min-w-0 max-w-measure">
        <article>
          <header className="flex flex-col gap-4 border-b border-rule pb-8">
            {metadata.draft && <DraftBadge />}
            <h1 className="text-4xl font-semibold tracking-tight text-balance">{metadata.title}</h1>
            <p className="text-lg text-muted text-pretty">{metadata.description}</p>
            <LessonMeta metadata={metadata} />
            {prerequisites.length > 0 && (
              <PrerequisiteList prerequisites={prerequisites} className="mt-2" />
            )}
          </header>
          <div className="prose mt-10">{content}</div>
        </article>

        <LessonPager
          previous={adjacent.previous}
          next={adjacent.next}
          className="mt-16 border-t border-rule pt-8"
        />
      </div>
    </Container>
  );
}
