import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { LessonList } from "@/components/lesson/LessonList";
import { getAllLessons, getLessonsByTopic } from "@/lib/content/learn";
import { getTopic } from "@/lib/content/topics";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

/**
 * Only the topics `generateStaticParams` returns may be rendered, for the same
 * reason the article route pins it: Next would otherwise render an unknown
 * segment on demand (spec §16).
 */
export const dynamicParams = false;

/**
 * The topics that have something to show. Derived from the lessons rather than
 * from `topics.ts`, so a topic whose every lesson is still a draft is not
 * generated in production — and 404s instead of rendering an empty page.
 */
export async function generateStaticParams() {
  const lessons = await getAllLessons();
  const topicIds = new Set(lessons.map((lesson) => lesson.topicId));

  return [...topicIds].map((topic) => ({ topic }));
}

export async function generateMetadata({
  params,
}: PageProps<"/learn/[topic]">): Promise<Metadata> {
  // `params` is a Promise in Next 16.
  const { topic: topicId } = await params;
  const topic = getTopic(topicId);
  if (topic === undefined) return {};

  return pageMetadata({
    path: `/learn/${topicId}`,
    title: topic.title,
    // A topic's blurb is optional in `topics.ts`; the section's own
    // description stands in rather than leaving the page without one.
    description: topic.description ?? site.learnDescription,
  });
}

/**
 * A topic overview (spec §11.2): the topic's own description, then its lessons
 * in reading order with theirs.
 *
 * The route is required rather than optional — phase 9's "back to topic" link
 * needs a destination — and it 404s on a directory `topics.ts` does not
 * declare, on a topic that does not exist, and on one with no visible lesson.
 */
export default async function TopicPage({ params }: PageProps<"/learn/[topic]">) {
  const { topic: topicId } = await params;
  const topic = getTopic(topicId);
  const lessons = await getLessonsByTopic(topicId);
  if (topic === undefined || lessons.length === 0) notFound();

  return (
    <Container width="prose" className="flex flex-col gap-10">
      <header className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">{topic.title}</h1>
        {topic.description !== undefined && (
          <p className="text-lg text-muted text-pretty">{topic.description}</p>
        )}
      </header>

      <LessonList lessons={lessons} headingLevel="h2" />
    </Container>
  );
}
