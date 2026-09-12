import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PostMeta } from "@/components/blog/PostMeta";
import { DraftBadge } from "@/components/content/DraftBadge";
import { Container } from "@/components/layout/Container";
import { getAllBlogPosts, getBlogPostBySlug } from "@/lib/content/blog";
import { renderMdx } from "@/lib/content/mdx";

/**
 * Only the slugs `generateStaticParams` returns may be rendered. Next defaults
 * this to `true` and would otherwise render an unknown — or draft — slug on
 * demand, which is exactly the leak spec §16 asks for two defences against.
 * The second is the `notFound()` guard below.
 */
export const dynamicParams = false;

export async function generateStaticParams() {
  const posts = await getAllBlogPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/blog/[slug]">): Promise<Metadata> {
  // `params` is a Promise in Next 16.
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (post === null) return {};

  const { metadata } = post;
  return {
    title: metadata.title,
    description: metadata.description,
    // A visible draft is on a preview deployment or a development server; it is
    // still not something a crawler should index. Canonical URLs, the sitemap
    // and the feed are phase 16 (spec §25).
    robots: metadata.draft ? { index: false, follow: false } : undefined,
    openGraph: {
      type: "article",
      title: metadata.title,
      description: metadata.description,
      publishedTime: metadata.publishedAt,
      modifiedTime: metadata.updatedAt,
      tags: metadata.tags,
    },
  };
}

/**
 * One article (spec §9.2). `getBlogPostBySlug` returns `null` for a post that
 * does not exist *and* for a draft while drafts are hidden, so both 404 through
 * the same guard.
 *
 * The MDX body is compiled here, on the server, at build time. It renders with
 * no component registry yet: `proseComponents` arrives in phase 10 (spec §15),
 * and demos never reach a blog page.
 */
export default async function BlogPostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (post === null) notFound();

  const { metadata } = post;
  const content = await renderMdx({ source: post.content });

  return (
    <Container width="prose">
      <article>
        <header className="flex flex-col gap-4 border-b border-rule pb-8">
          {metadata.draft && <DraftBadge />}
          <h1 className="text-4xl font-semibold tracking-tight text-balance">{metadata.title}</h1>
          <p className="text-lg text-muted text-pretty">{metadata.description}</p>
          <PostMeta metadata={metadata} />
        </header>
        <div className="prose mt-10">{content}</div>
      </article>
    </Container>
  );
}
