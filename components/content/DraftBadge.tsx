import { cn } from "@/lib/utils/cn";

/**
 * Marks unpublished content wherever it is visible — in development and on
 * preview deployments, never in production (spec §16). Both the blog listing
 * and an article header carry one; the learn routes reuse it.
 *
 * The word is written in mixed case and uppercased by CSS, so a screen reader
 * announces "Draft" rather than spelling it out.
 */
export function DraftBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full border border-accent bg-accent-soft px-2.5 py-0.5 font-mono text-xs font-semibold tracking-wide text-ink uppercase",
        className,
      )}
    >
      Draft
    </span>
  );
}
