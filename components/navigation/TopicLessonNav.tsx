"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";

import { DraftBadge } from "@/components/content/DraftBadge";
import type { Lesson } from "@/lib/content/learn";
import { cn } from "@/lib/utils/cn";

/** Enough of a lesson to list it; the page passes the visible ones straight in. */
export type TopicNavEntry = Pick<Lesson, "lessonId" | "metadata">;

/**
 * A topic's lessons alongside the lesson being read (spec §13, §23): the way
 * back to the topic overview, then every lesson of the topic in reading order
 * with the current one marked.
 *
 * One element, two shapes. From `lg` up it is a sidebar and the list is always
 * open; below it the list collapses behind a disclosure button, which is the
 * simplest of the small-screen options the specification offers. The breakpoint
 * is expressed in CSS rather than in JavaScript, so the server renders the same
 * markup for both and no viewport is guessed during hydration.
 *
 * Because the collapsed panel is hidden with `display: none`, its links leave
 * the tab order and the accessibility tree while it is closed — the same
 * guarantee `MobileNav` gets from the `hidden` attribute, which cannot be used
 * here: the panel must stay visible on a wide screen whatever the button says.
 *
 * The order is `getLessonsByTopic`'s, which is `order` ascending with the
 * drafts already removed. Nothing here sorts, and no lesson's URL is written
 * anywhere but here and `LessonCard` — both from the two ids.
 *
 * A draft reaches this list only where drafts are visible at all, and carries
 * the same `DraftBadge` every other listing uses (spec §16).
 */
export function TopicLessonNav({
  topicId,
  topicTitle,
  lessons,
  currentLessonId,
  className,
}: {
  topicId: string;
  topicTitle: string;
  lessons: readonly TopicNavEntry[];
  currentLessonId: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  function close() {
    setIsOpen(false);
  }

  return (
    <nav
      aria-label={`${topicTitle} lessons`}
      className={cn("flex flex-col gap-3", className)}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !isOpen) return;
        close();
        buttonRef.current?.focus();
      }}
    >
      <Link
        href={`/learn/${topicId}`}
        className="flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-accent"
      >
        <span aria-hidden="true">&larr;</span>
        <span>
          <span className="sr-only">Back to</span>{" "}
          {topicTitle}
        </span>
      </Link>

      {/* The button exists only below `lg`; above it the panel is open anyway. */}
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border border-rule px-3 py-2",
          "text-sm font-medium text-ink transition-colors hover:border-accent lg:hidden",
        )}
      >
        Lessons
        <ChevronIcon isOpen={isOpen} />
      </button>

      <ol
        id={panelId}
        className={cn("flex-col gap-0.5", isOpen ? "flex" : "hidden", "lg:flex")}
      >
        {lessons.map((lesson, index) => {
          const isCurrent = lesson.lessonId === currentLessonId;

          return (
            <li key={lesson.lessonId}>
              <Link
                href={`/learn/${topicId}/${lesson.lessonId}`}
                // The one signal that does not depend on seeing the colour.
                aria-current={isCurrent ? "page" : undefined}
                onClick={close}
                className={cn(
                  "flex items-baseline gap-3 rounded-md border-l-2 px-3 py-2 text-sm transition-colors",
                  isCurrent
                    ? "border-accent bg-accent-soft font-medium text-accent"
                    : "border-transparent text-muted hover:border-rule hover:text-ink",
                )}
              >
                <span aria-hidden="true" className="font-mono text-xs tabular-nums">
                  {index + 1}
                </span>
                <span className="text-pretty">
                  {lesson.metadata.title}
                  {lesson.metadata.draft && (
                    <>
                      {" "}
                      <DraftBadge size="sm" className="ml-1" />
                    </>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-4 transition-transform", isOpen && "rotate-180")}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
