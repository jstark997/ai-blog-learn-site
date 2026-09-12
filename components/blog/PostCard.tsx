import Link from "next/link";

import { PostMeta } from "@/components/blog/PostMeta";
import { DraftBadge } from "@/components/content/DraftBadge";
import type { BlogPost } from "@/lib/content/blog";

/**
 * One entry in the blog index: title, description, dates and tags (spec §9.1),
 * with a `DRAFT` badge when an unpublished post is visible (spec §16).
 *
 * It takes metadata only, never the MDX body — a listing renders no article
 * content, so nothing here compiles MDX.
 */
export function PostCard({ post }: { post: Pick<BlogPost, "slug" | "metadata"> }) {
  const { slug, metadata } = post;

  return (
    <article className="flex flex-col gap-3">
      {metadata.draft && <DraftBadge />}
      <h2 className="text-xl font-semibold tracking-tight text-balance">
        <Link href={`/blog/${slug}`} className="text-ink transition-colors hover:text-accent">
          {metadata.title}
        </Link>
      </h2>
      <p className="text-muted text-pretty">{metadata.description}</p>
      <PostMeta metadata={metadata} />
    </article>
  );
}
