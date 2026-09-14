/**
 * The prose registry (spec §15): the components every MDX file may use, blog
 * and learn alike.
 *
 * MDX files import nothing. A component reaches the content only by being
 * named here, and anything an MDX file names that is absent from the registry
 * it was rendered with is a build error rather than a silently empty element.
 *
 * Everything in here is server-rendered and holds no state, so a page that uses
 * only these components ships no component JavaScript at all (spec §30). The
 * interactive demonstrations live in the second registry,
 * `components/learn/registry.ts`, which lesson pages add and article pages do
 * not.
 *
 * The lower-case keys override the HTML tags markdown itself produces; the
 * capitalised ones are written as JSX by the author. Tags with no entry here —
 * headings, lists, code, blockquotes — are styled by the `.prose` rules in
 * `app/globals.css` and need no component.
 */
import { Callout } from "@/components/mdx/Callout";
import { Equation } from "@/components/mdx/Equation";
import { ExternalLink } from "@/components/mdx/ExternalLink";
import { Figure } from "@/components/mdx/Figure";
import { MdxImage } from "@/components/mdx/MdxImage";
import { MdxLink } from "@/components/mdx/MdxLink";
import { MdxTable } from "@/components/mdx/MdxTable";
import type { MdxComponents } from "@/lib/content/mdx";

export const proseComponents = {
  Callout,
  Figure,
  Equation,
  ExternalLink,
  a: MdxLink,
  img: MdxImage,
  table: MdxTable,
} satisfies MdxComponents;
