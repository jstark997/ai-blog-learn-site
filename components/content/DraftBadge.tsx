import { cn } from "@/lib/utils/cn";

/**
 * Marks unpublished content wherever it is visible — in development and on
 * preview deployments, never in production (spec §16).
 *
 * Every place a draft can be seen renders this one component rather than a
 * marker of its own: an article header, a lesson header, both listing cards,
 * the topic sidebar, the lesson pager, and a prerequisite whose target is a
 * draft. One definition is what makes "unmistakable" checkable — the phase 15
 * audit asserts this badge is present, and a second spelling of the word
 * somewhere else would pass a badge test while looking like nothing much.
 *
 * `size="sm"` is the compact form for the places a full pill would crowd a line
 * of text: the sidebar list and the prerequisites.
 *
 * The word is written in mixed case and uppercased by CSS, so a screen reader
 * announces "Draft" rather than spelling it out.
 */
export function DraftBadge({
  size = "md",
  className,
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center border border-accent font-mono text-xs font-semibold tracking-wide text-ink uppercase",
        size === "md" ? "rounded-full bg-accent-soft px-2.5 py-0.5" : "rounded px-1",
        className,
      )}
    >
      Draft
    </span>
  );
}
