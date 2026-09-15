import Link from "next/link";

import { PostMeta } from "@/components/blog/PostMeta";
import { DraftBadge } from "@/components/content/DraftBadge";
import type { CardHeadingLevel } from "@/components/content/headings";
import type { BlogPost } from "@/lib/content/blog";

export type PostCardEntry = Pick<BlogPost, "slug" | "metadata">;

/**
 * One entry in a blog listing: title, description, dates and tags (spec §9.1),
 * with a `DRAFT` badge when an unpublished post is visible (spec §16).
 *
 * It takes metadata only, never the MDX body — a listing renders no article
 * content, so nothing here compiles MDX.
 *
 * `headingLevel` exists because the same card appears under an `<h1>` on the
 * blog index and under a section's `<h2>` on the homepage.
 */
export function PostCard({
  post,
  headingLevel: Heading = "h2",
}: {
  post: PostCardEntry;
  headingLevel?: CardHeadingLevel;
}) {
  const { slug, metadata } = post;

  return (
    <article className="flex flex-col gap-3">
      {metadata.draft && <DraftBadge />}
      <Heading className="text-xl font-semibold tracking-tight text-balance">
        <Link href={`/blog/${slug}`} className="text-ink transition-colors hover:text-accent">
          {metadata.title}
        </Link>
      </Heading>
      <p className="text-muted text-pretty">{metadata.description}</p>
      <PostMeta metadata={metadata} />
    </article>
  );
}
