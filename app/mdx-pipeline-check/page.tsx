/**
 * TEMPORARY — phase 3 only.
 *
 * Renders `content/_pipeline-check.mdx` so a human can confirm the whole MDX
 * chain on one page: GFM, KaTeX, Shiki in both themes, and the component
 * registry. Delete this route, and the MDX file it reads, once the blog post
 * route (phase 6) renders real content through `renderMdx`.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Metadata } from "next";

import { Container } from "@/components/layout/Container";
import { renderMdx, type MdxComponents } from "@/lib/content/mdx";

export const metadata: Metadata = {
  title: "MDX pipeline check",
  robots: { index: false, follow: false },
};

/** The "one trivial React component" the chain has to pass through (spec §15). */
function PipelineNote({ children }: { children: React.ReactNode }) {
  return (
    <aside className="rounded-lg border border-rule bg-surface p-4 text-sm text-muted">
      {children}
    </aside>
  );
}

const components: MdxComponents = { PipelineNote };

export default async function MdxPipelineCheckPage() {
  const source = await readFile(
    path.join(process.cwd(), "content", "_pipeline-check.mdx"),
    "utf8",
  );
  const content = await renderMdx({ source, components });

  return (
    <Container width="prose">
      <article className="prose">{content}</article>
    </Container>
  );
}
