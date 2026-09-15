/**
 * Frontmatter validation, the one body rule that is not a matter of taste — MDX
 * files import nothing (spec §15) — and the cross-file checks per-file
 * validation cannot see (spec §18).
 *
 * Two callers share this module. The content utilities validate lazily, one
 * file at a time, as the build reads them; `scripts/validate-content.mjs`
 * validates every file eagerly before the build starts. Both get the same
 * severity rule and the same error text, because both come from here.
 *
 * The severity rule (spec §18, decisions 2026-09-07):
 *
 * | Content        | Invalid frontmatter                       |
 * |----------------|-------------------------------------------|
 * | `draft: false` | fails, with a non-zero exit code          |
 * | `draft: true`  | warns on stderr, and the file is skipped  |
 *
 * An unfinished draft must not break `pnpm dev` or block a deployment of
 * unrelated published content. A file whose `draft` field is itself unreadable
 * is treated as published, and fails — and so does every file of a content type
 * that has no `draft` field at all (`draftable: false`, see `ValidationOptions`).
 *
 * This module is imported by `scripts/validate-content.mjs` through Node's
 * TypeScript stripping, so it must stay free of path aliases, JSX and
 * non-erasable syntax.
 */
import { z } from "zod";

/** Where the learn content tree and the topic configuration live (spec §36). */
const LEARN_ROOT = "content/learn";
const TOPICS_MODULE = "lib/content/topics.ts";

export type Severity = "error" | "warning";

/**
 * One file's problems. `details` are already-formatted `field: expectation`
 * lines, so a reporter only has to decide where to print them.
 */
export type ContentIssue = {
  /** Repository-relative path, the file the author should open first. */
  file: string;
  severity: Severity;
  details: string[];
};

/** Thrown when published content carries invalid frontmatter. */
export class ContentValidationError extends Error {
  readonly issue: ContentIssue;

  constructor(issue: ContentIssue) {
    super(formatIssue(issue));
    this.name = "ContentValidationError";
    this.issue = issue;
  }
}

/**
 * Renders an issue the way spec §18 asks for — the file, then a line per
 * offending field naming the field and the expectation:
 *
 * ```text
 * content/blog/example.mdx
 *   publishedAt: Expected an ISO date, e.g. 2026-09-04 (received a Date)
 * ```
 */
export function formatIssue(issue: ContentIssue): string {
  return [issue.file, ...issue.details.map((detail) => `  ${detail}`)].join("\n");
}

/** Describes a value in the words an author would use, for the `received` note. */
function describeValue(value: unknown): string {
  if (value === undefined) return "nothing";
  if (value === null) return "null";
  if (value instanceof Date) return "a Date";
  if (Array.isArray(value)) return "a list";
  if (typeof value === "object") return "a mapping";
  if (typeof value === "string") return value.length <= 40 ? JSON.stringify(value) : "a long string";
  return String(value);
}

/** The raw value an issue is about, so the reader is told what they wrote. */
function valueAtPath(data: unknown, path: readonly PropertyKey[]): unknown {
  let current: unknown = data;
  for (const key of path) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<PropertyKey, unknown>)[key];
  }
  return current;
}

function detailFor(issue: z.core.$ZodIssue, data: unknown): string {
  if (issue.code === "unrecognized_keys") {
    const keys = issue.keys.join(", ");
    return `${keys}: Not a field this content type has — check the spelling`;
  }

  const field = issue.path.length > 0 ? issue.path.join(".") : "frontmatter";
  const received = valueAtPath(data, issue.path);
  const suffix = received === undefined ? "" : ` (received ${describeValue(received)})`;
  return `${field}: ${issue.message}${suffix}`;
}

/**
 * Whether a file counts as a draft for the purpose of choosing severity.
 *
 * Only a literal `draft: true` qualifies. A `draft` field that is missing, or
 * is a string, or is anything else unreadable, is treated as published — so a
 * broken draft flag fails loudly instead of quietly suppressing every other
 * error in the file.
 */
export function isDraftFrontmatter(data: unknown): boolean {
  return typeof data === "object" && data !== null && (data as { draft?: unknown }).draft === true;
}

/**
 * Whether the content type being validated has a `draft` flag at all.
 *
 * Only a type that does can have an invalid file downgraded to a warning: the
 * severity rule exists so an unfinished draft cannot block a deployment, and a
 * type with nothing to finish in private — a standalone page, reached from every
 * route's header (spec §24) — has no unfinished state to excuse. Without this,
 * writing `draft: true` on a page would warn and skip the file, which is the
 * opposite of what the author would be asking for.
 */
export type ValidationOptions = {
  /** Defaults to true, the behaviour posts and lessons want. */
  draftable?: boolean;
};

/**
 * Validates one file's frontmatter without deciding what to do about it.
 * Returns the parsed metadata, or the issue, classified by draft status.
 */
export function checkFrontmatter<Schema extends z.ZodType>(
  schema: Schema,
  data: unknown,
  file: string,
  { draftable = true }: ValidationOptions = {},
): { ok: true; metadata: z.output<Schema> } | { ok: false; issue: ContentIssue } {
  const result = schema.safeParse(data);
  if (result.success) return { ok: true, metadata: result.data };

  return {
    ok: false,
    issue: {
      file,
      severity: draftable && isDraftFrontmatter(data) ? "warning" : "error",
      details: result.error.issues.map((issue) => detailFor(issue, data)),
    },
  };
}

/**
 * The lazy path, for content utilities reading a file during a build: returns
 * the metadata, throws on invalid published content, and warns and returns
 * `null` for an invalid draft, which the caller then skips.
 */
export function parseFrontmatter<Schema extends z.ZodType>(
  schema: Schema,
  data: unknown,
  file: string,
  options: ValidationOptions = {},
): z.output<Schema> | null {
  const result = checkFrontmatter(schema, data, file, options);
  if (result.ok) return result.metadata;
  if (result.issue.severity === "error") throw new ContentValidationError(result.issue);

  console.warn(`Skipping draft with invalid frontmatter:\n${formatIssue(result.issue)}`);
  return null;
}

/**
 * A line that opens or closes a fenced code block — ``` or ~~~, optionally
 * indented by up to three spaces, which is as far as markdown allows before the
 * fence becomes an indented code block instead.
 */
const FENCE = /^ {0,3}(?:`{3,}|~{3,})/;

/** An ES module statement at the start of a line, outside a code fence. */
const MODULE_STATEMENT = /^ {0,3}(import|export)\b/;

/** The frontmatter delimiter: the `---` fence gray-matter reads between. */
const FRONTMATTER_DELIMITER = /^---\s*$/;

/**
 * MDX files import nothing (spec §15).
 *
 * The rule is not a style preference: `next-mdx-remote` strips `import` and
 * `export` from the source before compiling it, so `import Chart from "./chart"`
 * does not fail — it vanishes, and the component it named is then undefined when
 * the page renders. Components reach content only by being named in a registry.
 *
 * Takes the whole file, so the line it reports is the line the author's editor
 * shows. Frontmatter is skipped, as are code fences: a Python snippet in an
 * article is free to say `import numpy as np`, and so is an indented code block,
 * four spaces or more.
 *
 * Severity follows the same rule as frontmatter (spec §18): published content
 * fails, a draft warns, because an unfinished draft must not block a deployment
 * of everything else.
 */
export function checkBody(source: string, file: string, draft: boolean): ContentIssue | null {
  const lines = source.split("\n");
  const details: string[] = [];
  let insideFrontmatter = FRONTMATTER_DELIMITER.test(lines[0] ?? "");
  let insideFence = false;

  for (const [index, line] of lines.entries()) {
    if (insideFrontmatter) {
      // The opening delimiter is line 0; the next one closes the block.
      if (index > 0 && FRONTMATTER_DELIMITER.test(line)) insideFrontmatter = false;
      continue;
    }
    if (FENCE.test(line)) {
      insideFence = !insideFence;
      continue;
    }
    if (insideFence) continue;

    const match = MODULE_STATEMENT.exec(line);
    if (match === null) continue;

    details.push(
      `body: Line ${index + 1} is an \`${match[1]}\` statement, which is stripped before the ` +
        "MDX is compiled — a component reaches content by being named in a registry (spec §15)",
    );
  }

  if (details.length === 0) return null;
  return { file, severity: draft ? "warning" : "error", details };
}

/** A validated blog post, reduced to what the cross-file checks need. */
export type BlogRecord = {
  file: string;
  slug: string;
  draft: boolean;
};

/** A validated lesson, reduced to what the cross-file checks need. */
export type LessonRecord = {
  file: string;
  topicId: string;
  lessonId: string;
  order: number;
  draft: boolean;
  prerequisites: string[];
};

export type CrossFileInput = {
  posts: BlogRecord[];
  lessons: LessonRecord[];
  /** Directory names found under `content/learn/`. */
  topicDirectories: string[];
  /** Topic ids declared in `lib/content/topics.ts`. */
  configuredTopicIds: string[];
  /** Where those directories were read from; only a test passes anything else. */
  learnRoot?: string;
};

/**
 * A clash between two files matters only when both are visible. If either is a
 * draft it disappears in production, so it warns rather than failing.
 */
function clashSeverity(...drafts: boolean[]): Severity {
  return drafts.some(Boolean) ? "warning" : "error";
}

/**
 * The checks a single file cannot make about itself (spec §18):
 * topic directory ↔ `topics.ts` parity, `order` uniqueness within a topic,
 * prerequisite resolution, and blog slug uniqueness.
 *
 * Pure, and takes already-parsed records, so it is exercised directly by the
 * tests rather than only through the script.
 */
export function crossFileIssues({
  posts,
  lessons,
  topicDirectories,
  configuredTopicIds,
  learnRoot = LEARN_ROOT,
}: CrossFileInput): ContentIssue[] {
  const issues: ContentIssue[] = [];

  // Topic directory <-> topics.ts parity.
  const configured = new Set(configuredTopicIds);
  for (const directory of topicDirectories) {
    if (!configured.has(directory)) {
      issues.push({
        file: `${learnRoot}/${directory}`,
        severity: "error",
        details: [`topic: No "${directory}" entry in ${TOPICS_MODULE} — add one, or remove the directory`],
      });
    }
  }

  const directories = new Set(topicDirectories);
  for (const id of configuredTopicIds) {
    if (!directories.has(id)) {
      issues.push({
        file: TOPICS_MODULE,
        severity: "error",
        details: [`${id}: No ${learnRoot}/${id}/ directory — create it, or remove the entry`],
      });
    }
  }

  // `order` is unique within a topic (spec §13).
  const seenOrder = new Map<string, LessonRecord>();
  for (const lesson of lessons) {
    const key = `${lesson.topicId}/${lesson.order}`;
    const first = seenOrder.get(key);
    if (first === undefined) {
      seenOrder.set(key, lesson);
      continue;
    }
    issues.push({
      file: lesson.file,
      severity: clashSeverity(lesson.draft, first.draft),
      details: [`order: ${lesson.order} is already used by ${first.file}`],
    });
  }

  // Every prerequisite resolves to an existing, published lesson (spec §12).
  const byPath = new Map(lessons.map((lesson) => [`${lesson.topicId}/${lesson.lessonId}`, lesson]));
  for (const lesson of lessons) {
    const ownPath = `${lesson.topicId}/${lesson.lessonId}`;
    for (const prerequisite of lesson.prerequisites) {
      const target = byPath.get(prerequisite);
      if (prerequisite === ownPath) {
        issues.push({
          file: lesson.file,
          severity: lesson.draft ? "warning" : "error",
          details: [`prerequisites: "${prerequisite}" is the lesson itself`],
        });
      } else if (target === undefined) {
        issues.push({
          file: lesson.file,
          severity: lesson.draft ? "warning" : "error",
          details: [`prerequisites: "${prerequisite}" does not resolve to a lesson`],
        });
      } else if (target.draft && !lesson.draft) {
        issues.push({
          file: lesson.file,
          severity: "error",
          details: [`prerequisites: "${prerequisite}" is a draft, so it is not published`],
        });
      }
    }
  }

  // No two blog posts produce the same slug (spec §18).
  const seenSlug = new Map<string, BlogRecord>();
  for (const post of posts) {
    const first = seenSlug.get(post.slug);
    if (first === undefined) {
      seenSlug.set(post.slug, post);
      continue;
    }
    issues.push({
      file: post.file,
      severity: clashSeverity(post.draft, first.draft),
      details: [`slug: "${post.slug}" is already produced by ${first.file}`],
    });
  }

  return issues;
}
