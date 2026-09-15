import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";

/**
 * The content tree read straight from the filesystem, for the tests that audit
 * draft visibility (spec §16).
 *
 * Deliberately not `lib/content`. Those modules are what the draft audit is
 * auditing: asking `getAllBlogPosts` which posts are drafts would ask the code
 * under test to mark its own homework — a `showDrafts` stuck on `true` would
 * report no drafts to look for and every assertion would pass on an empty list.
 * `scripts/verify.mjs` reads the tree directly for the same reason.
 *
 * Nothing here filters, sorts or validates. It answers one question: what does
 * the repository actually contain, and which of it is unpublished.
 */
const CONTENT_ROOT = path.join(process.cwd(), "content");

export type ContentEntry = {
  /** The route the entry answers on, as a link to it would be written. */
  url: string;
  title: string;
  draft: boolean;
  /** `YYYY-MM-DD`; a bare YAML date parses as a `Date`, so both are normalised. */
  publishedAt: string;
  updatedAt?: string;
};

export type LessonEntry = ContentEntry & { topicId: string; lessonId: string };

/** Scaffolding and editor droppings are not content (spec §18). */
function isContentFile(name: string): boolean {
  return name.endsWith(".mdx") && !name.startsWith("_") && !name.startsWith(".");
}

async function frontmatterOf(file: string): Promise<Record<string, unknown>> {
  return matter(await readFile(file, "utf8")).data;
}

/**
 * A frontmatter date as `YYYY-MM-DD`, whether it was quoted in the file or left
 * bare for YAML to parse into a `Date`. The same normalisation
 * `lib/content/schemas.ts` performs — done again here, because the point of
 * this module is to answer from the file rather than from the code under test.
 */
function isoDate(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  return new Date(value as string | Date).toISOString().slice(0, 10);
}

/** Every post in `content/blog/`; the filename is the slug (spec §9.2). */
export async function blogEntries(): Promise<ContentEntry[]> {
  const root = path.join(CONTENT_ROOT, "blog");
  const entries = await readdir(root, { withFileTypes: true });

  return Promise.all(
    entries
      .filter((entry) => entry.isFile() && isContentFile(entry.name))
      .map(async (entry) => {
        const data = await frontmatterOf(path.join(root, entry.name));

        return {
          url: `/blog/${entry.name.slice(0, -".mdx".length)}`,
          title: String(data.title),
          draft: data.draft === true,
          publishedAt: isoDate(data.publishedAt) ?? "",
          updatedAt: isoDate(data.updatedAt),
        };
      }),
  );
}

/** Every lesson in `content/learn/`; the tree is the data model (spec §11.1). */
export async function lessonEntries(): Promise<LessonEntry[]> {
  const root = path.join(CONTENT_ROOT, "learn");
  const topics = await readdir(root, { withFileTypes: true });

  const byTopic = await Promise.all(
    topics
      .filter(
        (entry) =>
          entry.isDirectory() && !entry.name.startsWith("_") && !entry.name.startsWith("."),
      )
      .map(async (topic) => {
        const files = await readdir(path.join(root, topic.name), { withFileTypes: true });

        return Promise.all(
          files
            .filter((entry) => entry.isFile() && isContentFile(entry.name))
            .map(async (entry) => {
              const lessonId = entry.name.slice(0, -".mdx".length);
              const data = await frontmatterOf(path.join(root, topic.name, entry.name));

              return {
                topicId: topic.name,
                lessonId,
                url: `/learn/${topic.name}/${lessonId}`,
                title: String(data.title),
                draft: data.draft === true,
                publishedAt: isoDate(data.publishedAt) ?? "",
                updatedAt: isoDate(data.updatedAt),
              };
            }),
        );
      }),
  );

  return byTopic.flat();
}
