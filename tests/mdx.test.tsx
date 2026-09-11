// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { renderMdx, type MdxComponents } from "@/lib/content/mdx";

/** Compiles MDX through the real pipeline and returns the HTML it produces. */
async function render(source: string, components?: MdxComponents): Promise<string> {
  return renderToStaticMarkup(await renderMdx({ source, components }));
}

describe("renderMdx", () => {
  it("strips frontmatter instead of rendering it", async () => {
    const html = await render("---\ntitle: Hidden\n---\n\nVisible.\n");

    expect(html).not.toContain("Hidden");
    expect(html).toContain("<p>Visible.</p>");
  });

  it("renders GitHub-flavoured markdown", async () => {
    const html = await render(
      ["| a | b |", "| - | - |", "| 1 | 2 |", "", "~~gone~~", "", "- [x] done"].join("\n"),
    );

    expect(html).toContain("<table>");
    expect(html).toContain("<del>gone</del>");
    expect(html).toContain('type="checkbox"');
  });

  it("typesets inline and display mathematics at build time", async () => {
    const html = await render("Inline $e^{i\\pi} + 1 = 0$.\n\n$$\n\\frac{a}{b}\n$$\n");

    expect(html).toContain('class="katex"');
    expect(html).toContain("katex-display");
    // KaTeX 0.18 prefixed its generic internal class names. Seeing the old
    // `class="base"` means a second, older KaTeX is rendering the maths and the
    // stylesheet imported in the root layout will not match it.
    expect(html).toContain("katex-base");
    expect(html).not.toContain('class="base"');
  });

  it("highlights code with both themes, so no re-highlighting is needed", async () => {
    const html = await render("```python\nx = 1\n```\n");

    expect(html).toContain('data-language="python"');
    expect(html).toContain('data-theme="github-light github-dark"');
    expect(html).toContain("--shiki-light:");
    expect(html).toContain("--shiki-dark:");
  });

  it.each(["python", "typescript", "javascript", "json", "bash", "yaml"])(
    "highlights %s",
    async (language) => {
      const html = await render(`\`\`\`${language}\nx\n\`\`\`\n`);

      expect(html).toContain(`data-language="${language}"`);
      expect(html).toContain("--shiki-light:");
    },
  );

  it("degrades to plain text for a fence with an unknown or missing language", async () => {
    const unknown = await render("```notalanguage\nkeep me\n```\n");
    const missing = await render("```\nkeep me\n```\n");

    expect(unknown).toContain("keep me");
    expect(missing).toContain("keep me");
    expect(missing).toContain('data-language="plaintext"');
  });

  it("renders only the components it is given", async () => {
    const html = await render("<Note>inside</Note>\n", {
      Note: ({ children }: { children?: React.ReactNode }) => <aside>{children}</aside>,
    });

    expect(html).toContain("<aside>inside</aside>");
  });

  it("keeps JSX attribute expressions, which the demos need", async () => {
    const html = await render('<Rate value={0.1} label="eta" />\n', {
      Rate: ({ value, label }: { value: number; label: string }) => (
        <p>
          {label}={value}
        </p>
      ),
    });

    expect(html).toContain("eta=0.1");
  });
});
