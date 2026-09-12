import type { Metadata } from "next";

import { PostCard } from "@/components/blog/PostCard";
import { Container } from "@/components/layout/Container";
import { getAllBlogPosts } from "@/lib/content/blog";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Blog",
  description: site.blogDescription,
};

/**
 * The blog index (spec §9.1): every post `getAllBlogPosts` returns, newest
 * first, generated from the filesystem. There is no hand-maintained listing,
 * and no draft filtering here — the content utility has already applied it.
 *
 * An ordered list, because reverse-chronological order is part of the meaning.
 */
export default async function BlogIndexPage() {
  const posts = await getAllBlogPosts();

  return (
    <Container width="prose" className="flex flex-col gap-10">
      <header className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Blog</h1>
        <p className="text-lg text-muted text-pretty">{site.blogDescription}</p>
      </header>

      {posts.length === 0 ? (
        <p className="text-muted">No posts published yet.</p>
      ) : (
        <ol className="divide-y divide-rule">
          {posts.map((post) => (
            <li key={post.slug} className="py-8 first:pt-0 last:pb-0">
              <PostCard post={post} />
            </li>
          ))}
        </ol>
      )}
    </Container>
  );
}
