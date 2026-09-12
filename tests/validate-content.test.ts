// @vitest-environment node
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

// The end-to-end shape of the gate: `pnpm validate:content` must pass on good
// content and exit non-zero on bad. The script takes a content root, and a
// topic configuration to check that root's learn directories against, so a
// test can hand it a tree of its own rather than depending on whichever
// content and topics the author happens to have today.
const SCRIPT = fileURLToPath(new URL("../scripts/validate-content.mjs", import.meta.url));

let root = "";

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
  root = "";
});

/**
 * A throwaway content root, plus the `topics.ts` its learn directories are
 * checked against. The topics module sits beside `blog/` and `learn/` rather
 * than inside either, so the walk never sees it.
 */
async function contentTree(
  files: Record<string, string>,
  topicIds: readonly string[] = [],
): Promise<string> {
  root = await mkdtemp(path.join(tmpdir(), "validate-content-"));
  for (const [relativePath, body] of Object.entries(files)) {
    const file = path.join(root, relativePath);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body, "utf8");
  }

  const topics = topicIds.map((id, index) => ({ id, title: id, order: index + 1 }));
  await writeFile(
    path.join(root, "topics.ts"),
    `export const learningTopics = ${JSON.stringify(topics)};\n`,
    "utf8",
  );

  return root;
}

function validate(contentRoot: string) {
  const result = spawnSync(
    process.execPath,
    [SCRIPT, contentRoot, path.join(contentRoot, "topics.ts")],
    { encoding: "utf8" },
  );
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

/** Lesson frontmatter, valid unless a case deliberately breaks it. */
function lesson(title: string, order: number, extra: string[] = []): string {
  return [
    "---",
    `title: "${title}"`,
    `description: "About ${title}."`,
    `order: ${order}`,
    "publishedAt: 2026-09-04",
    ...extra,
    "---",
    "",
    "Body.",
  ].join("\n");
}

const published = [
  "---",
  'title: "A published post"',
  'description: "It validates."',
  "publishedAt: 2026-09-04",
  "---",
  "",
  "Body.",
].join("\n");

describe("pnpm validate:content", () => {
  it("passes on valid content", async () => {
    const tree = await contentTree({ "blog/published.mdx": published });

    const { status, stdout } = validate(tree);

    expect(status).toBe(0);
    expect(stdout).toContain("1 file checked, 0 errors, 0 warnings");
  });

  it("exits non-zero on a published post with invalid frontmatter", async () => {
    const tree = await contentTree({
      "blog/published.mdx": published,
      "blog/broken.mdx": ["---", 'title: "No date"', 'description: "D"', "---", "", "Body."].join("\n"),
    });

    const { status, stderr } = validate(tree);

    expect(status).toBe(1);
    expect(stderr).toContain("blog/broken.mdx");
    expect(stderr).toContain("publishedAt: Expected an ISO date, e.g. 2026-09-04");
  });

  it("warns but still passes when only a draft is invalid", async () => {
    const tree = await contentTree({
      "blog/published.mdx": published,
      "blog/wip.mdx": ["---", 'title: "Unfinished"', "draft: true", "---", "", "Body."].join("\n"),
    });

    const { status, stderr, stdout } = validate(tree);

    expect(status).toBe(0);
    expect(stderr).toContain("warning");
    expect(stderr).toContain("blog/wip.mdx");
    expect(stdout).toContain("0 errors, 1 warning");
  });

  it("fails on frontmatter that is not valid YAML", async () => {
    const tree = await contentTree({
      "blog/broken.mdx": ["---", 'title: "Unclosed', "---", "", "Body."].join("\n"),
    });

    expect(validate(tree).status).toBe(1);
  });

  it("fails on a blog post hidden in a subdirectory, which has no route", async () => {
    const tree = await contentTree({ "blog/2026/nested.mdx": published });

    const { status, stderr } = validate(tree);

    expect(status).toBe(1);
    expect(stderr).toContain("flat files");
  });

  it("ignores scaffolding and dotfiles", async () => {
    const tree = await contentTree({
      "blog/published.mdx": published,
      "blog/_scratch.mdx": "no frontmatter at all",
      "blog/.keep": "",
    });

    const { status, stdout } = validate(tree);

    expect(status).toBe(0);
    expect(stdout).toContain("1 file checked");
  });
});

describe("pnpm validate:content, on learn content", () => {
  it("passes on a topic whose directory and topics.ts entry agree", async () => {
    const tree = await contentTree(
      {
        "learn/neural-networks/introduction.mdx": lesson("Introduction", 10),
        "learn/neural-networks/gradient-descent.mdx": lesson("Gradient Descent", 20, [
          "prerequisites:",
          "  - neural-networks/introduction",
        ]),
      },
      ["neural-networks"],
    );

    const { status, stdout } = validate(tree);

    expect(status).toBe(0);
    expect(stdout).toContain("2 files checked, 0 errors, 0 warnings");
  });

  it("fails on a duplicate order within a topic, naming both files", async () => {
    const tree = await contentTree(
      {
        "learn/neural-networks/introduction.mdx": lesson("Introduction", 10),
        "learn/neural-networks/activation-functions.mdx": lesson("Activations", 10),
      },
      ["neural-networks"],
    );

    const { status, stderr } = validate(tree);

    expect(status).toBe(1);
    expect(stderr).toContain("learn/neural-networks/introduction.mdx");
    expect(stderr).toContain("order: 10 is already used by");
  });

  it("allows the same order in two different topics", async () => {
    const tree = await contentTree(
      {
        "learn/neural-networks/introduction.mdx": lesson("Introduction", 10),
        "learn/transformers/embeddings.mdx": lesson("Embeddings", 10),
      },
      ["neural-networks", "transformers"],
    );

    expect(validate(tree).status).toBe(0);
  });

  it("fails on a topic directory with no topics.ts entry", async () => {
    const tree = await contentTree(
      { "learn/undeclared/lesson.mdx": lesson("Orphan", 10) },
      ["neural-networks"],
    );

    const { status, stderr } = validate(tree);

    expect(status).toBe(1);
    expect(stderr).toContain("lib/content/topics.ts");
  });

  it("fails on a topics.ts entry with no directory", async () => {
    const tree = await contentTree({ "blog/published.mdx": published }, ["ghost-topic"]);

    const { status, stderr } = validate(tree);

    expect(status).toBe(1);
    expect(stderr).toContain("ghost-topic");
  });

  it("fails on a prerequisite that resolves to nothing", async () => {
    const tree = await contentTree(
      {
        "learn/neural-networks/introduction.mdx": lesson("Introduction", 10, [
          "prerequisites:",
          "  - neural-networks/nowhere",
        ]),
      },
      ["neural-networks"],
    );

    const { status, stderr } = validate(tree);

    expect(status).toBe(1);
    expect(stderr).toContain('"neural-networks/nowhere" does not resolve to a lesson');
  });

  it("fails when a published lesson depends on a draft", async () => {
    const tree = await contentTree(
      {
        "learn/neural-networks/introduction.mdx": lesson("Introduction", 10, ["draft: true"]),
        "learn/neural-networks/gradient-descent.mdx": lesson("Gradient Descent", 20, [
          "prerequisites:",
          "  - neural-networks/introduction",
        ]),
      },
      ["neural-networks"],
    );

    const { status, stderr } = validate(tree);

    expect(status).toBe(1);
    expect(stderr).toContain("is a draft, so it is not published");
  });

  it("fails on a lesson dropped straight into content/learn, which has no topic", async () => {
    const tree = await contentTree({ "learn/stray.mdx": lesson("Stray", 10) });

    const { status, stderr } = validate(tree);

    expect(status).toBe(1);
    expect(stderr).toContain("A lesson lives in a topic directory");
  });
});
