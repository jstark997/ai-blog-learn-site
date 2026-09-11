// @vitest-environment node
import matter from "gray-matter";
import { describe, expect, it } from "vitest";

import { blogPostSchema, lessonSchema } from "@/lib/content/schemas";

/** Parses frontmatter exactly as the content utilities will, YAML and all. */
function frontmatter(yaml: string): unknown {
  return matter(`---\n${yaml}\n---\n\nBody.\n`).data;
}

/** The messages a failure produced, keyed by field, for readable assertions. */
function issues(result: { success: boolean; error?: { issues: readonly { path: PropertyKey[]; message: string }[] } }) {
  return (result.error?.issues ?? []).map((issue) => `${issue.path.join(".")}: ${issue.message}`);
}

describe("blogPostSchema", () => {
  const valid = [
    'title: "Why AI agents need deterministic software"',
    'description: "Where deterministic logic should complement probabilistic systems."',
    'publishedAt: "2026-09-04"',
    "tags:",
    "  - agents",
    "  - architecture",
    "draft: false",
  ].join("\n");

  it("accepts the frontmatter of spec §9.3", () => {
    const result = blogPostSchema.safeParse(frontmatter(valid));

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      title: "Why AI agents need deterministic software",
      publishedAt: "2026-09-04",
      tags: ["agents", "architecture"],
      draft: false,
    });
  });

  it("defaults draft to false and tags to an empty list", () => {
    const result = blogPostSchema.parse(
      frontmatter(['title: "T"', 'description: "D"', 'publishedAt: "2026-09-04"'].join("\n")),
    );

    expect(result.draft).toBe(false);
    expect(result.tags).toEqual([]);
  });

  it("rejects a missing title", () => {
    const result = blogPostSchema.safeParse(
      frontmatter(['description: "D"', 'publishedAt: "2026-09-04"'].join("\n")),
    );

    expect(result.success).toBe(false);
    expect(issues(result)).toContain("title: Expected a title");
  });

  it("rejects a title that is only whitespace", () => {
    const result = blogPostSchema.safeParse(
      frontmatter(['title: "   "', 'description: "D"', 'publishedAt: "2026-09-04"'].join("\n")),
    );

    expect(result.success).toBe(false);
  });

  it("rejects an invalid date", () => {
    const result = blogPostSchema.safeParse(
      frontmatter(['title: "T"', 'description: "D"', 'publishedAt: "04/09/2026"'].join("\n")),
    );

    expect(result.success).toBe(false);
    expect(issues(result)).toEqual(["publishedAt: Expected an ISO date, e.g. 2026-09-04"]);
  });

  it("rejects a date that does not exist", () => {
    const result = blogPostSchema.safeParse(
      frontmatter(['title: "T"', 'description: "D"', 'publishedAt: "2026-02-30"'].join("\n")),
    );

    expect(result.success).toBe(false);
    expect(issues(result)).toEqual([
      "publishedAt: Expected a date that exists, e.g. not 2026-02-30",
    ]);
  });

  // The reason for the preprocessor: YAML turns an unquoted date into a
  // JavaScript Date, so a bare z.string() would reject it (spec §12).
  it("accepts an unquoted YAML date, which parses as a Date", () => {
    const data = frontmatter(['title: "T"', 'description: "D"', "publishedAt: 2026-09-04"].join("\n"));

    expect((data as { publishedAt: unknown }).publishedAt).toBeInstanceOf(Date);
    expect(blogPostSchema.parse(data).publishedAt).toBe("2026-09-04");
  });

  it("accepts an unquoted updatedAt too", () => {
    const result = blogPostSchema.parse(
      frontmatter(
        ['title: "T"', 'description: "D"', "publishedAt: 2026-09-04", "updatedAt: 2026-09-08"].join("\n"),
      ),
    );

    expect(result.updatedAt).toBe("2026-09-08");
  });

  it("rejects tags that are not a list", () => {
    const result = blogPostSchema.safeParse(
      frontmatter(['title: "T"', 'description: "D"', 'publishedAt: "2026-09-04"', 'tags: "agents"'].join("\n")),
    );

    expect(result.success).toBe(false);
  });

  it("rejects an unknown field, so a misspelt draft flag cannot publish a draft", () => {
    const result = blogPostSchema.safeParse(
      frontmatter(['title: "T"', 'description: "D"', 'publishedAt: "2026-09-04"', "drafts: true"].join("\n")),
    );

    expect(result.success).toBe(false);
    expect(issues(result).join("\n")).toContain("drafts");
  });
});

describe("lessonSchema", () => {
  const valid = [
    'title: "Understanding Gradient Descent"',
    'description: "An intuitive and mathematical introduction to gradient descent."',
    "order: 30",
    'difficulty: "beginner"',
    "prerequisites:",
    '  - "neural-networks/introduction"',
    'publishedAt: "2026-09-04"',
    "draft: false",
  ].join("\n");

  it("accepts the frontmatter of spec §12", () => {
    const result = lessonSchema.parse(frontmatter(valid));

    expect(result).toMatchObject({
      title: "Understanding Gradient Descent",
      order: 30,
      difficulty: "beginner",
      prerequisites: ["neural-networks/introduction"],
      publishedAt: "2026-09-04",
      draft: false,
    });
  });

  it("defaults prerequisites to an empty list and difficulty to absent", () => {
    const result = lessonSchema.parse(
      frontmatter(['title: "T"', 'description: "D"', "order: 10", 'publishedAt: "2026-09-04"'].join("\n")),
    );

    expect(result.prerequisites).toEqual([]);
    expect(result.difficulty).toBeUndefined();
  });

  it("rejects an invalid difficulty", () => {
    const result = lessonSchema.safeParse(
      frontmatter(
        ['title: "T"', 'description: "D"', "order: 10", 'difficulty: "hard"', 'publishedAt: "2026-09-04"'].join("\n"),
      ),
    );

    expect(result.success).toBe(false);
    expect(issues(result)).toEqual([
      'difficulty: Expected "beginner", "intermediate" or "advanced"',
    ]);
  });

  it("rejects a fractional or negative order", () => {
    const base = ['title: "T"', 'description: "D"', 'publishedAt: "2026-09-04"'];

    expect(lessonSchema.safeParse(frontmatter([...base, "order: 10.5"].join("\n"))).success).toBe(false);
    expect(lessonSchema.safeParse(frontmatter([...base, "order: -10"].join("\n"))).success).toBe(false);
    expect(lessonSchema.safeParse(frontmatter([...base, "order: 0"].join("\n"))).success).toBe(false);
  });

  it("requires publishedAt, which the sitemap and article metadata need", () => {
    const result = lessonSchema.safeParse(
      frontmatter(['title: "T"', 'description: "D"', "order: 10"].join("\n")),
    );

    expect(result.success).toBe(false);
    expect(issues(result)).toContain("publishedAt: Expected an ISO date, e.g. 2026-09-04");
  });

  it("rejects a prerequisite that is not a <topic-id>/<lesson-id> path", () => {
    const result = lessonSchema.safeParse(
      frontmatter(
        [
          'title: "T"',
          'description: "D"',
          "order: 10",
          'publishedAt: "2026-09-04"',
          "prerequisites:",
          '  - "Neural Networks"',
        ].join("\n"),
      ),
    );

    expect(result.success).toBe(false);
    expect(issues(result).join("\n")).toContain("prerequisites.0");
  });

  // The route derives from the path, and a second source of truth for it is
  // exactly the typo this project cannot afford (spec §12, §36).
  it.each(["topic", "slug"])("rejects a %s field, which derives from the path", (field) => {
    const result = lessonSchema.safeParse(
      frontmatter(
        ['title: "T"', 'description: "D"', "order: 10", 'publishedAt: "2026-09-04"', `${field}: "x"`].join("\n"),
      ),
    );

    expect(result.success).toBe(false);
    expect(issues(result).join("\n")).toContain(field);
  });
});
