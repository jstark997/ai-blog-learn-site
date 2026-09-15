import { PostCard, type PostCardEntry } from "@/components/blog/PostCard";
import type { CardHeadingLevel } from "@/components/content/headings";
import { cn } from "@/lib/utils/cn";

/**
 * Posts in the order they were given — newest first, everywhere they are
 * listed (spec §9.1) — on the blog index and on the homepage alike.
 *
 * An ordered list, because reverse-chronological order is part of the meaning.
 * The order comes from `getAllBlogPosts`; nothing here re-sorts it.
 */
export function PostList({
  posts,
  headingLevel,
  className,
}: {
  posts: readonly PostCardEntry[];
  headingLevel?: CardHeadingLevel;
  className?: string;
}) {
  return (
    <ol className={cn("divide-y divide-rule", className)}>
      {posts.map((post) => (
        <li key={post.slug} className="py-8 first:pt-0 last:pb-0">
          <PostCard post={post} headingLevel={headingLevel} />
        </li>
      ))}
    </ol>
  );
}
