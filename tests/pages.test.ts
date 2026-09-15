// @vitest-environment node
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { getPage } from "@/lib/content/pages";
import { ContentValidationError } from "@/lib/content/validate";

/**
 * Standalone page retrieval (spec §24), exercised against throwaway trees
 * rather than `content/pages/`, so these tests keep meaning something after the
 * author has replaced the scaffolding prose with his own. The last case is the
 * exception: it resolves the page the site actually ships, because a route that
 * names a missing file is the one mistake a unit test on a fixture cannot see.
 *
 * Nothing here stubs `SHOW_DRAFTS`: a page has no draft flag, so there is no
 * environment-dependent behaviour to arrange.
 */
const roots: string[] = [];

async function pagesTree(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "pages-"));
  roots.push(root);
  for (const [name, body] of Object.entries(files)) {
    const file = path.join(root, name);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body, "utf8");
  }
  return root;
}

afterEach(async () => {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
  roots.length = 0;
});

function page(extra: string[] = []): string {
  return [
    "---",
    'title: "About"',
    'description: "Who writes this."',
    ...extra,
    "---",
    "",
    "## Who writes this",
    "",
    "Body.",
  ].join("\n");
}

describe("getPage", () => {
  it("returns the frontmatter and the MDX body, keyed by the id the route asked for", async () => {
    const root = await pagesTree({ "about.mdx": page(['updatedAt: "2026-09-14"']) });

    const result = await getPage("about", root);

    expect(result.id).toBe("about");
    expect(result.metadata).toEqual({
      title: "About",
      description: "Who writes this.",
      updatedAt: "2026-09-14",
    });
    expect(result.content).toContain("## Who writes this");
    // Frontmatter is stripped, not handed on to be rendered as prose.
    expect(result.content).not.toContain("title:");
  });

  it("leaves updatedAt undefined when the page does not carry one", async () => {
    const root = await pagesTree({ "about.mdx": page() });

    const { metadata } = await getPage("about", root);

    expect(metadata.updatedAt).toBeUndefined();
  });

  it("throws, naming the file, when the page a route asks for is missing", async () => {
    const root = await pagesTree({ "about.mdx": page() });

    // A renamed file must stop the build rather than turn a navigation entry
    // into a silent 404, which is why this is not a `null` return.
    await expect(getPage("colophon", root)).rejects.toThrow(/colophon\.mdx/);
  });

  it("rejects invalid frontmatter, because a page is never a draft", async () => {
    const root = await pagesTree({
      "about.mdx": ["---", 'title: "About"', "---", "", "Body."].join("\n"),
    });

    await expect(getPage("about", root)).rejects.toThrow(ContentValidationError);
  });

  it("rejects a field a page does not have, rather than ignoring it", async () => {
    const root = await pagesTree({ "about.mdx": page(["draft: true"]) });

    // `draft: true` in particular: a page is linked from every route's header,
    // so a flag that looked like it hid one would be a trap.
    await expect(getPage("about", root)).rejects.toThrow(/draft/);
  });

  // A missing file gets the sentence above, which tells the author what to
  // rename. Any other read failure is reported as itself: rewriting it as
  // "missing page content" would send them looking for a file that is there.
  it("reports a read failure that is not a missing file as itself", async () => {
    const root = await pagesTree({ "about.mdx": page() });
    await mkdir(path.join(root, "colophon.mdx"));

    await expect(getPage("colophon", root)).rejects.toMatchObject({ code: "EISDIR" });
  });
});

describe("the about page this site ships", () => {
  it("resolves, and is marked as scaffolding until the author rewrites it", async () => {
    const { metadata, content } = await getPage("about");

    expect(metadata.title.length).toBeGreaterThan(0);
    // Spec §3.1: agent-written prose carries a visible placeholder callout.
    expect(content).toContain('<Callout variant="warning"');
  });

  /**
   * The route, rendered. `getPage` above proves the file parses; this proves
   * the page puts it on screen — the frontmatter in the header, the MDX body
   * through the prose registry. The route holds no prose of its own, so a
   * heading that stopped rendering would leave a page with nothing on it and
   * no test to say so.
   */
  it("renders its frontmatter and its body, the callout included", async () => {
    const { default: AboutPage } = await import("@/app/about/page");
    const { metadata } = await getPage("about");
    const html = renderToStaticMarkup(await AboutPage());

    expect(html).toMatch(new RegExp(`<h1[^>]*>${metadata.title}</h1>`));
    expect(html).toContain(metadata.description);
    // The callout the MDX declares, turned into the component the registry maps
    // it to rather than left as literal text.
    expect(html).not.toContain("<Callout");
    expect(html).toContain("Placeholder content");

    if (metadata.updatedAt !== undefined) {
      // The machine-readable date, alongside the one a reader sees.
      expect(html).toMatch(new RegExp(`<time [^>]*"${metadata.updatedAt}"`, "i"));
    }
  });
});
