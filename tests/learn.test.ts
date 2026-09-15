// @vitest-environment node
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { learningTopics } from "@/lib/content/topics";

/**
 * Lesson retrieval, exercised against throwaway content trees rather than
 * `content/learn/`, so these tests keep meaning something after the author has
 * replaced the sample lessons with his own (spec §40.2).
 *
 * `showDrafts` is a module-level constant, so every case re-imports
 * `lib/content/learn` with the environment it wants — the same approach
 * `tests/blog.test.ts` and `tests/env.test.ts` take.
 */
type LearnModule = typeof import("@/lib/content/learn");

let root = "";

async function contentTree(files: Record<string, string>): Promise<string> {
  root = await mkdtemp(path.join(tmpdir(), "learn-"));
  for (const [relativePath, body] of Object.entries(files)) {
    const file = path.join(root, relativePath);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body, "utf8");
  }
  return root;
}

/** Loads the module with drafts visible or hidden, whichever the case needs. */
async function learnWithDrafts(visible: boolean): Promise<LearnModule> {
  vi.stubEnv("SHOW_DRAFTS", visible ? "true" : "false");
  vi.resetModules();
  return import("@/lib/content/learn");
}

beforeEach(() => {
  vi.stubEnv("VERCEL_ENV", undefined);
});

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
  root = "";
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetModules();
});

/** Frontmatter with everything optional left out, so defaults are exercised. */
function lesson(title: string, order: number, extra: string[] = []): string {
  return [
    "---",
    `title: "${title}"`,
    `description: "About ${title}."`,
    `order: ${order}`,
    'publishedAt: "2026-01-01"',
    ...extra,
    "---",
    "",
    `Body of ${title}.`,
  ].join("\n");
}

/** The four-lesson topic the ordering and adjacency cases share. */
const neuralNetworks = {
  "neural-networks/introduction.mdx": lesson("Introduction", 10),
  "neural-networks/activation-functions.mdx": lesson("Activations", 20),
  "neural-networks/gradient-descent.mdx": lesson("Descent", 30),
  "neural-networks/backpropagation.mdx": lesson("Backprop", 40),
};

describe("getLessonsByTopic", () => {
  it("returns one topic's lessons in sparse order, not filesystem order", async () => {
    const tree = await contentTree(neuralNetworks);
    const { getLessonsByTopic } = await learnWithDrafts(false);

    const ids = (await getLessonsByTopic("neural-networks", tree)).map((entry) => entry.lessonId);

    expect(ids).toEqual([
      "introduction",
      "activation-functions",
      "gradient-descent",
      "backpropagation",
    ]);
  });

  it("derives the topic from the directory and the lesson from the filename", async () => {
    const tree = await contentTree({
      "transformers/attention.mdx": lesson("A title nothing derives from", 10),
    });
    const { getLessonsByTopic } = await learnWithDrafts(false);

    const [entry] = await getLessonsByTopic("transformers", tree);

    expect(entry.topicId).toBe("transformers");
    expect(entry.lessonId).toBe("attention");
  });

  it("parses frontmatter, applies defaults and strips it from the body", async () => {
    const tree = await contentTree({
      "transformers/full.mdx": lesson("Full", 10, [
        'difficulty: "intermediate"',
        'updatedAt: "2026-02-03"',
        "prerequisites:",
        "  - neural-networks/introduction",
      ]),
      "transformers/bare.mdx": lesson("Bare", 20),
    });
    const { getLessonsByTopic } = await learnWithDrafts(false);

    const [full, bare] = await getLessonsByTopic("transformers", tree);

    expect(full.metadata).toEqual({
      title: "Full",
      description: "About Full.",
      order: 10,
      difficulty: "intermediate",
      prerequisites: ["neural-networks/introduction"],
      publishedAt: "2026-01-01",
      updatedAt: "2026-02-03",
      draft: false,
    });
    expect(bare.metadata.prerequisites).toEqual([]);
    expect(bare.metadata.difficulty).toBeUndefined();
    expect(bare.metadata.draft).toBe(false);
    expect(bare.content.trim()).toBe("Body of Bare.");
    expect(bare.content).not.toContain("title:");
  });

  it("breaks an order tie on lesson id, so builds are stable", async () => {
    const tree = await contentTree({
      "transformers/beta.mdx": lesson("Beta", 10),
      "transformers/alpha.mdx": lesson("Alpha", 10),
    });
    const { getLessonsByTopic } = await learnWithDrafts(false);

    const ids = (await getLessonsByTopic("transformers", tree)).map((entry) => entry.lessonId);

    expect(ids).toEqual(["alpha", "beta"]);
  });

  it("ignores files that are not lessons, and anything nested deeper", async () => {
    const tree = await contentTree({
      "transformers/real.mdx": lesson("Real", 10),
      "transformers/notes.md": lesson("Wrong extension", 20),
      "transformers/README.txt": "not content",
      "transformers/_scaffolding.mdx": lesson("Underscored", 30),
      "transformers/.hidden.mdx": lesson("Dotfile", 40),
      "transformers/deeper/nested.mdx": lesson("Nested", 50),
    });
    const { getLessonsByTopic } = await learnWithDrafts(false);

    const ids = (await getLessonsByTopic("transformers", tree)).map((entry) => entry.lessonId);

    expect(ids).toEqual(["real"]);
  });

  it("returns nothing, rather than throwing, for a topic with no directory", async () => {
    const tree = await contentTree(neuralNetworks);
    const { getLessonsByTopic } = await learnWithDrafts(false);

    await expect(getLessonsByTopic("no-such-topic", tree)).resolves.toEqual([]);
  });

  it("excludes drafts when showDrafts is false, and includes them when true", async () => {
    const files = {
      ...neuralNetworks,
      "neural-networks/backpropagation.mdx": lesson("Backprop", 40, ["draft: true"]),
    };

    const hidden = await learnWithDrafts(false);
    const tree = await contentTree(files);
    const published = await hidden.getLessonsByTopic("neural-networks", tree);

    const shown = await learnWithDrafts(true);
    const all = await shown.getLessonsByTopic("neural-networks", tree);

    expect(published.map((entry) => entry.lessonId)).not.toContain("backpropagation");
    expect(all.map((entry) => entry.lessonId)).toContain("backpropagation");
  });

  // Matched by name and message rather than by class: `vi.resetModules()`
  // re-evaluates `lib/content/validate`, so the thrown error is an instance of
  // a different `ContentValidationError` than a top-level import would hold.
  it("fails on a published lesson with invalid frontmatter, naming the field", async () => {
    const tree = await contentTree({
      "transformers/broken.mdx": ["---", "title: No order", "description: D", 'publishedAt: "2026-01-01"', "---", "", "Body."].join("\n"),
    });
    const { getLessonsByTopic } = await learnWithDrafts(false);

    await expect(getLessonsByTopic("transformers", tree)).rejects.toMatchObject({
      name: "ContentValidationError",
    });
    await expect(getLessonsByTopic("transformers", tree)).rejects.toThrow(/broken\.mdx[\s\S]*order:/);
  });

  it("warns about an invalid draft and skips it, leaving published lessons alone", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const tree = await contentTree({
      "transformers/attention.mdx": lesson("Attention", 10),
      "transformers/broken-draft.mdx": ["---", "title: No description", "order: 20", 'publishedAt: "2026-01-01"', "draft: true", "---", "", "Body."].join("\n"),
    });
    const { getLessonsByTopic } = await learnWithDrafts(true);

    const ids = (await getLessonsByTopic("transformers", tree)).map((entry) => entry.lessonId);

    expect(ids).toEqual(["attention"]);
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain("broken-draft.mdx");
  });
});

describe("getAllLessons", () => {
  it("groups by topic in topics.ts order, ordered within each topic", async () => {
    const tree = await contentTree({
      "transformers/embeddings.mdx": lesson("Embeddings", 10),
      "transformers/attention.mdx": lesson("Attention", 20),
      "neural-networks/introduction.mdx": lesson("Introduction", 10),
      "neural-networks/gradient-descent.mdx": lesson("Descent", 30),
    });
    const { getAllLessons } = await learnWithDrafts(false);

    const paths = (await getAllLessons(tree)).map((entry) => `${entry.topicId}/${entry.lessonId}`);

    // Asserted against the configuration rather than a hard-coded list, so the
    // case survives the author reordering or renaming his topics.
    const expectedTopics = learningTopics
      .map((topic) => topic.id)
      .filter((id) => id === "neural-networks" || id === "transformers");
    expect(paths.map((entry) => entry.split("/")[0])).toEqual([
      expectedTopics[0],
      expectedTopics[0],
      expectedTopics[1],
      expectedTopics[1],
    ]);
    expect(paths).toContain("neural-networks/introduction");
    expect(paths.indexOf("neural-networks/introduction")).toBeLessThan(
      paths.indexOf("neural-networks/gradient-descent"),
    );
  });

  it("sorts a topic with no topics.ts entry last, rather than throwing", async () => {
    const tree = await contentTree({
      "undeclared-topic/orphan.mdx": lesson("Orphan", 10),
      "neural-networks/introduction.mdx": lesson("Introduction", 10),
    });
    const { getAllLessons } = await learnWithDrafts(false);

    const topics = (await getAllLessons(tree)).map((entry) => entry.topicId);

    expect(topics).toEqual(["neural-networks", "undeclared-topic"]);
  });

  it("returns nothing, rather than throwing, when the learn directory is absent", async () => {
    const tree = await contentTree(neuralNetworks);
    const { getAllLessons } = await learnWithDrafts(false);

    await expect(getAllLessons(path.join(tree, "nowhere"))).resolves.toEqual([]);
  });

  it("excludes drafts when showDrafts is false", async () => {
    const tree = await contentTree({
      "neural-networks/introduction.mdx": lesson("Introduction", 10),
      "neural-networks/wip.mdx": lesson("Unfinished", 20, ["draft: true"]),
    });
    const { getAllLessons } = await learnWithDrafts(false);

    const ids = (await getAllLessons(tree)).map((entry) => entry.lessonId);

    expect(ids).toEqual(["introduction"]);
  });
});

describe("getLessonByPath", () => {
  it("returns the lesson at <topic>/<lesson>", async () => {
    const tree = await contentTree(neuralNetworks);
    const { getLessonByPath } = await learnWithDrafts(false);

    const entry = await getLessonByPath("neural-networks", "gradient-descent", tree);

    expect(entry?.metadata.title).toBe("Descent");
    expect(entry?.content.trim()).toBe("Body of Descent.");
  });

  it("returns null for a lesson that does not exist, or the wrong topic", async () => {
    const tree = await contentTree(neuralNetworks);
    const { getLessonByPath } = await learnWithDrafts(false);

    await expect(getLessonByPath("neural-networks", "missing", tree)).resolves.toBeNull();
    await expect(getLessonByPath("transformers", "introduction", tree)).resolves.toBeNull();
  });

  // The route builds this path from two URL segments, so a segment that tries
  // to leave the content directory must not reach the filesystem.
  it("refuses a segment that is a path rather than a name", async () => {
    const tree = await contentTree(neuralNetworks);
    const { getLessonByPath } = await learnWithDrafts(false);

    for (const topicId of ["../neural-networks", "", ".hidden"]) {
      await expect(getLessonByPath(topicId, "introduction", tree)).resolves.toBeNull();
    }
    for (const lessonId of ["../introduction", "nested/introduction", "", ".hidden"]) {
      await expect(getLessonByPath("neural-networks", lessonId, tree)).resolves.toBeNull();
    }
  });

  it("hides a draft when showDrafts is false, so its URL can 404", async () => {
    const files = { "neural-networks/wip.mdx": lesson("Unfinished", 10, ["draft: true"]) };

    const hidden = await learnWithDrafts(false);
    const tree = await contentTree(files);
    await expect(hidden.getLessonByPath("neural-networks", "wip", tree)).resolves.toBeNull();

    const shown = await learnWithDrafts(true);
    const entry = await shown.getLessonByPath("neural-networks", "wip", tree);
    expect(entry?.metadata.draft).toBe(true);
  });
});

describe("getAdjacentLessons", () => {
  it("has no previous at the first lesson of a topic", async () => {
    const tree = await contentTree(neuralNetworks);
    const { getAdjacentLessons } = await learnWithDrafts(false);

    const { previous, next } = await getAdjacentLessons("neural-networks", "introduction", tree);

    expect(previous).toBeNull();
    expect(next?.lessonId).toBe("activation-functions");
  });

  it("has no next at the last lesson of a topic", async () => {
    const tree = await contentTree(neuralNetworks);
    const { getAdjacentLessons } = await learnWithDrafts(false);

    const { previous, next } = await getAdjacentLessons("neural-networks", "backpropagation", tree);

    expect(previous?.lessonId).toBe("gradient-descent");
    expect(next).toBeNull();
  });

  it("never points at a draft: neighbours are computed after filtering", async () => {
    const tree = await contentTree({
      ...neuralNetworks,
      "neural-networks/activation-functions.mdx": lesson("Activations", 20, ["draft: true"]),
    });
    const { getAdjacentLessons } = await learnWithDrafts(false);

    const forwards = await getAdjacentLessons("neural-networks", "introduction", tree);
    const backwards = await getAdjacentLessons("neural-networks", "gradient-descent", tree);

    expect(forwards.next?.lessonId).toBe("gradient-descent");
    expect(backwards.previous?.lessonId).toBe("introduction");
  });

  it("links the draft into place when drafts are visible", async () => {
    const tree = await contentTree({
      ...neuralNetworks,
      "neural-networks/activation-functions.mdx": lesson("Activations", 20, ["draft: true"]),
    });
    const { getAdjacentLessons } = await learnWithDrafts(true);

    const { next } = await getAdjacentLessons("neural-networks", "introduction", tree);

    expect(next?.lessonId).toBe("activation-functions");
  });

  it("does not cross a topic boundary", async () => {
    const tree = await contentTree({
      "neural-networks/introduction.mdx": lesson("Introduction", 10),
      "transformers/embeddings.mdx": lesson("Embeddings", 10),
    });
    const { getAdjacentLessons } = await learnWithDrafts(false);

    const { previous, next } = await getAdjacentLessons("neural-networks", "introduction", tree);

    expect(previous).toBeNull();
    expect(next).toBeNull();
  });

  it("has no neighbours for a lesson that is hidden or absent", async () => {
    const tree = await contentTree({
      ...neuralNetworks,
      "neural-networks/wip.mdx": lesson("Unfinished", 25, ["draft: true"]),
    });
    const { getAdjacentLessons } = await learnWithDrafts(false);

    await expect(getAdjacentLessons("neural-networks", "wip", tree)).resolves.toEqual({
      previous: null,
      next: null,
    });
    await expect(getAdjacentLessons("neural-networks", "missing", tree)).resolves.toEqual({
      previous: null,
      next: null,
    });
  });
});

describe("learningTopics", () => {
  it("declares topics in ascending order, with unique ids", () => {
    const orders = learningTopics.map((topic) => topic.order);
    const ids = learningTopics.map((topic) => topic.id);

    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("looks a topic up, and ranks an undeclared one last", async () => {
    const { getTopic, topicRank } = await import("@/lib/content/topics");
    const [first] = learningTopics;

    expect(getTopic(first.id)?.title).toBe(first.title);
    expect(getTopic("no-such-topic")).toBeUndefined();
    expect(topicRank("no-such-topic")).toBeGreaterThan(topicRank(first.id));
  });
});

describe("getPrerequisites", () => {
  it("resolves each path to the target lesson's own title", async () => {
    const tree = await contentTree({
      ...neuralNetworks,
      "transformers/attention.mdx": lesson("Attention", 20),
    });
    const { getPrerequisites } = await learnWithDrafts(false);

    const resolved = await getPrerequisites(
      ["neural-networks/introduction", "transformers/attention"],
      tree,
    );

    expect(resolved).toEqual([
      { topicId: "neural-networks", lessonId: "introduction", title: "Introduction", draft: false },
      { topicId: "transformers", lessonId: "attention", title: "Attention", draft: false },
    ]);
  });

  it("reports a hidden or missing target as unresolved rather than inventing a link", async () => {
    const tree = await contentTree({
      "neural-networks/backpropagation.mdx": lesson("Backprop", 40, ["draft: true"]),
    });
    const { getPrerequisites } = await learnWithDrafts(false);

    const resolved = await getPrerequisites(
      ["neural-networks/backpropagation", "neural-networks/nothing-here"],
      tree,
    );

    expect(resolved.map((entry) => entry.title)).toEqual([null, null]);
    // Nothing resolved, so there is no draft to report either.
    expect(resolved.map((entry) => entry.draft)).toEqual([false, false]);
  });

  it("reports a resolved draft as a draft, so the page can badge the link", async () => {
    const tree = await contentTree({
      "neural-networks/backpropagation.mdx": lesson("Backprop", 40, ["draft: true"]),
    });
    const { getPrerequisites } = await learnWithDrafts(true);

    const [resolved] = await getPrerequisites(["neural-networks/backpropagation"], tree);

    expect(resolved).toEqual({
      topicId: "neural-networks",
      lessonId: "backpropagation",
      title: "Backprop",
      draft: true,
    });
  });
});

/**
 * The sample content itself (spec §37): two topics, and at least one draft
 * lesson so draft filtering and adjacency-across-drafts are actually
 * exercised. Asserted loosely, on the properties that must hold however many
 * lessons the author later adds.
 */
describe("content/learn", () => {
  it("ships at least two topics, each with a directory declared in topics.ts", async () => {
    const { getAllLessons } = await learnWithDrafts(false);

    const topics = new Set((await getAllLessons()).map((entry) => entry.topicId));
    const configured = new Set(learningTopics.map((topic) => topic.id));

    expect(topics.size).toBeGreaterThanOrEqual(2);
    for (const topicId of topics) expect(configured.has(topicId)).toBe(true);
  });

  it("ships a draft lesson that is visible only when drafts are shown", async () => {
    const hidden = await learnWithDrafts(false);
    const shown = await learnWithDrafts(true);

    const published = await hidden.getAllLessons();
    const all = await shown.getAllLessons();

    expect(all.length).toBeGreaterThan(published.length);
    expect(all.filter((entry) => entry.metadata.draft).length).toBeGreaterThanOrEqual(1);
    expect(published.every((entry) => !entry.metadata.draft)).toBe(true);
  });

  it("never offers a hidden lesson as a neighbour in production", async () => {
    const { getAllLessons, getAdjacentLessons } = await learnWithDrafts(false);

    for (const entry of await getAllLessons()) {
      const { previous, next } = await getAdjacentLessons(entry.topicId, entry.lessonId);
      expect(previous?.metadata.draft ?? false).toBe(false);
      expect(next?.metadata.draft ?? false).toBe(false);
    }
  });

  it("opens every sample file with a placeholder, so no prose reads as the author's", async () => {
    const { getAllLessons } = await learnWithDrafts(true);

    for (const entry of await getAllLessons()) {
      // The placeholder is the `Callout` of the prose registry (spec §15, §3.1),
      // opening the file so it cannot be scrolled past.
      expect(entry.content.trimStart()).toMatch(
        /^<Callout variant="warning" title="Placeholder content">/,
      );
    }
  });

  it("keeps every prerequisite resolvable to a published lesson", async () => {
    const { getAllLessons } = await learnWithDrafts(false);

    const lessons = await getAllLessons();
    const paths = new Set(lessons.map((entry) => `${entry.topicId}/${entry.lessonId}`));

    for (const entry of lessons) {
      for (const prerequisite of entry.metadata.prerequisites) {
        expect(paths.has(prerequisite)).toBe(true);
      }
    }
  });
});
