import Link from "next/link";

import { PostList } from "@/components/blog/PostList";
import { PlaceholderNote } from "@/components/content/PlaceholderNote";
import { HomeSection } from "@/components/home/HomeSection";
import { Container } from "@/components/layout/Container";
import { LessonList } from "@/components/lesson/LessonList";
import { getFeaturedLessons, getRecentPosts } from "@/lib/content/homepage";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

/**
 * No `title`: the homepage wants the root layout's `title.default`, which is
 * the site's name. Giving it one would put that name through the `%s · site`
 * template and print it twice (spec §25).
 */
export const metadata = pageMetadata({ path: "/", description: site.description });

/**
 * The homepage (spec §8): the hero, the most recent posts, the featured
 * lessons, and the Blog/Learn distinction in a sentence each.
 *
 * Both listings are read from the repository at build time, so publishing a
 * post changes this page and nobody edits it (spec §34). Drafts are absent for
 * the usual reason: the content utilities dropped them before this route saw
 * them, and nothing here filters anything itself (spec §16).
 *
 * A section with nothing in it is left out rather than shown as an empty
 * heading — the same rule the Learn index applies to an empty topic.
 *
 * Copy comes from `lib/site.ts` and the featured selection from
 * `lib/content/homepage.ts`; this file chooses no words of its own (spec §8.1).
 */
export default async function HomePage() {
  const [posts, lessons] = await Promise.all([getRecentPosts(), getFeaturedLessons()]);
  const { home } = site;

  return (
    <Container width="prose" className="flex flex-col gap-16">
      <div className="flex flex-col gap-5">
        <h1 className="text-4xl font-semibold tracking-tight text-balance">{site.name}</h1>
        <p className="text-lg text-muted text-pretty">{site.description}</p>
        <p className="text-pretty">{home.positioning}</p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/blog"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-opacity hover:opacity-90"
          >
            {home.blogCta}
          </Link>
          <Link
            href="/learn"
            className="rounded-md border border-control px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface"
          >
            {home.learnCta}
          </Link>
        </div>
      </div>

      {posts.length > 0 && (
        <HomeSection
          id="recent"
          heading={home.recent.heading}
          action={{ href: "/blog", label: home.recent.linkLabel }}
        >
          <PostList posts={posts} headingLevel="h3" />
        </HomeSection>
      )}

      {lessons.length > 0 && (
        <HomeSection
          id="featured"
          heading={home.featured.heading}
          description={home.featured.description}
          action={{ href: "/learn", label: home.featured.linkLabel }}
        >
          <LessonList lessons={lessons} headingLevel="h3" />
        </HomeSection>
      )}

      <HomeSection id="introduction" heading={home.introduction.heading}>
        <dl className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <dt className="font-semibold">
              <Link href="/blog" className="text-ink transition-colors hover:text-accent">
                Blog
              </Link>
            </dt>
            <dd className="text-muted text-pretty">{home.introduction.blog}</dd>
          </div>
          <div className="flex flex-col gap-2">
            <dt className="font-semibold">
              <Link href="/learn" className="text-ink transition-colors hover:text-accent">
                Learn
              </Link>
            </dt>
            <dd className="text-muted text-pretty">{home.introduction.learn}</dd>
          </div>
        </dl>
      </HomeSection>

      <PlaceholderNote>
        The hero copy and the featured selection are scaffolding (spec &sect;3.1). They live in{" "}
        <code className="font-mono text-xs">lib/site.ts</code> and{" "}
        <code className="font-mono text-xs">lib/content/homepage.ts</code>; the author replaces
        them there, with no change to this page.
      </PlaceholderNote>
    </Container>
  );
}
