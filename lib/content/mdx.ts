/**
 * The MDX pipeline — the one place the plugin chain is configured.
 *
 * Every piece of editorial content on this site, blog and learn alike, is
 * compiled through `renderMdx`. Compilation happens on the server at build
 * time: Shiki highlights code and KaTeX typesets mathematics while the page is
 * being generated, so neither a highlighter nor a formula renderer is shipped
 * to the browser (spec §19, §20, §30).
 *
 * Frontmatter is stripped here but deliberately not returned. Discovering,
 * parsing and validating frontmatter is the content utilities' job — they read
 * it with gray-matter and validate it with Zod before a page ever asks for
 * rendered MDX.
 */
import { compileMDX, type MDXRemoteProps } from "next-mdx-remote/rsc";
import rehypeKatex from "rehype-katex";
import rehypePrettyCode, { type Options as PrettyCodeOptions } from "rehype-pretty-code";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { ReactElement } from "react";

/**
 * The shape of an MDX component registry (spec §15). `proseComponents` and
 * `demoComponents` both satisfy it.
 */
export type MdxComponents = NonNullable<MDXRemoteProps["components"]>;

/**
 * Dual-theme highlighting (spec §19). Shiki emits both colour sets as
 * `--shiki-light` / `--shiki-dark` custom properties on every token and CSS
 * picks between them, so switching theme re-highlights nothing.
 *
 * `keepBackground: false` drops Shiki's own background so code blocks sit on
 * the site's surface token; the rules in `app/globals.css` supply the rest.
 * A fence with no language, or with one Shiki does not know, falls back to
 * plain text rather than failing the build.
 */
const prettyCodeOptions: PrettyCodeOptions = {
  theme: { light: "github-light", dark: "github-dark" },
  keepBackground: false,
  defaultLang: { block: "plaintext" },
};

export type RenderMdxOptions = {
  /** Raw MDX. Frontmatter, if present, is stripped rather than rendered. */
  source: string;
  /** The registry this content may use. Anything absent from it is an error. */
  components?: MdxComponents;
};

/**
 * Compiles MDX to a server-rendered React element.
 *
 * MDX files may not import anything: `next-mdx-remote` strips imports and
 * exports, and components reach the content only through `components`.
 */
export async function renderMdx({
  source,
  components = {},
}: RenderMdxOptions): Promise<ReactElement> {
  const { content } = await compileMDX({
    source,
    components,
    options: {
      parseFrontmatter: true,
      // Content is authored in this repository and reviewed in pull requests,
      // not fetched from anywhere untrusted. The v6 default strips every MDX
      // expression, including the attribute values a demo needs
      // (`<GradientDescentDemo learningRate={0.1} />`), so it is turned off.
      blockJS: false,
      blockDangerousJS: true,
      mdxOptions: {
        remarkPlugins: [remarkGfm, remarkMath],
        rehypePlugins: [rehypeKatex, [rehypePrettyCode, prettyCodeOptions]],
      },
    },
  });

  return content;
}
