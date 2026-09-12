import { cn } from "@/lib/utils/cn";

/**
 * A post's tags, shown on listings and articles (spec §35). They are labels,
 * not links: Phase 1 has no tag pages, and a link that goes nowhere is worse
 * than plain text.
 */
export function TagList({ tags, className }: { tags: readonly string[]; className?: string }) {
  return (
    <ul aria-label="Tags" className={cn("flex flex-wrap items-center gap-2", className)}>
      {tags.map((tag) => (
        <li
          key={tag}
          className="rounded-full bg-surface px-2 py-0.5 font-mono text-xs text-muted"
        >
          {tag}
        </li>
      ))}
    </ul>
  );
}
