import Link from "next/link";

import { DraftBadge } from "@/components/content/DraftBadge";
import { LessonMeta } from "@/components/lesson/LessonMeta";
import type { Lesson } from "@/lib/content/learn";

/** The heading a card renders, set by the page so the outline stays correct. */
export type CardHeadingLevel = "h2" | "h3";

export type LessonCardEntry = Pick<Lesson, "topicId" | "lessonId" | "metadata">;

/**
 * One entry in a lesson listing: title, description, difficulty and dates
 * (spec §11.1, §11.2), with a `DRAFT` badge when an unpublished lesson is
 * visible (spec §16).
 *
 * The route is built from the two ids, never from frontmatter — the directory
 * and the filename are the only source of a lesson's URL (spec §11.1).
 *
 * `headingLevel` exists because the same card appears under an `<h1>` on a
 * topic page and under a topic's `<h2>` on the Learn index; a fixed level would
 * skip a rank on one of them.
 */
export function LessonCard({
  lesson,
  headingLevel: Heading = "h2",
}: {
  lesson: LessonCardEntry;
  headingLevel?: CardHeadingLevel;
}) {
  const { topicId, lessonId, metadata } = lesson;

  return (
    <article className="flex flex-col gap-3">
      {metadata.draft && <DraftBadge />}
      <Heading className="text-xl font-semibold tracking-tight text-balance">
        <Link
          href={`/learn/${topicId}/${lessonId}`}
          className="text-ink transition-colors hover:text-accent"
        >
          {metadata.title}
        </Link>
      </Heading>
      <p className="text-muted text-pretty">{metadata.description}</p>
      <LessonMeta metadata={metadata} />
    </article>
  );
}
