// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { blogPostSchema, lessonSchema, pageSchema } from "@/lib/content/schemas";
import {
  ContentValidationError,
  checkBody,
  checkFrontmatter,
  crossFileIssues,
  formatIssue,
  isDraftFrontmatter,
  parseFrontmatter,
  type BlogRecord,
  type LessonRecord,
} from "@/lib/content/validate";

const post = (overrides: Record<string, unknown> = {}) => ({
  title: "A post",
  description: "About something.",
  publishedAt: "2026-09-04",
  ...overrides,
});

const lesson = (overrides: Record<string, unknown> = {}) => ({
  title: "A lesson",
  description: "About something.",
  order: 10,
  publishedAt: "2026-09-04",
  ...overrides,
});

const blogRecord = (overrides: Partial<BlogRecord> = {}): BlogRecord => ({
  file: "content/blog/a.mdx",
  slug: "a",
  draft: false,
  ...overrides,
});

const lessonRecord = (overrides: Partial<LessonRecord> = {}): LessonRecord => ({
  file: "content/learn/neural-networks/introduction.mdx",
  topicId: "neural-networks",
  lessonId: "introduction",
  order: 10,
  draft: false,
  prerequisites: [],
  ...overrides,
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("isDraftFrontmatter", () => {
  it("recognises only a literal draft: true", () => {
    expect(isDraftFrontmatter({ draft: true })).toBe(true);
    expect(isDraftFrontmatter({ draft: false })).toBe(false);
    expect(isDraftFrontmatter({})).toBe(false);
  });

  // Spec §18: a file whose draft field is itself unreadable is treated as
  // published, so a broken flag fails loudly instead of silencing the file.
  it("treats an unreadable draft field as published", () => {
    expect(isDraftFrontmatter({ draft: "true" })).toBe(false);
    expect(isDraftFrontmatter({ draft: null })).toBe(false);
    expect(isDraftFrontmatter("nonsense")).toBe(false);
  });
});

describe("checkFrontmatter", () => {
  it("returns the parsed metadata for valid frontmatter", () => {
    const result = checkFrontmatter(blogPostSchema, post(), "content/blog/a.mdx");

    expect(result.ok).toBe(true);
    expect(result.ok && result.metadata.title).toBe("A post");
  });

  it("names the file, the field and the expectation", () => {
    const result = checkFrontmatter(
      blogPostSchema,
      { title: "A post", description: "D", publishedAt: "yesterday" },
      "content/blog/example.mdx",
    );

    expect(result.ok).toBe(false);
    expect(result.ok ? "" : formatIssue(result.issue)).toBe(
      [
        "content/blog/example.mdx",
        '  publishedAt: Expected an ISO date, e.g. 2026-09-04 (received "yesterday")',
      ].join("\n"),
    );
  });

  /**
   * The `received` note is the half of the message that tells an author what
   * they wrote, and YAML hands the schema more kinds of value than a string:
   * an unquoted date is a `Date`, an indented block is a mapping, a dash list
   * is a list. Each is named in the words the author would use rather than
   * printed as `[object Object]`.
   */
  it("names the value the author actually wrote, whatever kind it is", () => {
    const received = (
      data: Record<string, unknown>,
      schema: typeof blogPostSchema | typeof lessonSchema = blogPostSchema,
    ): string => {
      const result = checkFrontmatter(schema, data, "content/blog/a.mdx");
      return result.ok ? "" : formatIssue(result.issue);
    };

    expect(received(post({ title: 42 }))).toContain("(received 42)");
    expect(received(post({ title: true }))).toContain("(received true)");
    expect(received(post({ title: null }))).toContain("(received null)");
    // A field that is absent gets no note at all: "received nothing" would read
    // as though the author had written something empty.
    expect(received(post({ title: undefined }))).not.toContain("received");
    expect(received(post({ title: ["One", "Two"] }))).toContain("(received a list)");
    expect(received(post({ title: { en: "One" } }))).toContain("(received a mapping)");
    expect(received(post({ title: new Date("2026-09-04") }))).toContain("(received a Date)");
    // Long enough that quoting it would bury the expectation it explains.
    expect(received(lesson({ order: "ten".repeat(20) }), lessonSchema)).toContain(
      "(received a long string)",
    );
  });

  it("classifies invalid published content as an error", () => {
    const result = checkFrontmatter(blogPostSchema, post({ title: undefined }), "content/blog/a.mdx");

    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.issue.severity).toBe("error");
  });

  it("classifies an invalid draft as a warning", () => {
    const result = checkFrontmatter(
      blogPostSchema,
      post({ title: undefined, draft: true }),
      "content/blog/a.mdx",
    );

    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.issue.severity).toBe("warning");
  });

  it("still errors on a draft flag when the content type has no drafts", () => {
    // A standalone page (spec §24) has nothing unfinished to excuse, so
    // `draft: true` on one is a mistake to report, not a reason to skip it.
    const result = checkFrontmatter(
      pageSchema,
      { title: "About", description: "D", draft: true },
      "content/pages/about.mdx",
      { draftable: false },
    );

    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.issue.severity).toBe("error");
  });
});

describe("parseFrontmatter", () => {
  it("throws on a published file with invalid frontmatter", () => {
    expect(() => parseFrontmatter(blogPostSchema, post({ description: undefined }), "content/blog/a.mdx"))
      .toThrow(ContentValidationError);
  });

  it("warns and skips a draft with invalid frontmatter", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = parseFrontmatter(
      blogPostSchema,
      post({ description: undefined, draft: true }),
      "content/blog/wip.mdx",
    );

    expect(result).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]?.[0]).toContain("content/blog/wip.mdx");
  });

  it("returns metadata for a valid lesson without warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(parseFrontmatter(lessonSchema, lesson(), "content/learn/nn/a.mdx")?.order).toBe(10);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("checkBody", () => {
  const file = "content/blog/a.mdx";

  const mdx = (...body: string[]) =>
    ["---", 'title: "A post"', "---", "", ...body].join("\n");

  it("passes a file that imports nothing", () => {
    expect(checkBody(mdx("Prose, and <Callout>a component</Callout>."), file, false)).toBeNull();
  });

  it("fails a published file that imports, naming the line the author sees", () => {
    const issue = checkBody(mdx('import Chart from "./chart";', "", "Prose."), file, false);

    expect(issue?.severity).toBe("error");
    // Line 5: the three frontmatter lines, the blank line, then the statement.
    expect(issue?.details).toEqual([expect.stringContaining("Line 5")]);
    expect(issue?.details[0]).toContain("registry");
  });

  it("catches an export too, since it is stripped just as silently", () => {
    const issue = checkBody(mdx("export const meta = 1;"), file, false);

    expect(issue?.details).toHaveLength(1);
  });

  it("warns rather than fails for a draft, as invalid frontmatter does", () => {
    expect(checkBody(mdx('import "./x";'), file, true)?.severity).toBe("warning");
  });

  it("leaves code alone: a Python snippet may import numpy", () => {
    expect(
      checkBody(
        mdx("```python", "import numpy as np", "```", "", "    import indented_is_code_too", ""),
        file,
        false,
      ),
    ).toBeNull();
  });

  it("sees a statement after a fence has closed", () => {
    const issue = checkBody(mdx("```js", "import a from 'a';", "```", "", "import b from 'b';"), file, false);

    expect(issue?.details).toEqual([expect.stringContaining("Line 9")]);
  });

  it("ignores frontmatter, which is YAML and not a module", () => {
    const source = ["---", 'title: "A post"', "export: true", "---", "", "Prose."].join("\n");

    expect(checkBody(source, file, false)).toBeNull();
  });

  it("reports every offending line at once", () => {
    const issue = checkBody(mdx('import "./a";', 'import "./b";'), file, false);

    expect(issue?.details).toHaveLength(2);
  });
});

describe("crossFileIssues", () => {
  const base = { posts: [], lessons: [], topicDirectories: [], configuredTopicIds: [] };

  it("passes a consistent tree", () => {
    expect(
      crossFileIssues({
        ...base,
        posts: [blogRecord(), blogRecord({ file: "content/blog/b.mdx", slug: "b" })],
        lessons: [
          lessonRecord(),
          lessonRecord({
            file: "content/learn/neural-networks/gradient-descent.mdx",
            lessonId: "gradient-descent",
            order: 20,
            prerequisites: ["neural-networks/introduction"],
          }),
        ],
        topicDirectories: ["neural-networks"],
        configuredTopicIds: ["neural-networks"],
      }),
    ).toEqual([]);
  });

  it("reports a topic directory with no topics.ts entry", () => {
    const [issue] = crossFileIssues({ ...base, topicDirectories: ["transformers"] });

    expect(issue).toMatchObject({ file: "content/learn/transformers", severity: "error" });
    expect(issue.details[0]).toContain("lib/content/topics.ts");
  });

  it("reports a topics.ts entry with no directory", () => {
    const [issue] = crossFileIssues({ ...base, configuredTopicIds: ["transformers"] });

    expect(issue).toMatchObject({ file: "lib/content/topics.ts", severity: "error" });
    expect(issue.details[0]).toContain("content/learn/transformers/");
  });

  it("reports a duplicate order within a topic", () => {
    const issues = crossFileIssues({
      ...base,
      lessons: [
        lessonRecord(),
        lessonRecord({ file: "content/learn/neural-networks/other.mdx", lessonId: "other" }),
      ],
      topicDirectories: ["neural-networks"],
      configuredTopicIds: ["neural-networks"],
    });

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ file: "content/learn/neural-networks/other.mdx", severity: "error" });
    expect(issues[0].details[0]).toContain("10 is already used by");
  });

  it("allows the same order in different topics", () => {
    expect(
      crossFileIssues({
        ...base,
        lessons: [
          lessonRecord(),
          lessonRecord({ file: "content/learn/transformers/embeddings.mdx", topicId: "transformers", lessonId: "embeddings" }),
        ],
        topicDirectories: ["neural-networks", "transformers"],
        configuredTopicIds: ["neural-networks", "transformers"],
      }),
    ).toEqual([]);
  });

  it("downgrades a clash involving a draft to a warning, since it vanishes in production", () => {
    const issues = crossFileIssues({
      ...base,
      lessons: [
        lessonRecord(),
        lessonRecord({ file: "content/learn/neural-networks/wip.mdx", lessonId: "wip", draft: true }),
      ],
      topicDirectories: ["neural-networks"],
      configuredTopicIds: ["neural-networks"],
    });

    expect(issues[0]?.severity).toBe("warning");
  });

  it("reports a prerequisite that resolves to nothing", () => {
    const issues = crossFileIssues({
      ...base,
      lessons: [lessonRecord({ prerequisites: ["neural-networks/nowhere"] })],
      topicDirectories: ["neural-networks"],
      configuredTopicIds: ["neural-networks"],
    });

    expect(issues[0]?.details[0]).toContain('"neural-networks/nowhere" does not resolve');
    expect(issues[0]?.severity).toBe("error");
  });

  it("reports a published lesson whose prerequisite is a draft", () => {
    const issues = crossFileIssues({
      ...base,
      lessons: [
        lessonRecord({ prerequisites: ["neural-networks/wip"] }),
        lessonRecord({ file: "content/learn/neural-networks/wip.mdx", lessonId: "wip", order: 20, draft: true }),
      ],
      topicDirectories: ["neural-networks"],
      configuredTopicIds: ["neural-networks"],
    });

    expect(issues).toHaveLength(1);
    expect(issues[0].details[0]).toContain("is a draft");
  });

  it("reports a lesson that lists itself as a prerequisite", () => {
    const issues = crossFileIssues({
      ...base,
      lessons: [lessonRecord({ prerequisites: ["neural-networks/introduction"] })],
      topicDirectories: ["neural-networks"],
      configuredTopicIds: ["neural-networks"],
    });

    expect(issues[0]?.details[0]).toContain("is the lesson itself");
  });

  it("warns rather than fails when a draft lesson has a broken prerequisite", () => {
    const issues = crossFileIssues({
      ...base,
      lessons: [lessonRecord({ draft: true, prerequisites: ["neural-networks/nowhere"] })],
      topicDirectories: ["neural-networks"],
      configuredTopicIds: ["neural-networks"],
    });

    expect(issues[0]?.severity).toBe("warning");
  });

  it("reports two blog posts that produce the same slug", () => {
    const issues = crossFileIssues({
      ...base,
      posts: [blogRecord(), blogRecord({ file: "content/blog/nested/a.mdx" })],
    });

    expect(issues[0]).toMatchObject({ file: "content/blog/nested/a.mdx", severity: "error" });
    expect(issues[0].details[0]).toContain('"a" is already produced by');
  });
});
