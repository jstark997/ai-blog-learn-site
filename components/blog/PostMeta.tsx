import { TagList } from "@/components/blog/TagList";
import type { BlogPostMetadata } from "@/lib/content/schemas";
import { formatDate } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

/**
 * The dates and tags of a post, in one row, shared by the listing and the
 * article header so the two cannot drift apart (spec §9.1, §9.2).
 *
 * `updatedAt` is shown whenever the frontmatter carries it. The `<time>`
 * elements keep the machine-readable ISO value alongside the readable one.
 */
export function PostMeta({
  metadata,
  className,
}: {
  metadata: BlogPostMetadata;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted", className)}
    >
      <time dateTime={metadata.publishedAt}>{formatDate(metadata.publishedAt)}</time>
      {metadata.updatedAt !== undefined && (
        <span>
          Updated <time dateTime={metadata.updatedAt}>{formatDate(metadata.updatedAt)}</time>
        </span>
      )}
      {metadata.tags.length > 0 && <TagList tags={metadata.tags} />}
    </div>
  );
}
