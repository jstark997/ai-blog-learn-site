// @vitest-environment node
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { demoComponents } from "@/components/learn/registry";
import { proseComponents } from "@/components/mdx/registry";
import { renderMdx } from "@/lib/content/mdx";

/**
 * The two registries of spec §15, exercised through the real MDX pipeline
 * rather than by rendering the components directly: what matters is that an
 * author writing `<Callout>` or a plain markdown link gets the component, since
 * MDX files may not import anything and have no other way to reach one.
 *
 * Rendered on the server, as the routes do — every prose component is a Server
 * Component and none of this ships to the browser.
 */
const REGISTRY_SOURCE = new URL("../components/learn/registry.ts", import.meta.url);
const LAZY_DEMOS_SOURCE = new URL("../components/learn/lazy-demos.ts", import.meta.url);

/** Compiles MDX with the registry an article page uses. */
async function article(source: string): Promise<string> {
  return renderToStaticMarkup(await renderMdx({ source, components: proseComponents }));
}

/** Compiles MDX with the registry a lesson page uses: prose plus demos. */
async function lesson(source: string): Promise<string> {
  return renderToStaticMarkup(
    await renderMdx({ source, components: { ...proseComponents, ...demoComponents } }),
  );
}

describe("the prose registry", () => {
  it("overrides the markdown tags that need a component, and no others", () => {
    // Lower-case keys are tag overrides; everything else markdown emits is
    // styled by the `.prose` rules in app/globals.css.
    const tagOverrides = Object.keys(proseComponents).filter((key) => /^[a-z]/.test(key));

    expect(tagOverrides.sort()).toEqual(["a", "img", "table"]);
  });

  it("gives every MDX file the same author-facing components", () => {
    expect(Object.keys(proseComponents).filter((key) => /^[A-Z]/.test(key)).sort()).toEqual([
      "Callout",
      "Equation",
      "ExternalLink",
      "Figure",
    ]);
  });

  it("is available to lessons as well as articles", async () => {
    expect(await lesson("<Callout>Both.</Callout>\n")).toContain("Both.");
  });
});

describe("Callout", () => {
  it("labels its variant in text, not only in colour", async () => {
    const html = await article("<Callout variant=\"warning\">Mind this.</Callout>\n");

    expect(html).toContain("<aside");
    expect(html).toContain("Warning");
    expect(html).toContain("Mind this.");
  });

  it("defaults to a note", async () => {
    expect(await article("<Callout>Worth knowing.</Callout>\n")).toContain("Note");
  });

  it("takes a label of its own, which is how spec §3.1 marks scaffolding", async () => {
    const html = await article(
      '<Callout variant="warning" title="Placeholder content">\n\nNot editorial *writing*.\n\n</Callout>\n',
    );

    expect(html).toContain("Placeholder content");
    expect(html).not.toContain(">Warning<");
    // Block children are markdown, so emphasis inside a callout still works.
    expect(html).toContain("<em>writing</em>");
  });

  it("fails the build on a variant that does not exist, naming the mistake", async () => {
    await expect(article('<Callout variant="urgent">No such thing.</Callout>\n')).rejects.toThrow(
      /unknown variant "urgent"/,
    );
  });

  it("is not a landmark: a page with six callouts should not offer six regions", async () => {
    const html = await article("<Callout>Unnamed.</Callout>\n");

    expect(html).not.toContain("aria-label");
    expect(html).not.toContain('role="complementary"');
  });
});

describe("the a override", () => {
  it("routes an internal link through next/link", async () => {
    const html = await article("See [the lessons](/learn).\n");

    expect(html).toContain('href="/learn"');
    expect(html).not.toContain("noopener");
  });

  it("marks an external link and hides its arrow from assistive technology", async () => {
    const html = await article("See [the docs](https://nextjs.org/docs).\n");

    expect(html).toContain('href="https://nextjs.org/docs"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('aria-hidden="true"');
  });

  it("does not open an external link in a new tab", async () => {
    // WCAG 2.2 §3.2.5: an unrequested new window is a change of context.
    expect(await article("[Docs](https://nextjs.org/docs)\n")).not.toContain("_blank");
  });

  it("leaves a fragment and a mailto link as plain anchors", async () => {
    const fragment = await article("[Back up](#shapes)\n");
    const mail = await article("[Write](mailto:author@example.com)\n");

    expect(fragment).toContain('href="#shapes"');
    expect(fragment).not.toContain("aria-hidden");
    expect(mail).toContain('href="mailto:author@example.com"');
    expect(mail).not.toContain("aria-hidden");
  });
});

describe("the img override", () => {
  it("renders a markdown image lazily, keeping the author's alt text", async () => {
    const html = await article("![A two-layer network](/images/learn/network.png)\n");

    expect(html).toContain('alt="A two-layer network"');
    expect(html).toContain('loading="lazy"');
  });

  it("treats an image with no description as decorative rather than inventing one", async () => {
    expect(await article("![](/images/learn/rule.png)\n")).toContain('alt=""');
  });
});

describe("the table override", () => {
  it("wraps a table in a reachable scrolling region without changing its semantics", async () => {
    const html = await article(["| a | b |", "| - | - |", "| 1 | 2 |"].join("\n"));

    expect(html).toContain('role="region"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain("overflow-x-auto");
    expect(html).toContain("<table");
  });
});

describe("Figure", () => {
  it("optimizes the image and keeps the caption with it", async () => {
    const html = await article(
      '<Figure src="/images/blog/plot.png" alt="A loss curve" width={1200} height={630} caption="Loss over ten epochs." />\n',
    );

    expect(html).toContain("<figure");
    expect(html).toContain('alt="A loss curve"');
    // next/image, rather than a bare <img>: the optimizer's srcset.
    expect(html).toContain("srcSet=");
    expect(html).toContain("<figcaption");
    expect(html).toContain("Loss over ten epochs.");
  });
});

describe("Equation", () => {
  it("typesets the maths, and keeps the label a reader can be told about", async () => {
    const html = await article(
      '<Equation label="(1)" caption="Attention.">\n\n$$\n\\frac{a}{b}\n$$\n\n</Equation>\n',
    );

    expect(html).toContain("katex-display");
    expect(html).toContain("(1)");
    expect(html).not.toContain('aria-hidden="true">(1)');
    expect(html).toContain("<figcaption");
  });
});

describe("the demo registry", () => {
  it("shares no name with the prose registry, so neither can shadow the other", () => {
    const shared = Object.keys(demoComponents).filter((name) => name in proseComponents);

    expect(shared).toEqual([]);
  });

  it("loads every demo through the lazy boundary", () => {
    // The rule this phase exists to hold (spec §15, §30): a demo's JavaScript
    // is fetched only by the lessons that render it. A route's client chunks
    // are collected from its module graph rather than from what a page
    // rendered, so `next/dynamic` has to be called behind `"use client"` —
    // called in the registry, which is a Server Component module, it left both
    // demos on every lesson page. A lazily-loaded component cannot be told
    // from an eager one by inspection, so the two sources are what is checked.
    const lazyDemos = readFileSync(LAZY_DEMOS_SOURCE, "utf8");

    expect(lazyDemos.trimStart()).toMatch(/^"use client";/);

    for (const name of Object.keys(demoComponents)) {
      expect(lazyDemos).toMatch(new RegExp(`\\b${name} = dynamic\\(`));
    }
  });

  it("imports its demos from nowhere but the lazy boundary", () => {
    // The other half of the rule, and the line an agent adding a demo in a
    // later phase is most likely to get wrong: one direct import here puts
    // that demo back into every lesson's bundle, and nothing else would fail.
    const registry = readFileSync(REGISTRY_SOURCE, "utf8");
    const imported = [...registry.matchAll(/from "([^"]+)"/g)].map(([, from]) => from);

    expect(imported).toEqual(["@/components/learn/lazy-demos", "@/lib/content/mdx"]);
  });
});
