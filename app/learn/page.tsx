import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { LessonList } from "@/components/lesson/LessonList";
import { getAllLessons } from "@/lib/content/learn";
import { learningTopics } from "@/lib/content/topics";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = pageMetadata({
  path: "/learn",
  title: "Learn",
  description: site.learnDescription,
});

/**
 * The Learn index (spec §11.1): every visible lesson, grouped by topic in
 * `topics.ts` order and ordered within each topic.
 *
 * Topics come from `learningTopics` and lessons from the filesystem; the two
 * meet only here. A topic with nothing visible in it — every lesson still a
 * draft — is left out rather than shown as an empty heading, which is also why
 * `/learn/<that topic>` 404s.
 */
export default async function LearnIndexPage() {
  const lessons = await getAllLessons();

  const groups = learningTopics
    .toSorted((a, b) => a.order - b.order)
    .map((topic) => ({
      topic,
      lessons: lessons.filter((lesson) => lesson.topicId === topic.id),
    }))
    .filter((group) => group.lessons.length > 0);

  return (
    <Container width="prose" className="flex flex-col gap-12">
      <header className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Learn</h1>
        <p className="text-lg text-muted text-pretty">{site.learnDescription}</p>
      </header>

      {groups.length === 0 ? (
        <p className="text-muted">No lessons published yet.</p>
      ) : (
        groups.map(({ topic, lessons: topicLessons }) => (
          <section key={topic.id} aria-labelledby={`topic-${topic.id}`} className="flex flex-col gap-4">
            <h2 id={`topic-${topic.id}`} className="text-2xl font-semibold tracking-tight">
              <Link href={`/learn/${topic.id}`} className="text-ink transition-colors hover:text-accent">
                {topic.title}
              </Link>
            </h2>
            {topic.description !== undefined && (
              <p className="text-muted text-pretty">{topic.description}</p>
            )}
            <LessonList lessons={topicLessons} headingLevel="h3" className="mt-2" />
          </section>
        ))
      )}
    </Container>
  );
}
