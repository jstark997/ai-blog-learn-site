# AI Blog and Learning Platform
## Phase 1 Application Specification

---

# 0. Document Status and Conventions

This document is the authoritative statement of Phase 1 requirements.

Companion documents in this repository:

```text
docs/development-plan.md   implementation sequence
docs/decisions.md          architecture decision log
CLAUDE.md                  standing rules for coding agents
```

Where this document says **DECIDED**, the choice is already made and the
coding agent must implement it as written rather than selecting an
alternative. Where it says **AGENT'S CHOICE**, the agent may choose, but must
record the choice and its reasoning in `docs/decisions.md`.

Coding agents must not edit this document or `docs/development-plan.md`.
Agents may and should append to `docs/decisions.md`.

---

## 1. Purpose

Build a web application that serves two closely related purposes:

1. **Blog**  
   A publishing platform for essays, observations, opinions, and reflections about artificial intelligence.

2. **Learn**  
   A structured educational platform for explaining AI and deep-learning concepts through written explanations, mathematics, code examples, diagrams, animations, and interactive React-based demonstrations.

The site should present these as two complementary parts of one broader project rather than as separate products.

A suitable conceptual identity is:

> Explore how artificial intelligence works and what it means.

The Blog primarily addresses ideas, observations, and implications.

The Learn section primarily addresses how AI systems work.

---

# 2. Phase 1 Goals

Phase 1 should deliver a polished, deployable, single-author website that:

- supports publishing blog posts;
- supports publishing structured educational lessons;
- allows lessons to embed interactive React components;
- stores all editorial content as MDX files in Git;
- requires no database;
- requires no user accounts;
- requires no administrative interface;
- uses Git as the publishing and version-control workflow;
- supports draft content;
- supports local previewing;
- supports production deployment from the main Git branch;
- supports preview deployments from feature branches or pull requests;
- provides a maintainable content model suitable for future expansion.

The application should be usable as a real public website at the completion of Phase 1.

---

# 3. Explicit Non-Goals for Phase 1

Do not implement the following unless required for basic infrastructure:

- PostgreSQL
- FastAPI
- authentication
- user registration
- user profiles
- saved lesson progress
- comments
- forums
- quizzes requiring persistent storage
- certificates
- gamification
- course enrollment
- AI-generated site content
- AI chatbot or AI tutor
- user-submitted content
- admin dashboard
- content-management system
- search backed by an external service
- runtime model inference
- server-hosted PyTorch models
- analytics requiring custom backend infrastructure
- separate Labs or Demos section

Interactive demonstrations should live inside individual Learn lessons.

## 3.1 Note on "AI-Generated Site Content"

The non-goal above refers to published editorial material. The sample Blog
posts and Learn lessons created during Phase 1 are **scaffolding, not
publications** — they exist to exercise the architecture.

Therefore:

- sample content may be published (`draft: false`) only where an index page
  needs published entries to be demonstrated;
- every such file must open with a visible placeholder callout, for example
  `<Callout variant="warning">Placeholder content — to be replaced before
  launch.</Callout>`;
- the site must not be pointed at a public production domain until the author
  has replaced the placeholder prose with his own writing.

A coding agent must not quietly present its own generated prose about
backpropagation or attention as finished editorial content.

---

# 4. Technology Stack

## 4.1 Frontend

Use:

- **Next.js**
- **React**
- **TypeScript**
- **Next.js App Router**

The application should favor static generation and server components for content-heavy pages while using client components only where browser interactivity is necessary.

## 4.2 Styling

Use:

- Tailwind CSS

The design system should be implemented using reusable layout and typography primitives rather than ad hoc page-level styling.

## 4.3 Content

Use:

- Markdown
- MDX
- YAML frontmatter

MDX files should be committed directly to the Git repository.

**DECIDED — MDX integration strategy.**

Content lives in `content/`, outside `app/`, so file-routed MDX (`@next/mdx`
page files) does not apply. Compile MDX at build time from the filesystem
using:

```text
next-mdx-remote/rsc     MDX compilation inside React Server Components
gray-matter             frontmatter extraction
```

`MDXRemote` from `next-mdx-remote/rsc` renders inside a Server Component, so
ordinary articles ship no MDX runtime to the browser.

Do not:

- create route handlers or API routes to read local content;
- fetch MDX over HTTP at runtime;
- use the legacy client-side `serialize()` flow.

This is the single highest-risk integration decision in the project and it is
therefore not left to the implementing agent.

## 4.4 Validation

Use:

- Zod

**DECIDED — when validation runs.**

Next.js has no application-startup hook, so validation happens in two places:

1. lazily, the first time a content utility reads a file during the build;
2. eagerly, via a dedicated script:

```bash
pnpm validate:content
```

`validate:content` walks every file under `content/`, validates frontmatter,
checks cross-file references, and exits non-zero on failure. It runs as a
`prebuild` step and in CI.

Severity depends on draft status (see §18):

- published content (`draft: false`) — invalid frontmatter **fails** the build;
- draft content (`draft: true`) — invalid frontmatter **warns** and the file is
  skipped, so an unfinished draft never breaks `pnpm dev` or blocks a
  deployment of unrelated content.

## 4.5 Source Control

Use Git.

Assume GitHub is the remote Git hosting provider unless otherwise configured.

## 4.6 Deployment

The application should be deployable to Vercel or another Next.js-compatible hosting provider.

The architecture must not depend on Vercel-specific APIs unless required and
documented. Two documented exceptions are permitted:

- `next/image` optimization requires a running Node server or a configured
  loader; a pure static export would need `images.unoptimized: true`;
- draft gating reads `process.env.VERCEL_ENV` when present, with `SHOW_DRAFTS`
  as the host-neutral override (see §16).

Both are isolated behind small helpers so that changing host touches one file.

---

## 4.7 Pinned Dependency Versions

**DECIDED.** The agent must not "use the latest". Latest drifts, and an
agent's training data may predate it — the classic result is Next 14-style
synchronous `params` written against a Next 16 scaffold, or a
`tailwind.config.ts` created for a Tailwind 4 project that no longer uses one.

Install these lines. Verified current 2026-09-07:

```text
next                    16.3.x
react                   19.2.x
react-dom               19.2.x
typescript               5.9.x     (see note)
tailwindcss              4.3.x
@tailwindcss/postcss     4.3.x
zod                      4.5.x
next-mdx-remote          6.0.x
gray-matter              4.0.x
remark-math              6.0.x
rehype-katex             7.0.x
katex                    0.18.x
rehype-pretty-code       0.14.x
shiki                    4.4.x
vitest                   5.0.x
@testing-library/react  16.3.x
```

Version-specific facts the agent must respect:

- **Next.js 16, App Router.** `params` and `searchParams` are Promises and must
  be awaited in every route and `generateMetadata`. Code written for the
  Next 14 synchronous API will not compile. Read the installed version in
  `package.json` before writing any route.
- **Tailwind CSS 4.** Configuration is CSS-first: `@import "tailwindcss"` in
  `app/globals.css` plus a `@theme` block. There is no `tailwind.config.ts` by
  default — do not create one out of habit, and do not use the v3 directives
  `@tailwind base/components/utilities`.
- **TypeScript.** `typescript@latest` currently resolves to the 7.x native
  compiler. Phase 1 pins the 5.9 line because the surrounding lint and editor
  toolchain is still settling. Revisit later and record the outcome in
  `docs/decisions.md`.
- **Zod 4.** Error shapes differ from Zod 3; format errors from `error.issues`
  or `z.treeifyError`, not the removed Zod 3 helpers.
- **React 19.** `ref` is an ordinary prop; `forwardRef` is unnecessary in new
  components.

Pin `next`, `react`, `react-dom` and `tailwindcss` to exact versions in
`package.json`. Commit `pnpm-lock.yaml`. Record the resolved versions of
everything in `docs/decisions.md`.

## 4.8 Package Manager

**DECIDED — pnpm, exclusively.** `package.json` must carry a `packageManager`
field. See the development plan for the full rule.

---

# 5. High-Level Architecture

Phase 1 should have only one application runtime:

```text
Browser
   |
   v
Next.js Application
   |
   +--- Blog MDX files
   |
   +--- Learn MDX files
   |
   +--- React interactive components
   |
   +--- Static images and assets
```

There should be no separate backend service in Phase 1.

The architecture should nevertheless leave room for a later system such as:

```text
Next.js
   |
   +--- MDX content
   |
   +--- React educational UI
   |
   +--- FastAPI
           |
           +--- PyTorch
           +--- Transformers
           +--- NumPy
           +--- scikit-learn
           |
           +--- PostgreSQL
```

Phase 1 code should not prematurely implement abstractions for infrastructure that does not yet exist.

---

# 6. Repository Structure

Use a structure similar to:

```text
/
├── CLAUDE.md
├── docs/
│   ├── application-spec.md
│   ├── development-plan.md
│   └── decisions.md
│
├── app/
│   ├── page.tsx
│   ├── blog/
│   │   ├── page.tsx
│   │   └── [slug]/
│   │       └── page.tsx
│   ├── learn/
│   │   ├── page.tsx
│   │   └── [topic]/
│   │       ├── page.tsx
│   │       └── [lesson]/
│   │           └── page.tsx
│   ├── about/
│   │   └── page.tsx
│   ├── layout.tsx
│   ├── not-found.tsx
│   ├── robots.ts
│   ├── rss.xml/
│   │   └── route.ts
│   └── sitemap.ts
│
├── components/
│   ├── layout/
│   ├── navigation/
│   ├── content/
│   ├── mdx/
│   └── learn/
│       ├── neural-networks/
│       ├── transformers/
│       └── shared/
│
├── content/
│   ├── blog/
│   └── learn/
│       ├── neural-networks/
│       ├── transformers/
│       └── llms/
│
├── lib/
│   ├── content/
│   │   ├── blog.ts
│   │   ├── learn.ts
│   │   ├── schemas.ts
│   │   └── mdx.ts
│   └── utils/
│
├── public/
│   └── images/
│       ├── blog/
│       └── learn/
│
├── scripts/
│   ├── validate-content.mjs
│   └── verify.mjs
│
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── package.json
├── tsconfig.json
└── README.md
```

Exact naming may vary, but content, presentation components, and content-loading logic should remain clearly separated.

---

# 7. Top-Level Information Architecture

The primary public navigation should contain:

- Home
- Blog
- Learn
- About

Do not include a separate Labs or Demos page.

Interactive educational features belong inside Learn.

---

# 8. Home Page

The homepage should establish the site's identity and direct visitors to both major content areas.

It should contain:

## 8.1 Hero Section

Include:

- site name;
- short description;
- primary positioning statement;
- link to Blog;
- link to Learn.

Example conceptual text:

> Exploring how artificial intelligence works and what it means.

Actual copy should be configurable rather than deeply embedded throughout the application.

## 8.2 Recent Blog Posts

Display a small number of recent published posts.

Each entry should show:

- title;
- publication date;
- description or excerpt;
- tags if appropriate.

## 8.3 Featured Learning Content

Display selected lessons or learning topics.

Initially this may be manually configured rather than algorithmically determined.

## 8.4 Site Introduction

Briefly explain the distinction:

- Blog = ideas, observations, and commentary;
- Learn = explanations and interactive learning.

---

# 9. Blog

## 9.1 Blog Index

Route:

```text
/blog
```

Display all published blog posts in reverse chronological order.

Each listing should include:

- title;
- description;
- publication date;
- optional updated date;
- tags.

Draft posts must not appear in production.

## 9.2 Blog Post Route

Route:

```text
/blog/[slug]
```

Example:

```text
/blog/why-ai-agents-need-deterministic-software
```

Each post page should display:

- title;
- description;
- publication date;
- updated date when applicable;
- tags;
- article content.

The blog post should support:

- headings;
- paragraphs;
- lists;
- blockquotes;
- tables;
- images;
- code blocks;
- inline code;
- mathematical notation if the selected MDX stack supports it cleanly;
- internal links;
- external links.

## 9.3 Blog File Format

Example:

```mdx
---
title: "Why AI Agents Need Deterministic Software"
description: "A discussion of where deterministic application logic should complement probabilistic AI systems."
publishedAt: "2026-09-04"
updatedAt: "2026-09-04"
tags:
  - agents
  - architecture
  - llms
draft: false
---

AI agents are powerful, but...
```

---

# 10. Blog Content Schema

Create a Zod schema equivalent to:

```ts
type BlogPostMetadata = {
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  tags: string[];
  draft: boolean;
};
```

Validation requirements:

- `title` is required;
- `description` is required;
- `publishedAt` must be a valid ISO-format date;
- `updatedAt`, if present, must be valid;
- `tags` must be an array;
- `draft` is required or defaults predictably to `false`.

Optional future-compatible properties may include:

```text
featured
canonicalUrl
coverImage
```

Do not implement functionality for them unless useful in Phase 1.

---

# 11. Learn Section

## 11.1 Learn Index

Route:

```text
/learn
```

The Learn page should present educational content by topic rather than only as a chronological list.

Initial topic groups should support examples such as:

- Neural Networks
- Transformers
- Large Language Models

The system should not hard-code those three categories in a way that prevents
additional topics from being added through content metadata or configuration.

**DECIDED — a topic has exactly one source of truth.**

The directory name under `content/learn/` is the topic's canonical identifier
and its URL segment:

```text
content/learn/neural-networks/   ->  topic id "neural-networks"
                                     route  /learn/neural-networks
```

`lib/content/topics.ts` maps that id to presentation data only:

```ts
{ id: "neural-networks", title: "Neural Networks", order: 1, description?: string }
```

Lesson frontmatter must **not** contain a `topic` field. A display name stored
in three places — directory, frontmatter and config — drifts, and a typo such
as `"Neural networks"` would silently produce a second group on the Learn
index with no error anywhere.

`validate:content` fails if a directory under `content/learn/` has no entry in
`topics.ts`, or an entry in `topics.ts` has no directory.

## 11.2 Lesson Routes

Lessons should support nested URLs.

Examples:

```text
/learn/neural-networks/gradient-descent
/learn/neural-networks/backpropagation
/learn/transformers/attention
/learn/transformers/embeddings
```

**DECIDED — explicit nested dynamic segments, not a catch-all.**

```text
app/learn/page.tsx                     ->  /learn
app/learn/[topic]/page.tsx             ->  /learn/neural-networks
app/learn/[topic]/[lesson]/page.tsx    ->  /learn/neural-networks/attention
```

Learn content is exactly two levels deep. A catch-all (`[...slug]`) would
force a `slug.length` branch to tell topic pages from lesson pages and makes
`generateStaticParams` harder to reason about for no benefit.

The topic overview route `/learn/[topic]` is **required**, not optional. §13
specifies a "topic overview link" on every lesson page and that link needs a
destination. The topic page lists the topic's lessons in order with their
descriptions.

## 11.3 Lesson Content

Lessons may contain:

- conceptual explanation;
- mathematical explanation;
- implementation examples;
- diagrams;
- interactive components;
- animations;
- explanatory callouts;
- prerequisites;
- navigation to previous and next lessons.

A desirable instructional pattern is:

```text
Intuition
    ↓
Mathematics
    ↓
Implementation
    ↓
Interactive demonstration
```

Not every lesson must use all four.

---

# 12. Lesson Content Schema

Each lesson carries frontmatter of exactly this shape:

```mdx
---
title: "Understanding Gradient Descent"
description: "An intuitive and mathematical introduction to gradient descent."
order: 30
difficulty: "beginner"
prerequisites:
  - "neural-networks/introduction"
publishedAt: "2026-09-04"
draft: false
---

Gradient descent is...

<GradientDescentDemo />
```

Schema:

```ts
type LessonMetadata = {
  title: string;
  description: string;
  order: number;                 // sparse; see §13
  difficulty?: "beginner" | "intermediate" | "advanced";
  prerequisites?: string[];      // "<topic-id>/<lesson-id>" route paths
  publishedAt: string;           // required
  updatedAt?: string;            // omit until the lesson is actually revised
  draft: boolean;                // defaults to false
};
```

Note that the `title` is rendered by the lesson page template, so the MDX body
must not repeat it as an `<h1>`. Body headings start at `##`.

**DECIDED — fields deliberately absent.**

- No `topic`: derived from the parent directory (§11.1).
- No `slug`: derived from the filename.

The route derives entirely from the path:

```text
content/learn/neural-networks/gradient-descent.mdx
    ->  /learn/neural-networks/gradient-descent
```

**DECIDED — dates.**

`publishedAt` is required on lessons as well as posts. §25 requires a
publication date in article metadata and the sitemap needs a `lastmod`;
`updatedAt` alone supplies neither for a lesson that has never been revised.

Both date fields are parsed with a Zod preprocessor, **not** a bare
`z.string()`:

```ts
const isoDate = z.preprocess(
  (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected an ISO date, e.g. 2026-09-04"),
);
```

YAML parses an unquoted `2026-09-04` into a JavaScript `Date`, not a string, so
a bare `z.string()` schema would reject every date the author forgot to quote.
The same preprocessor is used for Blog `publishedAt` and `updatedAt`.

**DECIDED — prerequisites.**

Each entry is a `<topic-id>/<lesson-id>` route path that must resolve to an
existing non-draft lesson. `validate:content` fails on an unresolvable
prerequisite. Lesson pages render prerequisites as links, using the target
lesson's own title.

If a prerequisite is a general skill rather than a lesson — "comfort with
partial derivatives" — state it in the lesson prose. Do not invent an
identifier such as `basic-algebra` that points at nothing, as the earlier
draft of this specification did.

---

# 13. Lesson Ordering and Navigation

Lessons have explicit ordering from the `order` frontmatter field.

**DECIDED — sparse ordering in multiples of ten**, so a lesson can be inserted
later without renumbering an entire topic:

```text
10 Introduction to Neural Networks
20 Activation Functions
30 Gradient Descent
40 Backpropagation
```

Rules the content utilities must enforce:

- `order` is a positive integer;
- `order` is unique within a topic — `validate:content` fails on a duplicate
  and names both files, because adjacent-lesson navigation is otherwise
  undefined;
- sorting is by `order` ascending with lesson id ascending as a deterministic
  tiebreak (a safety net; duplicates are already a validation error);
- draft lessons are removed **before** adjacency is computed, so previous/next
  never point at a hidden lesson in production.

Lesson pages should support:

- topic overview link;
- previous lesson;
- next lesson.

Navigation should be generated from content metadata rather than manually encoded into every lesson.

---

# 14. Interactive Learning Components

Interactive demonstrations should be implemented as React components and embedded directly into lesson MDX.

Example:

```mdx
## Experiment With the Learning Rate

Move the slider and observe how the optimizer behaves.

<GradientDescentDemo />
```

The implementation might reside at:

```text
components/learn/neural-networks/GradientDescentDemo.tsx
```

## 14.1 Phase 1 Requirements

Interactive components should:

- run entirely in the browser;
- require no backend;
- use deterministic or locally generated data where possible;
- be reusable;
- be keyboard accessible where practical;
- work on desktop and mobile layouts;
- isolate visualization logic from surrounding article content;
- render with **SVG rather than `<canvas>`** — SVG is inspectable, styleable,
  themeable, and reachable by assistive technology, whereas a canvas is an
  opaque bitmap that needs a parallel accessible representation built
  alongside it;
- carry accessibility from the first commit rather than as a later polish
  pass: labelled controls, keyboard-operable sliders and buttons, visible
  focus rings, and a live text summary of current state (for example
  "step 7, x = 0.42, loss = 0.18") that conveys the point without the
  picture.

## 14.2 Possible Initial Demonstrations

The architecture should support demonstrations such as:

- gradient descent;
- activation functions;
- neural network forward propagation;
- backpropagation;
- embeddings;
- cosine similarity;
- tokenization;
- attention;
- simple decision boundaries.

Only a small number need to exist for Phase 1.

A reasonable initial implementation target is 2–3 polished demonstrations.

---

# 15. MDX Component Registry

Create a controlled MDX component mapping rather than allowing arbitrary
imports throughout every MDX file.

**DECIDED — two registries, not one.**

A single registry holding every demo places every interactive component in the
module graph of every MDX-rendering page, which directly contradicts §30
("minimal client-side JavaScript on ordinary article pages"). Split it:

```ts
// components/mdx/registry.ts — always available, server-rendered
export const proseComponents = {
  Callout,
  Figure,
  Equation,
  ExternalLink,
  a: MdxLink,
  img: MdxImage,
};

// components/learn/registry.ts — interactive demos, lazily loaded
export const demoComponents = {
  ActivationFunctionExplorer: dynamic(
    () => import("./neural-networks/ActivationFunctionExplorer"),
  ),
  GradientDescentDemo: dynamic(
    () => import("./neural-networks/GradientDescentDemo"),
  ),
};
```

- Blog pages render with `proseComponents` only.
- Lesson pages render with `{ ...proseComponents, ...demoComponents }`.
- Every demo is wrapped in `next/dynamic`, so its JavaScript loads only on the
  lessons that actually use it.

The MDX integration strategy itself is decided in §4.3 and is not the
implementing agent's choice.

---

# 16. Draft Content

Both Blog and Learn must support drafts.

Example:

```yaml
draft: true
```

**DECIDED — one helper decides draft visibility everywhere.**

```ts
// lib/content/env.ts
export const showDrafts =
  process.env.SHOW_DRAFTS === "true" ||
  (process.env.VERCEL_ENV ?? process.env.NODE_ENV) !== "production";
```

Every index, route generator, sitemap entry and feed item consults this single
helper. No component reads `NODE_ENV` directly.

**Why not `NODE_ENV` alone.** A Vercel preview deployment is a *production*
Next.js build (`NODE_ENV === "production"`), so a `NODE_ENV`-only rule would
hide drafts on preview URLs — exactly where §33 says drafts most need
reviewing, for math rendering, diagrams, and responsive layout. `VERCEL_ENV`
distinguishes `production` from `preview`; `SHOW_DRAFTS` is the host-neutral
override for any other provider.

Resulting behaviour:

| Environment | Drafts visible |
|---|---|
| `pnpm dev` | yes |
| local `pnpm build && pnpm start` | yes, unless `SHOW_DRAFTS=false` |
| preview deployment (branch or pull request) | yes |
| production deployment from `main` | no |

Production requirements:

- draft content must not appear in any index, on the homepage, in the sitemap,
  or in the RSS feed;
- draft routes must not be statically generated;
- **a draft URL entered directly must return 404.** Omitting a route from
  `generateStaticParams` is not sufficient: Next.js defaults `dynamicParams`
  to `true` and will render the page on demand. Each dynamic content route must
  therefore both

  ```ts
  export const dynamicParams = false;
  ```

  and call `notFound()` when a resolved entry is a draft and `showDrafts` is
  false. Implement both — they are cheap, and the failure mode is a leaked
  unpublished post.

Development and preview requirements:

- drafts are visible;
- every draft page, and every draft entry in a listing, renders an
  unmistakable `DRAFT` badge;
- invalid frontmatter in a draft warns and skips the file rather than failing
  the build (§18).

Do not implement authentication-based draft previewing in Phase 1.

---

# 17. Content Loading

Implement content utilities that:

1. discover MDX files;
2. parse frontmatter;
3. validate metadata;
4. fail the build on invalid published metadata and skip invalid drafts with a
   warning (§18);
5. filter drafts appropriately;
6. sort content;
7. expose typed metadata to page components.

Representative APIs may include:

```ts
getAllBlogPosts()
getBlogPostBySlug(slug)

getAllLessons()
getLessonsByTopic(topicId)
getLessonByPath(topicId, lessonId)
getAdjacentLessons(topicId, lessonId)
```

Exact names are flexible.

---

# 18. Content Validation

All frontmatter must be validated using Zod.

The build should fail with a descriptive error containing:

- content file;
- invalid field;
- expected value or type.

For example:

```text
Invalid frontmatter in content/blog/example.mdx

publishedAt:
Expected ISO date string.
```

Do not silently ignore invalid metadata.

**DECIDED — severity depends on draft status.**

| Content | Invalid frontmatter |
|---|---|
| `draft: false` | build fails with a non-zero exit code |
| `draft: true` | warning on stderr, file skipped |

An unfinished draft missing a `description` must not break `pnpm dev` or block
a deployment of unrelated published content. A file whose `draft` field is
itself unreadable is treated as published, and fails.

This resolves the contradiction in the earlier draft of this specification,
where §17 said "reject malformed entries" and §18 said "do not silently
ignore" — leaving the agent to guess between skipping and failing.

`validate:content` performs the same per-file checks eagerly, plus the
cross-file checks that per-file validation cannot see:

- every `content/learn/<topic>/` directory has a `topics.ts` entry and vice
  versa;
- `order` is unique within each topic;
- every `prerequisites` entry resolves to an existing non-draft lesson;
- no two blog posts produce the same slug.

`validate:content` runs as `prebuild` and in CI.

---

# 19. Code Blocks

Technical lessons will frequently contain code.

Support syntax-highlighted code blocks for at least:

- Python
- TypeScript
- JavaScript
- JSON
- Bash
- YAML

Code blocks should:

- be readable in both light and dark mode (the site supports both);
- horizontally scroll instead of breaking layouts;
- preserve indentation;
- optionally support a copy button.

The copy button is desirable but not mandatory for initial completion.

**DECIDED — highlighting and theming.**

Use `rehype-pretty-code` over `shiki`, configured with a dual theme:

```ts
{ theme: { light: "github-light", dark: "github-dark" } }
```

Shiki highlights at build time, so no highlighter JavaScript reaches the
browser. The dual-theme option emits both colour sets and lets CSS choose
between them, so nothing is re-highlighted when the theme changes.

The site supports light and dark mode, via `prefers-color-scheme` plus a
`class="dark"` strategy on `<html>`. This is decided now rather than during a
later polish phase because Shiki's theme configuration and Tailwind's `dark:`
variants both depend on it, and retrofitting a theme strategy means revisiting
every component.

---

# 20. Mathematical Content

The Learn section should support mathematical notation.

Example:

```text
Attention(Q,K,V) =
softmax(QKᵀ / √dₖ)V
```

**DECIDED — KaTeX.**

```text
remark-math      parses $inline$ and $$block$$ inside MDX
rehype-katex     renders to HTML at build time
katex            stylesheet, imported once in the root layout
```

KaTeX renders during the build, so no math JavaScript reaches the browser and
no server-side Python is involved. Import `katex/dist/katex.min.css` in
`app/layout.tsx`; omitting it is the usual cause of "the equations render as
plain text".

The implementation should support:

- inline math;
- block equations.

The solution should not require a server-side Python dependency.

---

# 21. Images and Static Assets

Store static editorial images under:

```text
/public/images
```

Recommended structure:

```text
/public/images/blog
/public/images/learn
```

Lessons may also use React-based diagrams when interactivity is desirable.

Use Next.js image optimization where practical.

Note the hosting trade-off recorded in §4.6: `next/image` optimization needs a
running Node server or a configured loader. If the site is ever exported
statically, `images.unoptimized` must be set. Keep image usage behind a small
MDX `Figure` component so that this stays a one-file change.

Images should include alt text.

---

# 22. Site Navigation

The global header should include:

- site logo or name;
- Home;
- Blog;
- Learn;
- About.

On mobile:

- navigation should collapse appropriately;
- navigation must remain keyboard accessible.

The Learn section may include secondary navigation for topics and lessons.

Avoid over-engineered navigation in Phase 1.

---

# 23. Learn Navigation

Desktop lesson pages should support a useful topic-level navigation model.

Possible implementation:

```text
Neural Networks

Introduction
Activation Functions
Gradient Descent
Backpropagation
```

Current lesson should be visibly indicated.

On small screens, this may become:

- collapsible menu;
- dropdown;
- drawer;
- inline lesson navigation.

Choose the simplest accessible implementation.

---

# 24. About Page

Route:

```text
/about
```

The page should explain:

- who created the site;
- why the site exists;
- the intended audience;
- the distinction between Blog and Learn.

Do not require this content to live in a database.

The page may either:

- be implemented in MDX; or
- be implemented directly as a Next.js page.

Prefer MDX if doing so reduces inconsistency in editorial workflow.

---

# 25. SEO

Because much of the site's value comes from public educational content, SEO is important.

Every Blog post and Learn lesson should expose appropriate metadata:

- page title;
- description;
- canonical URL where appropriate;
- Open Graph metadata;
- publication date for articles;
- updated date where applicable.

Use Next.js metadata APIs.

Generate:

```text
/sitemap.xml
/robots.txt
/rss.xml
```

**An RSS feed of published Blog posts is a Phase 1 requirement.** It is roughly
thirty lines given `getAllBlogPosts()`, it is what readers of a technical blog
expect, and adding it later means revisiting canonical URL construction.

The canonical site URL comes from a single `NEXT_PUBLIC_SITE_URL` environment
variable with a sensible local default, used by metadata, the sitemap and the
feed alike.

Draft pages must be excluded from all three.

---

# 26. URLs

URLs should be:

- readable;
- stable;
- lowercase;
- hyphenated.

Examples:

```text
/blog/why-machines-learn

/learn/neural-networks/gradient-descent

/learn/transformers/multi-head-attention
```

Avoid exposing implementation details such as `.mdx`.

---

# 27. Responsive Design

All pages must support:

- desktop;
- tablet;
- mobile.

Article typography should prioritize readability.

Recommended article characteristics:

- constrained text width;
- generous line height;
- clear heading hierarchy;
- readable code blocks;
- responsive figures.

Interactive components must not require desktop-only dimensions unless explicitly labeled.

---

# 28. Accessibility

Target sensible WCAG-aligned practices.

At minimum:

- semantic HTML;
- keyboard-accessible navigation;
- labels for form controls and sliders;
- adequate text contrast;
- alt text for images;
- accessible headings;
- meaningful link text;
- visible focus states.

Interactive visualizations should provide textual explanation so learning does not depend exclusively on the visual representation.

---

# 29. Error Handling

Implement:

- custom 404 page;
- graceful handling of missing content;
- build-time reporting of invalid content.

A nonexistent blog post or lesson must return a proper 404 response.

In production, a **draft** blog post or lesson URL must also return 404 rather
than a rendered page — see §16.

---

# 30. Performance

Optimize for content-heavy static delivery.

Prefer:

- static generation;
- server components;
- lazy-loading client-side educational components where appropriate;
- optimized images;
- minimal client-side JavaScript on ordinary article pages.

Do not make every MDX article a client component merely because some lessons contain interactive components.

---

# 31. Content Authoring Workflow

The application does not need an admin UI.

The authoring workflow is:

```text
Create/edit MDX
      ↓
Run development server
      ↓
Preview locally
      ↓
Commit to Git branch
      ↓
Push to GitHub
      ↓
Preview deployment
      ↓
Merge into main
      ↓
Production deployment
```

For a minor correction, editing through GitHub's web editor should also be possible.

---

# 32. Publishing Workflow

Publishing should require no application-level administrative account.

A piece of content is considered published when:

1. its frontmatter is valid;
2. `draft` is `false`;
3. the content exists on the production branch;
4. the production deployment succeeds.

Git repository permissions serve as the administrative security boundary.

---

# 33. Preview Workflow

The deployment setup should support branch or pull-request previews.

A typical workflow:

```text
feature/new-attention-lesson
          ↓
        push
          ↓
pull request / preview deployment
          ↓
       review
          ↓
       merge
          ↓
production deployment
```

This is especially important for reviewing:

- mathematical formatting;
- diagrams;
- responsive design;
- interactive components.

---

# 34. Homepage Content Discovery

The home page should obtain content programmatically.

For example:

```text
getAllBlogPosts()
      ↓
sort by publishedAt
      ↓
display latest 3
```

Featured lessons may initially be configured manually in a small configuration file.

Do not require authors to manually update the home page every time they publish a blog post.

---

# 35. Blog Tagging

Blog posts should support tags.

Examples:

```text
agents
reasoning
llms
open-models
architecture
deep-learning
```

Phase 1 only requires tags to display on articles and listings.

Dedicated tag pages are optional.

Do not build a complex taxonomy system.

---

# 36. Learning Topics

A lesson belongs to the topic named by its parent directory (§11.1). There is
no `topic` field in lesson frontmatter:

```text
content/learn/transformers/attention.mdx   ->  topic "transformers"
```

Topic presentation data lives in one configuration file, which is the only
place a topic's display title and position are defined:

```ts
export const learningTopics = [
  {
    id: "neural-networks",
    title: "Neural Networks",
    order: 1,
  },
  {
    id: "transformers",
    title: "Transformers",
    order: 2,
  },
  {
    id: "llms",
    title: "Large Language Models",
    order: 3,
  },
];
```

---

# 37. Suggested Initial Content

The codebase should include enough sample content to demonstrate the architecture.

## Blog

Include at least:

- two sample blog posts;
- one draft post.

## Learn

Include at least two topics.

Example:

### Neural Networks

```text
introduction.mdx           order 10
activation-functions.mdx   order 20
gradient-descent.mdx       order 30
backpropagation.mdx        order 40
```

### Transformers

```text
embeddings.mdx             order 10
attention.mdx              order 20
```

The Activation Function Explorer is embedded in `activation-functions.mdx` and
the Gradient Descent Demo in `gradient-descent.mdx`. At least one lesson must
be a draft, so that draft filtering and adjacency-across-drafts are actually
exercised.

Sample content is scaffolding, and §3.1 governs it: placeholder prose is
clearly marked with a callout, and the author replaces it before the site is
pointed at a public domain. No sample page may be broken, empty, or show a
raw `TODO`.

---

# 38. Suggested Initial Interactive Components

Implement at least two educational components.

Recommended:

## 38.1 Gradient Descent Demo

Allow the user to modify a parameter such as learning rate.

Visualize:

- current point;
- optimization steps;
- loss curve or simplified function.

Purpose:

Demonstrate how learning rate affects convergence.

## 38.2 Activation Function Explorer

Allow selection among functions such as:

- ReLU;
- sigmoid;
- tanh.

Display:

- function equation or name;
- plot;
- optional adjustable input.

These demonstrations must run entirely client-side.

The development plan builds the Activation Function Explorer **first** and the
Gradient Descent Demo **second**: the explorer is a pure function plot with no
animation loop, and it establishes the shared axis, plotting and control
primitives the gradient descent demo then reuses. The ordering in this section
is descriptive, not a build order.

---

# 39. Separation of Responsibilities

Maintain a clear boundary:

```text
MDX
=
educational narrative and editorial content
```

```text
React
=
interactivity and dynamic visualization
```

```text
Content utilities
=
discovery, metadata parsing, validation and ordering
```

Avoid putting large amounts of prose directly into React component files.

Avoid putting complex application logic into MDX files.

---

# 40. Testing

**DECIDED — Vitest**, with `@testing-library/react` and `jsdom` for component
tests.

The runner is configured in the first implementation phase, not in a late
testing phase. The development plan requires `pnpm test` to pass at the end of
every phase, which is impossible if the runner does not exist yet, and the
"no critical regression" clause in the definition of done has no mechanism
behind it without a suite that grows alongside the code.

Use automated tests where they provide meaningful protection.

At minimum test:

## 40.1 Content Schema

Tests should verify:

- valid Blog metadata succeeds;
- invalid dates fail;
- missing required fields fail;
- valid Lesson metadata succeeds;
- invalid difficulty values fail.

## 40.2 Content Utilities

Tests should verify:

- draft filtering;
- blog chronological sorting;
- lesson ordering;
- topic grouping;
- adjacent lesson calculation.

## 40.3 Core UI

Use component or integration tests for particularly important interactive components where practical.

Do not attempt exhaustive snapshot testing of all editorial pages.

---

# 41. Linting and Formatting

Configure:

- ESLint;
- Prettier.

TypeScript should use strict type checking unless a dependency creates a documented blocker.

The repository should build without:

- TypeScript errors;
- linting errors;
- malformed MDX content.

---

# 42. Development Commands

**DECIDED — pnpm, and only pnpm.**

```bash
pnpm install
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm test
pnpm validate:content     # eager frontmatter and cross-file validation
pnpm verify               # scripts/verify.mjs against a production build
```

`prebuild` runs `validate:content`.

The repository contains `pnpm-lock.yaml` and no other lockfile. If
`package-lock.json`, `yarn.lock`, `bun.lock` or `bun.lockb` appears, it is
deleted before committing. `package.json` carries a `packageManager` field.

Note for coding agents: `pnpm dev` and a foreground `pnpm start` block
indefinitely and will hang an automated session. Use `pnpm verify`, or build,
background the server, probe with `curl`, and shut it down.

---

# 43. README

Create a complete README covering:

## Development

- prerequisites;
- installation;
- running locally;
- building.

## Content Authoring

- creating a blog post;
- creating a lesson;
- frontmatter fields;
- draft behavior;
- embedding a React component.

## Publishing

- Git workflow;
- preview deployment;
- production deployment.

## Architecture

Explain why Phase 1 intentionally has:

- no database;
- no backend;
- no authentication.

Also explain expected future extension points.

---

# 44. Future FastAPI Integration

Do not implement FastAPI in Phase 1.

The architecture should allow it later when an educational feature requires Python-side computation.

Potential future examples:

- server-side tokenization;
- embedding generation;
- PyTorch inference;
- comparing model outputs;
- transformer inspection;
- small neural-network training experiments.

The future integration would conceptually be:

```text
Interactive React component
          |
          v
       FastAPI
          |
    Python AI stack
```

The Next.js content architecture should not depend on this future backend.

---

# 45. Future PostgreSQL Integration

Do not implement PostgreSQL in Phase 1.

Introduce PostgreSQL only when persistent application data becomes valuable.

Likely examples:

- user accounts;
- lesson progress;
- saved experiments;
- quiz scores;
- user preferences;
- comments.

Editorial content should continue to remain in MDX unless there is a compelling future reason to migrate it.

---

# 46. Future Authentication

Authentication should not be added merely because a future database is anticipated.

Introduce authentication when the site first provides personalized features.

Potential later capabilities:

```text
User
 |
 +--- saved progress
 +--- saved experiments
 +--- personalized learning
 +--- quiz history
```

The public Blog and Learn content should remain accessible without authentication.

---

# 47. Future AI Tutor

A future AI assistant could support actions such as:

- explain this concept differently;
- give another example;
- quiz me;
- explain this equation;
- explain this code;
- compare two concepts.

Do not implement this in Phase 1.

Future AI functionality should augment structured educational content rather than replace it.

---

# 48. Design Principles

The application should follow these principles.

## 48.1 Content First

The main value is the quality of the writing and educational material.

Software features should support that content rather than dominate it.

## 48.2 Progressive Complexity

Do not implement infrastructure before it solves an actual requirement.

Progression should be:

```text
Next.js + MDX
        ↓
Interactive React
        ↓
FastAPI when computation requires Python
        ↓
Database + authentication when persistence is useful
```

## 48.3 Static by Default

If content can be generated statically, prefer static generation.

## 48.4 Client-Side Interactivity Only Where Useful

Ordinary articles should not ship unnecessary JavaScript.

## 48.5 Git as CMS

For Phase 1:

```text
Git repository
=
content management system
+
version history
+
publishing control
```

## 48.6 Educational Interactivity Should Have a Purpose

Do not create interactive elements merely because they look impressive.

An interactive component should help explain a concept more effectively than static prose alone.

---

# 49. Phase 1 Acceptance Criteria

Phase 1 is complete when all of the following are true.

## Application

- Next.js application builds successfully.
- TypeScript passes strict type checking.
- Application is responsive.
- Global navigation works.
- Home, Blog, Learn, and About routes exist.

## Blog

- Blog posts are loaded from MDX.
- Blog frontmatter is validated.
- Blog index is generated automatically.
- Posts are sorted by publication date.
- Individual post routes work.
- Draft posts are excluded from production.

## Learn

- Lessons are loaded from MDX.
- Lesson frontmatter is validated.
- Lessons are grouped by topic.
- Lesson ordering works.
- Nested lesson routes work.
- Previous and next navigation works.
- Draft lessons are excluded from production.

## Educational Components

- At least two interactive React learning components exist.
- Components can be embedded directly in MDX.
- Components work without backend services.

## Technical Content

- syntax-highlighted code works;
- mathematical notation works;
- images work;
- internal linking works.

## SEO

- page metadata is generated;
- sitemap exists;
- robots configuration exists;
- drafts are excluded.

## Workflow

- content can be created locally;
- local previews work;
- content can be published by committing and pushing;
- production deployment can be triggered from the main branch;
- preview deployment workflow is documented.

## Documentation

- README explains setup;
- README explains authoring;
- README explains publishing;
- README explains architectural decisions;
- `docs/decisions.md` records every decision the agent made;
- `CLAUDE.md` exists at the repository root.

## Validation and Automation

- `pnpm validate:content` exists, runs as `prebuild`, and passes;
- `pnpm test` passes;
- `pnpm lint` passes with no errors;
- `pnpm build` passes with strict TypeScript;
- `node scripts/verify.mjs` passes against a running production build;
- CI runs lint, validate, test and build on every pull request;
- a draft URL returns 404 in a production build;
- the sitemap and RSS feed contain no draft entries;
- only `pnpm-lock.yaml` is present — no `package-lock.json`, `yarn.lock` or
  `bun.lock*`.

---

# 50. Recommended Implementation Order

The coding agent implements Phase 1 in exactly this order. These numbers match
the phase sections in `docs/development-plan.md`.

```text
 1  Repository, Next.js scaffold, test runner, verify script, CLAUDE.md
 2  Application shell, navigation, light/dark foundation
 3  Content pipeline: MDX + frontmatter + syntax highlighting + math
 4  Zod schemas, validate:content, cross-file checks
 5  Blog content utilities, including draft filtering
 6  Blog index and article routes
 7  Learn content utilities: topics, ordering, adjacency, draft filtering
 8  Learn index, topic overview and lesson routes
 9  Lesson navigation: previous / next / topic, sidebar
10  MDX component registries: prose plus lazily loaded demos
11  Interactive component 1 — Activation Function Explorer
12  Interactive component 2 — Gradient Descent Demo
13  Homepage
14  About page
15  Draft audit and production draft-leak tests
16  SEO: metadata, sitemap, robots, RSS
17  Test suite expansion
18  Accessibility and responsive refinement      [human checkpoint]
19  Performance refinement
20  README and authoring documentation
21  Deployment and CI                            [human steps required]
22  Final system validation
```

Three sequencing decisions differ from the earlier draft of this plan and are
deliberate:

- **MDX, syntax highlighting and math are one phase, not three.** They are a
  single unified pipeline; configuring `next.config` and the compile function
  three separate times invites regressions in already-completed work.
- **Draft filtering is built into phases 5 and 7, not retrofitted.** The index
  pages in phases 6 and 8 need it immediately, so a later "add draft
  filtering" phase would only rewrite what the agent had already improvised.
- **The test runner is configured in phase 1.** Every phase is required to
  leave `pnpm test` passing, which is impossible if the runner arrives in
  phase 17.

---

# 51. Architectural Decision Summary

Phase 1 intentionally uses:

```text
Next.js
React
TypeScript
Tailwind
MDX
Zod
Git
```

Phase 1 intentionally does **not** use:

```text
FastAPI
PostgreSQL
Authentication
Admin UI
CMS
```

This is not a temporary shortcut.

It is the preferred architecture for the current requirements.

FastAPI, PostgreSQL, and authentication should be introduced only when future
functionality creates a concrete need for them.

Decisions made while implementing Phase 1 — including anything this document
marks **AGENT'S CHOICE** — are recorded in `docs/decisions.md`, so that a later
session can see why a choice was made rather than re-deriving or silently
reversing it.

---

# 52. Expected Phase 1 Result

At completion, the application should be a professional public website where the author can:

1. create an MDX blog post;
2. preview it locally;
3. commit and publish it through Git;

or:

1. create an MDX lesson;
2. embed interactive React components;
3. preview the lesson;
4. publish it through Git.

Visitors should experience the site as one coherent AI-focused publication with two complementary areas:

```text
BLOG
Ideas, observations and analysis

LEARN
Concepts, explanations and interactive learning
```

The resulting architecture should remain simple enough to maintain while
providing a strong foundation for progressively more sophisticated AI-driven
educational features.

---

# 53. Continuous Integration

Add a GitHub Actions workflow at `.github/workflows/ci.yml` running on every
pull request and every push to `main`:

```text
pnpm install --frozen-lockfile
pnpm lint
pnpm validate:content
pnpm test
pnpm build
```

This is cheap, and it matters more than usual here because a coding agent
authors most of the commits. A red check on a pull request is the cheapest
place to catch a regression the agent did not notice in its own session.

---

# 54. Machine-Checkable Acceptance

Several criteria elsewhere in this document — "responsive", "polished",
"restrained visual design" — cannot be verified by a text-only coding agent,
which will simply self-certify them. Split them explicitly.

## 54.1 Automated

`scripts/verify.mjs` runs against a production build (`pnpm build` then
`pnpm start`) and asserts:

- `/`, `/blog`, `/learn`, `/about` return 200;
- every published post, topic and lesson route returns 200;
- a known draft slug returns 404;
- a nonexistent slug returns 404;
- `/sitemap.xml`, `/robots.txt` and `/rss.xml` return 200;
- neither the sitemap nor the feed contains a known draft slug;
- no competing lockfile exists in the repository.

`pnpm verify` runs it. It is part of the definition of done for any phase that
changes routing, drafts, or SEO output.

## 54.2 Human Checkpoints

Reviewed by the author, not asserted by the agent:

- visual design and typographic quality;
- responsive behaviour at 375 / 768 / 1024 / 1440 px;
- screen-reader experience of the interactive demonstrations;
- correctness and pedagogical quality of all editorial content.

The development plan marks these phases explicitly. If the agent has browser
automation available, screenshots at the four widths are a useful supplement,
but they do not replace the checkpoint.
