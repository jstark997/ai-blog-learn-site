import Link from "next/link";

import type { Lesson } from "@/lib/content/learn";
import { cn } from "@/lib/utils/cn";

/** Enough of a lesson to link to it; `getAdjacentLessons` returns a superset. */
export type PagerEntry = Pick<Lesson, "topicId" | "lessonId" | "metadata">;

type Direction = "previous" | "next";

const labels: Record<Direction, string> = {
  previous: "Previous",
  next: "Next",
};

/**
 * One end of the pager. The direction is part of the link's accessible name —
 * "Previous Gradient Descent" — because the eyebrow above the title is the
 * only thing distinguishing the two, and colour and position do not reach
 * someone listening to the page (spec §28).
 */
function PagerLink({ lesson, direction }: { lesson: PagerEntry; direction: Direction }) {
  const isNext = direction === "next";

  return (
    <Link
      href={`/learn/${lesson.topicId}/${lesson.lessonId}`}
      rel={isNext ? "next" : "prev"}
      className={cn(
        "flex h-full flex-col gap-1 rounded-lg border border-rule p-4",
        "transition-colors hover:border-accent hover:bg-surface",
        isNext && "text-right",
      )}
    >
      <span className="text-xs font-semibold tracking-wide text-muted uppercase">
        {labels[direction]}
      </span>
      <span className="font-medium text-ink text-pretty">{lesson.metadata.title}</span>
    </Link>
  );
}

/**
 * The lessons either side of this one, at the foot of a lesson (spec §13).
 *
 * Both neighbours come from `getAdjacentLessons`, which computes them from the
 * visible lessons of the topic: a draft is never a "next", and at the first or
 * last lesson of a topic the corresponding side is simply absent. Nothing here
 * knows the order — it is metadata, and no URL is written into MDX.
 *
 * `col-start` keeps a lone "next" on the right, where it would be if a
 * "previous" preceded it, so the arrangement does not shift between lessons.
 */
export function LessonPager({
  previous,
  next,
  className,
}: {
  previous: PagerEntry | null;
  next: PagerEntry | null;
  className?: string;
}) {
  if (previous === null && next === null) return null;

  return (
    <nav aria-label="Previous and next lessons" className={className}>
      <ul className="grid gap-4 sm:grid-cols-2">
        {previous !== null && (
          <li className="sm:col-start-1">
            <PagerLink lesson={previous} direction="previous" />
          </li>
        )}
        {next !== null && (
          <li className="sm:col-start-2">
            <PagerLink lesson={next} direction="next" />
          </li>
        )}
      </ul>
    </nav>
  );
}
