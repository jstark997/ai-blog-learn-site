import { getAllBlogPosts } from "@/lib/content/blog";
import { buildRssFeed } from "@/lib/feed";

/**
 * `/rss.xml` — the feed of published posts (spec §25).
 *
 * `force-static` because this is content, not a request: `GET` handlers are
 * dynamic by default from Next 15 onwards, and without it the feed would be
 * rebuilt per request for a file whose every input is a checked-in `.mdx`.
 *
 * The route is thin on purpose. Which posts exist is `lib/content/blog.ts`'s
 * answer, the XML is `lib/feed.ts`'s — including dropping the drafts, which is
 * done there so the rule cannot be lost by a caller (spec §16).
 */
export const dynamic = "force-static";

export async function GET(): Promise<Response> {
  const posts = await getAllBlogPosts();

  return new Response(buildRssFeed(posts), {
    headers: { "content-type": "application/rss+xml; charset=utf-8" },
  });
}
