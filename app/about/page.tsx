import type { Metadata } from "next";

import { Container } from "@/components/layout/Container";
import { proseComponents } from "@/components/mdx/registry";
import { renderMdx } from "@/lib/content/mdx";
import { getPage } from "@/lib/content/pages";
import { formatDate } from "@/lib/utils/date";

/** The page id, and so the file: `content/pages/about.mdx` (spec §24). */
const PAGE_ID = "about";

export async function generateMetadata(): Promise<Metadata> {
  const { metadata } = await getPage(PAGE_ID);

  return {
    title: metadata.title,
    description: metadata.description,
  };
}

/**
 * The about page (spec §24), authored in MDX so it goes through the same
 * pipeline, the same registry and the same validation as every essay and lesson.
 * Editing it is editing one file in `content/`; this route holds no copy of its
 * own.
 *
 * The prose registry and nothing else, as on an article page: the about page may
 * use `Callout`, `Figure`, `Equation` and `ExternalLink`, and naming a lesson
 * demo here would fail the build rather than ship an interactive component to a
 * page that has no use for one (spec §15).
 */
export default async function AboutPage() {
  const { metadata, content: source } = await getPage(PAGE_ID);
  const content = await renderMdx({ source, components: proseComponents });

  return (
    <Container width="prose">
      <article>
        <header className="flex flex-col gap-4 border-b border-rule pb-8">
          <h1 className="text-4xl font-semibold tracking-tight text-balance">{metadata.title}</h1>
          <p className="text-lg text-muted text-pretty">{metadata.description}</p>
          {metadata.updatedAt !== undefined && (
            <p className="text-sm text-muted">
              Updated{" "}
              <time dateTime={metadata.updatedAt}>{formatDate(metadata.updatedAt)}</time>
            </p>
          )}
        </header>
        <div className="prose mt-10">{content}</div>
      </article>
    </Container>
  );
}
