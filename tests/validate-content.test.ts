// @vitest-environment node
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

// The end-to-end shape of the gate: `pnpm validate:content` must pass on good
// content and exit non-zero on bad. The script takes a content root so a test
// can hand it a tree of its own; everything here is blog content, because the
// learn checks need `lib/content/topics.ts`, which arrives in a later phase.
const SCRIPT = fileURLToPath(new URL("../scripts/validate-content.mjs", import.meta.url));

let root = "";

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
  root = "";
});

async function contentTree(files: Record<string, string>): Promise<string> {
  root = await mkdtemp(path.join(tmpdir(), "validate-content-"));
  for (const [relativePath, body] of Object.entries(files)) {
    const file = path.join(root, relativePath);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body, "utf8");
  }
  return root;
}

function validate(contentRoot: string) {
  const result = spawnSync(process.execPath, [SCRIPT, contentRoot], { encoding: "utf8" });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
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
