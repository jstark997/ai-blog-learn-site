/**
 * Makes a display equation reachable from the keyboard.
 *
 * A wide equation scrolls inside its own box rather than widening the reading
 * column (`.prose .katex-display` in `app/globals.css`). A box that scrolls and
 * cannot be focused is content a keyboard alone cannot read — WCAG 2.1.1 — and
 * only Chromium focuses scroll containers by itself, so the attribute has to be
 * written.
 *
 * It is written here, at build time, rather than by a component: `rehype-katex`
 * emits `<span class="katex-display">` deep inside its own markup, which no
 * entry in the prose registry can intercept. `rehype-pretty-code` already sets
 * `tabindex` on the `<pre>` it emits, so code blocks need nothing equivalent.
 *
 * No role and no label. The focusable element *is* the equation, and its MathML
 * is what a screen reader announces on landing; a `role="group"` named
 * "Equation" would put a word in front of every formula on the page. The
 * scrollable table wrapper (`components/mdx/MdxTable.tsx`) is the other case and
 * does need one, because there the focusable element is a `<div>` around the
 * table rather than the table itself.
 *
 * The node types are declared here rather than imported: `@types/hast` is not a
 * dependency of this project, and the two fields this plugin touches are a
 * smaller surface than a package.
 */

/** As much of a hast node as this plugin reads. */
type HastNode = {
  type?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: readonly HastNode[];
};

const DISPLAY_MATH_CLASS = "katex-display";

function hasDisplayMathClass(node: HastNode): boolean {
  const className = node.properties?.className;
  return Array.isArray(className) && className.includes(DISPLAY_MATH_CLASS);
}

function visit(node: HastNode): void {
  if (node.type === "element" && hasDisplayMathClass(node)) {
    node.properties = { ...node.properties, tabIndex: 0 };
    // The subtree below is KaTeX's own; nothing inside it needs the attribute.
    return;
  }

  for (const child of node.children ?? []) visit(child);
}

export function rehypeScrollableMath() {
  return (tree: HastNode): void => {
    visit(tree);
  };
}
