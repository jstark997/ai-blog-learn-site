import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DraftBadge } from "@/components/content/DraftBadge";
import { Container } from "@/components/layout/Container";
import { LessonMeta } from "@/components/lesson/LessonMeta";
import { PrerequisiteList } from "@/components/lesson/PrerequisiteList";
import { getAllLessons, getLessonByPath, getPrerequisites } from "@/lib/content/learn";
import { renderMdx } from "@/lib/content/mdx";

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
 * (spec §12). It renders with no component registry yet — `proseComponents` and
 * `demoComponents` arrive in phase 10 (spec §15) — and the topic, previous and
 * next links are phase 9.
 */
export default async function LessonPage({ params }: PageProps<"/learn/[topic]/[lesson]">) {
  const { topic: topicId, lesson: lessonId } = await params;
  const lesson = await getLessonByPath(topicId, lessonId);
  if (lesson === null) notFound();

  const { metadata } = lesson;
  const [prerequisites, content] = await Promise.all([
    getPrerequisites(metadata.prerequisites),
    renderMdx({ source: lesson.content }),
  ]);

  return (
    <Container width="prose">
      <article>
        <header className="flex flex-col gap-4 border-b border-rule pb-8">
          {metadata.draft && <DraftBadge />}
          <h1 className="text-4xl font-semibold tracking-tight text-balance">{metadata.title}</h1>
          <p className="text-lg text-muted text-pretty">{metadata.description}</p>
          <LessonMeta metadata={metadata} />
          {prerequisites.length > 0 && <PrerequisiteList prerequisites={prerequisites} className="mt-2" />}
        </header>
        <div className="prose mt-10">{content}</div>
      </article>
    </Container>
  );
}
