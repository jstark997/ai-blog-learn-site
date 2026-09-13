import { LessonCard, type CardHeadingLevel, type LessonCardEntry } from "@/components/lesson/LessonCard";
import { cn } from "@/lib/utils/cn";

/**
 * A topic's lessons in reading order (spec §13), on the Learn index and on a
 * topic overview alike.
 *
 * An ordered list, because the sequence is part of the meaning: these are
 * lesson one, two and three of a topic, not an unordered set. The order comes
 * from `getLessonsByTopic`; nothing here re-sorts it.
 */
export function LessonList({
  lessons,
  headingLevel,
  className,
}: {
  lessons: readonly LessonCardEntry[];
  headingLevel?: CardHeadingLevel;
  className?: string;
}) {
  return (
    <ol className={cn("divide-y divide-rule", className)}>
      {lessons.map((lesson) => (
        <li key={`${lesson.topicId}/${lesson.lessonId}`} className="py-6 first:pt-0 last:pb-0">
          <LessonCard lesson={lesson} headingLevel={headingLevel} />
        </li>
      ))}
    </ol>
  );
}
