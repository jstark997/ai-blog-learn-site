import type { LessonMetadata } from "@/lib/content/schemas";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/date";

/** `"beginner"` → `"Beginner"`. The schema fixes the set of values. */
function readableDifficulty(difficulty: NonNullable<LessonMetadata["difficulty"]>): string {
  return difficulty[0].toUpperCase() + difficulty.slice(1);
}

/**
 * The difficulty and dates of a lesson, in one row, shared by the topic
 * listings and the lesson header so the two cannot drift apart (spec §11, §12).
 *
 * `difficulty` and `updatedAt` are optional in the schema and simply absent
 * when the frontmatter omits them. The word "Beginner" on its own would be
 * ambiguous out of context, so the level carries a visually hidden label for
 * anyone listening to the page rather than looking at it.
 */
export function LessonMeta({
  metadata,
  className,
}: {
  metadata: LessonMetadata;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted", className)}
    >
      {metadata.difficulty !== undefined && (
        <span className="rounded-full bg-surface px-2 py-0.5 font-mono text-xs">
          <span className="sr-only">Difficulty: </span>
          {readableDifficulty(metadata.difficulty)}
        </span>
      )}
      <time dateTime={metadata.publishedAt}>{formatDate(metadata.publishedAt)}</time>
      {metadata.updatedAt !== undefined && (
        <span>
          Updated <time dateTime={metadata.updatedAt}>{formatDate(metadata.updatedAt)}</time>
        </span>
      )}
    </div>
  );
}
