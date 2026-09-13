import Link from "next/link";

import type { Prerequisite } from "@/lib/content/learn";
import { cn } from "@/lib/utils/cn";

/**
 * What a reader should have read first, linked by the target lesson's own
 * title rather than by its identifier (spec §12).
 *
 * An unresolved prerequisite — one whose target is a draft the current
 * environment hides — is named but not linked. `validate:content` already
 * fails a build on a prerequisite that resolves to nothing at all, so this is
 * the development-time case, not a broken published page.
 */
export function PrerequisiteList({
  prerequisites,
  className,
}: {
  prerequisites: readonly Prerequisite[];
  className?: string;
}) {
  return (
    <nav aria-labelledby="prerequisites" className={cn("flex flex-col gap-2", className)}>
      <h2 id="prerequisites" className="text-sm font-semibold tracking-wide text-muted uppercase">
        Read first
      </h2>
      <ul className="flex flex-col gap-1">
        {prerequisites.map(({ topicId, lessonId, title }) => (
          <li key={`${topicId}/${lessonId}`}>
            {title === null ? (
              <span className="text-muted">
                {topicId}/{lessonId}
              </span>
            ) : (
              <Link
                href={`/learn/${topicId}/${lessonId}`}
                className="text-accent underline decoration-1 underline-offset-2"
              >
                {title}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
