#!/usr/bin/env node
// Eagerly validates every file under content/ — frontmatter against the Zod
// schemas, the body rule that MDX files import nothing (spec §15), plus the
// cross-file checks a single file cannot make about itself: topic directory
// <-> topics.ts parity, `order` uniqueness within a topic, prerequisite
// resolution and blog slug uniqueness (application spec §18).
//
// Exits non-zero when published content is invalid. Runs as `prebuild` and in
// CI, so a broken post cannot reach a deployment. Invalid *drafts* warn and are
// skipped: an unfinished draft must not block a deployment of unrelated
// published content.
//
// The rules themselves live in lib/content/schemas.ts and lib/content/validate.ts
// and are shared with the content utilities, which apply them lazily as the
// build reads each file. This script is only the walk, the report and the exit
// code.
//
//   pnpm validate:content                                checks content/
//   node scripts/validate-content.mjs <dir> [topics.ts]  checks another tree,
//                                                        for tests
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

// The schemas are TypeScript, because the application imports them too. Node
// strips types natively from v23.6; older releases need the flag, so re-exec
// once rather than pinning a flag in package.json that a future Node may drop.
// `process.features.typescript` is the documented way to ask (Node v22.10+).
if (!process.features.typescript) {
  const { status } = spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--disable-warning=ExperimentalWarning",
      fileURLToPath(import.meta.url),
      ...process.argv.slice(2),
    ],
    { stdio: "inherit" },
  );
  process.exit(status ?? 1);
}

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_ROOT = path.resolve(process.argv[2] ?? path.join(REPOSITORY_ROOT, "content"));

// The topic configuration is a second argument for the same reason the content
// root is the first one: a test hands the script a tree of its own, and topic
// parity is meaningless unless the topics it is checked against come from that
// tree too. Without it every test tree would have to mirror whichever topics
// the author happens to have today.
const TOPICS_MODULE = path.resolve(
  process.argv[3] ?? path.join(REPOSITORY_ROOT, "lib", "content", "topics.ts"),
);

const load = (relativePath) =>
  import(pathToFileURL(path.resolve(REPOSITORY_ROOT, relativePath)).href);
const { blogPostSchema, lessonSchema } = await load("lib/content/schemas.ts");
const { checkBody, checkFrontmatter, crossFileIssues, formatIssue, isDraftFrontmatter } =
  await load("lib/content/validate.ts");

const gray = await import("gray-matter");
const matter = gray.default;

/** How a path is named in a report: relative to where the command was run. */
const display = (absolutePath) => path.relative(process.cwd(), absolutePath) || ".";

/** Scaffolding and dotfiles are not content: a `_` or `.` prefix excludes a file. */
const isIgnored = (name) => name.startsWith(".") || name.startsWith("_");

const isMdx = (name) => name.endsWith(".mdx");

async function readDirectory(directory) {
  if (!existsSync(directory)) return [];
  const entries = await readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => !isIgnored(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Reads one file's frontmatter and its source, or reports why it could not be read. */
async function readContentFile(file) {
  const source = await readFile(file, "utf8");
  try {
    return { ok: true, data: matter(source).data, source };
  } catch (error) {
    return {
      ok: false,
      issue: {
        file: display(file),
        severity: "error",
        details: [`frontmatter: Could not be parsed as YAML — ${error.message.split("\n")[0]}`],
      },
    };
  }
}

const issues = [];
const posts = [];
const lessons = [];
const topicDirectories = [];
let filesChecked = 0;

const report = (file, severity, detail) =>
  issues.push({ file: display(file), severity, details: [detail] });

/** Validates one content file and returns its metadata, or null if invalid. */
async function validateFile(file, schema) {
  filesChecked += 1;
  const contentFile = await readContentFile(file);
  if (!contentFile.ok) {
    issues.push(contentFile.issue);
    return null;
  }

  // The body rule is reported alongside the frontmatter ones rather than
  // instead of them: an author fixing one file should see everything wrong with
  // it in a single run. Draft status is read from the raw frontmatter, so a
  // draft still only warns even when its metadata is what is broken.
  const draft = isDraftFrontmatter(contentFile.data);
  const bodyIssue = checkBody(contentFile.source, display(file), draft);
  if (bodyIssue !== null) issues.push(bodyIssue);

  const result = checkFrontmatter(schema, contentFile.data, display(file));
  if (result.ok) return result.metadata;

  issues.push(result.issue);
  return null;
}

// --- content/blog: flat .mdx files, one per post --------------------------
const blogRoot = path.join(CONTENT_ROOT, "blog");
for (const entry of await readDirectory(blogRoot)) {
  const file = path.join(blogRoot, entry.name);

  if (entry.isDirectory()) {
    report(file, "error", "path: Blog posts are flat files in content/blog/; a subdirectory has no route");
    continue;
  }
  if (!isMdx(entry.name)) {
    report(file, "warning", "path: Not an .mdx file, so nothing will read it");
    continue;
  }

  const metadata = await validateFile(file, blogPostSchema);
  if (metadata !== null) {
    posts.push({
      file: display(file),
      slug: entry.name.replace(/\.mdx$/, ""),
      draft: metadata.draft,
    });
  }
}

// --- content/learn/<topic>/<lesson>.mdx -----------------------------------
const learnRoot = path.join(CONTENT_ROOT, "learn");
for (const entry of await readDirectory(learnRoot)) {
  const topicPath = path.join(learnRoot, entry.name);

  if (!entry.isDirectory()) {
    const detail = isMdx(entry.name)
      ? "path: A lesson lives in a topic directory, content/learn/<topic>/<lesson>.mdx"
      : "path: Not an .mdx file, so nothing will read it";
    report(topicPath, isMdx(entry.name) ? "error" : "warning", detail);
    continue;
  }

  topicDirectories.push(entry.name);

  for (const lessonEntry of await readDirectory(topicPath)) {
    const file = path.join(topicPath, lessonEntry.name);

    if (lessonEntry.isDirectory()) {
      report(file, "error", "path: Lessons are exactly two levels deep, content/learn/<topic>/<lesson>.mdx");
      continue;
    }
    if (!isMdx(lessonEntry.name)) {
      report(file, "warning", "path: Not an .mdx file, so nothing will read it");
      continue;
    }

    const metadata = await validateFile(file, lessonSchema);
    if (metadata !== null) {
      lessons.push({
        file: display(file),
        topicId: entry.name,
        lessonId: lessonEntry.name.replace(/\.mdx$/, ""),
        order: metadata.order,
        draft: metadata.draft,
        prerequisites: metadata.prerequisites,
      });
    }
  }
}

// --- topic presentation data ----------------------------------------------
// A topic's identity is its directory name; this file only says how to display
// it. Parity between the two is checked below (spec §11.1).
let configuredTopicIds = [];
if (existsSync(TOPICS_MODULE)) {
  const topicsModule = await load(TOPICS_MODULE);
  const topics = topicsModule.learningTopics ?? topicsModule.default;
  if (!Array.isArray(topics)) {
    report(TOPICS_MODULE, "error", "learningTopics: Expected an exported array of topics");
  } else {
    configuredTopicIds = topics.map((topic) => topic.id);
  }
}

issues.push(
  ...crossFileIssues({
    posts,
    lessons,
    topicDirectories,
    configuredTopicIds,
    learnRoot: display(learnRoot),
  }),
);

// --- report ----------------------------------------------------------------
const errors = issues.filter((issue) => issue.severity === "error");
const warnings = issues.filter((issue) => issue.severity === "warning");

for (const issue of [...warnings, ...errors]) {
  console.error(`\n${issue.severity}  ${formatIssue(issue).trimStart()}`);
}

const count = (n, noun) => `${n} ${noun}${n === 1 ? "" : "s"}`;
const summary = `validate:content: ${count(filesChecked, "file")} checked, ${count(
  errors.length,
  "error",
)}, ${count(warnings.length, "warning")}`;

if (errors.length > 0) {
  console.error(`\n${summary}`);
  process.exit(1);
}

console.log(summary);
