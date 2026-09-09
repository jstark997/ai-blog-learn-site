# AI Blog and Learning Platform
## Phase 1 Development Plan

## 1. Purpose

This plan translates `docs/application-spec.md` into an ordered sequence of
implementation phases suitable for an AI coding agent.

Each phase must:

- have a clearly bounded objective;
- be completable in a single coding session;
- leave the repository in a working state;
- pass its validation gate before being called complete;
- avoid implementing future infrastructure prematurely;
- build incrementally on completed phases.

The repository name is:

```text
ai-blog-learn-site
```

Phase 1 uses Next.js, React, TypeScript, Tailwind CSS, MDX, YAML frontmatter,
Zod, Vitest, Git and pnpm. It deliberately does **not** include FastAPI,
PostgreSQL, authentication, user accounts, an admin interface, an external
CMS, or an AI inference backend.

Exact pinned dependency versions are in **§4.7 of the application
specification**. Do not substitute "latest".

---

# 2. Development Principles

## 2.1 Documentation Is Authoritative

Before implementing any phase, read:

```text
CLAUDE.md                  standing rules, read first, it is short
docs/application-spec.md   what to build
docs/development-plan.md   this file: the order to build it in
docs/decisions.md          what previous sessions already decided
```

If the implementation and the documentation conflict:

1. identify the conflict;
2. follow the application specification;
3. report the discrepancy in the end-of-session report.

The agent must not modify `application-spec.md` or `development-plan.md`.
The agent **must** append to `docs/decisions.md` whenever it makes a choice
the specification left open.

## 2.2 The Validation Gate

At the end of every phase, all of these must pass:

```bash
pnpm lint
pnpm validate:content     # from phase 4 onward
pnpm test
pnpm build
```

From phase 6 onward, phases that change routing, draft behaviour or SEO output
must also pass:

```bash
pnpm verify               # scripts/verify.mjs against a production build
```

A phase is not complete because the code looks right. It is complete when the
gate passes.

## 2.3 Commands the Agent Must Not Run Directly

```bash
pnpm dev        # blocks forever; it will hang the session
pnpm start      # same, unless backgrounded
```

To verify that the application serves, build and probe it instead:

```bash
pnpm build
pnpm start &
sleep 4
curl -sfo /dev/null -w '%{http_code}\n' http://localhost:3000/
kill %1
```

`scripts/verify.mjs` wraps this pattern; prefer `pnpm verify`.

Similarly, `pnpm create next-app` is interactive. Always invoke it with
explicit flags (see phase 1) so it never waits on a prompt that no human is
present to answer.

## 2.4 Use pnpm Exclusively

```bash
pnpm install    pnpm add    pnpm add -D    pnpm build    pnpm lint    pnpm test
```

Do not use `npm`, `yarn` or `bun` for dependency management or scripts. The
repository contains `pnpm-lock.yaml` and no other lockfile. If
`package-lock.json`, `yarn.lock`, `bun.lock` or `bun.lockb` appears, delete it
before committing.

## 2.5 Read the Installed Versions Before Writing Code

Before writing routes, config or styles in any phase, check `package.json` for
the installed versions of `next` and `tailwindcss`, and write code for those
versions rather than from memory. The two most common failures on this project
would be:

- treating `params` as a synchronous object — in Next 16 it is a Promise and
  must be awaited in every page, layout and `generateMetadata`;
- creating a `tailwind.config.ts` — Tailwind 4 is configured in CSS with
  `@import "tailwindcss"` and `@theme`, and the v3 `@tailwind` directives do
  not exist.

## 2.6 Avoid Premature Architecture

Do not create API abstractions for a future FastAPI, database repositories,
authentication middleware, ORM models, user entities, generic plugin systems,
or speculative service layers. Implement only what the current phase requires.

## 2.7 Content Is Read From the Filesystem

Blog posts and lessons are read from `content/` at build time. Do not create
route handlers or API routes to serve local MDX.

## 2.8 Server Components by Default

Use Client Components only for interactive demonstrations, browser-only
controls, and UI that genuinely requires client state. An ordinary article page
must not become a Client Component because some other lesson has a demo.

## 2.9 Keep Content Separate From Application Logic

```text
MDX                 editorial and educational content
React               interactive behaviour
Content utilities   discovery, parsing, validation, ordering
```

## 2.10 Record Decisions

Whenever the agent picks something the specification did not fix — a library, a
file layout, a naming convention, a workaround for a version incompatibility —
append a short entry to `docs/decisions.md`:

```markdown
## <date> — <decision>
**Context:** ...
**Decision:** ...
**Consequences:** ...
```

A decision that lives only in a session transcript is a decision the next
session will silently reverse.

---

# 3. Repository Layout

The Next.js application lives at the repository root. Do not create
`/frontend`, `/web`, `/client` or `/app-next` as an additional application
root, and do not restructure into a monorepo.

```text
ai-blog-learn-site/
├── CLAUDE.md
├── .claude/
│   ├── agents/
│   ├── commands/
│   ├── skills/
│   └── settings.local.json
│
├── docs/
│   ├── application-spec.md
│   ├── development-plan.md
│   └── decisions.md
│
├── app/
├── components/
├── content/
├── lib/
├── public/
├── scripts/
│   ├── validate-content.mjs
│   └── verify.mjs
├── tests/
│
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── next.config.ts
├── vitest.config.ts
├── README.md
└── .gitignore
```

---

# 4. Prerequisites

Required locally:

- Git
- Node.js — a currently supported LTS release
- pnpm
- An editor

Verify:

```bash
node --version
pnpm --version
git --version
```

If pnpm is missing:

```bash
corepack enable
```

A GitHub account, a GitHub repository and a Vercel account are needed only at
phase 21. They are **human steps** — the agent cannot create accounts, and
must not attempt to.

---

# 5. Phase Overview

| Phase | Objective | Notes |
|---|---|---|
| 1 | Repository, Next.js scaffold, tooling, test runner | |
| 2 | Application shell, navigation, light/dark foundation | |
| 3 | Content pipeline: MDX, highlighting, math | one pipeline, built once |
| 4 | Zod schemas and `validate:content` | |
| 5 | Blog content utilities, with draft filtering | |
| 6 | Blog index and article routes | |
| 7 | Learn content utilities: topics, ordering, adjacency | |
| 8 | Learn index, topic overview and lesson routes | |
| 9 | Lesson navigation | |
| 10 | MDX component registries | |
| 11 | Interactive component 1 — Activation Function Explorer | |
| 12 | Interactive component 2 — Gradient Descent Demo | |
| 13 | Homepage | |
| 14 | About page | |
| 15 | Draft audit and leak tests | |
| 16 | SEO: metadata, sitemap, robots, RSS | |
| 17 | Test suite expansion | |
| 18 | Accessibility and responsive refinement | human checkpoint |
| 19 | Performance refinement | |
| 20 | README and authoring documentation | |
| 21 | Deployment and CI | human steps required |
| 22 | Final system validation | human checkpoint |

---

# 6. Phase 1 — Repository, Scaffold and Tooling

## Objective

A working Next.js application at the repository root, with the package
manager, strict TypeScript, linting, the test runner, the verify script and
the agent documentation all in place — so that every later phase has a real
validation gate to pass.

## 6.1 Starting State

```text
ai-blog-learn-site/
├── CLAUDE.md
├── .claude/          project skills, agents and commands
├── docs/
│   ├── application-spec.md
│   ├── development-plan.md
│   └── decisions.md
└── .git/
```

If Git is not yet initialized:

```bash
git init
```

These files must be committed. Do not move, rename or overwrite them.

## 6.2 Read the Documentation

Read `CLAUDE.md`, `docs/application-spec.md` and `docs/development-plan.md`.
Confirm the agent understands: two site areas (Blog and Learn); MDX as the
content system; Git as the publishing system; demos living inside Learn; no
database, no FastAPI, no authentication; pnpm only; and the pinned versions in
§4.7 of the specification.

## 6.3 Scaffold Next.js Non-Interactively

`create-next-app` is interactive. Run it with explicit flags so it cannot
prompt:

```bash
pnpm create next-app@16.3.4 . \
  --ts --tailwind --eslint --app \
  --no-src-dir --import-alias "@/*" --use-pnpm --skip-install
```

Verify the flag names against the installed scaffolder before relying on them;
if a flag has been renamed, adjust and record the change in
`docs/decisions.md`.

If the tool refuses a non-empty directory, scaffold into a temporary directory
and copy the application files into the repository root. Never overwrite
`docs/`, `CLAUDE.md` or `.git/`.

Then:

```bash
pnpm install
```

## 6.4 Pin Versions

Set `next`, `react`, `react-dom` and `tailwindcss` to exact versions in
`package.json` per specification §4.7, add the `packageManager` field, run
`pnpm install` again, and record the resolved versions of every dependency in
`docs/decisions.md`.

Delete any non-pnpm lockfile that appears.

## 6.5 TypeScript

`"strict": true` in `tsconfig.json`. Do not relax strictness without recording
a concrete reason in `docs/decisions.md`.

## 6.6 Test Runner

Install and configure Vitest now, not later:

```bash
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react \
            @testing-library/jest-dom @testing-library/user-event
```

Create `vitest.config.ts` with the `jsdom` environment and the `@/*` path alias
matching `tsconfig.json`, add a `test` script, and write one trivial passing
test in `tests/` so `pnpm test` is meaningful from this phase onward.

## 6.7 Verify Script

Create `scripts/verify.mjs` and a `verify` script. At this phase it need only
build, start the server on a free port, assert `/` returns 200, and shut the
server down cleanly. Later phases extend its assertions (specification §54.1).

## 6.8 Scripts

`package.json` should provide at least:

```text
dev  build  start  lint  test  verify  validate:content  prebuild
```

`validate:content` may be a stub until phase 4; `prebuild` runs it.

## 6.9 .gitignore

A `.gitignore` is already committed at the repository root. Verify rather than
replace it — `create-next-app` will offer its own, and merging its entries in
is fine, but do not let it overwrite these decisions:

**Must stay ignored:** `node_modules`, `/.next/`, `/out/`, `/build/`,
`/coverage/`, `.turbo/`, `*.tsbuildinfo`, `next-env.d.ts`, `.env` and `.env.*`,
`.vercel`, `*.pem`/`*.key`, logs, `.DS_Store`, and the machine-local Claude
Code state `.claude/settings.local.json`, `.claude/projects/`, `.claude/*.lock`.

**Must stay tracked:** `docs/`, `content/`, `scripts/`, `public/`, `CLAUDE.md`,
`pnpm-lock.yaml`, `.env.example`, and `.claude/skills`, `.claude/agents` and
`.claude/commands` — those last three are shared project tooling, so never
ignore `.claude/` as a whole.

`.env.example` is committed and documents `NEXT_PUBLIC_SITE_URL` (spec §25) and
the optional `SHOW_DRAFTS` override (spec §16). Keep it current: when a phase
introduces a new environment variable, add it there in the same commit.

Verify the result mechanically rather than by reading:

```bash
git check-ignore -q .env && echo "env ignored"
git check-ignore -q .claude/skills/modern-tailwind/SKILL.md && echo "BAD: skills ignored"
git status --porcelain --untracked-files=all
```

## 6.10 Validation

```bash
pnpm lint
pnpm test
pnpm build
pnpm verify
```

Do not run `pnpm dev` in the foreground (§2.3).

## Completion Criteria

- Next.js application at the repository root, App Router, strict TypeScript,
  Tailwind 4, ESLint configured.
- Versions pinned and recorded in `docs/decisions.md`.
- `pnpm-lock.yaml` present; no competing lockfile.
- `pnpm test` runs and passes.
- `pnpm verify` passes.
- `docs/`, `CLAUDE.md` and `docs/decisions.md` are committed and untouched.
- Initial commit made.

---

# 7. Phase 2 — Application Shell

## Objective

The reusable layout, navigation and typography, plus the light/dark
foundation that later phases depend on.

## Tasks

Create the four top-level routes (`/`, `/blog`, `/learn`, `/about`), a root
layout, and `not-found.tsx`. Implement a global header with the site name and
navigation, a content container, and a footer, under `components/layout/` and
`components/navigation/`. Page content is a placeholder at this stage.

Establish, in `app/globals.css` using Tailwind 4's `@theme`:

- the type scale and prose measure for long-form technical writing;
- the spacing scale;
- **the light/dark colour tokens.** Dark mode is decided in specification
  §19; it is set up here because Shiki's dual theme (phase 3) and every
  component's `dark:` variants depend on it. Use `prefers-color-scheme` with a
  `class="dark"` override on `<html>`.

Mobile navigation must collapse and remain keyboard operable.

## Validation

`pnpm lint && pnpm test && pnpm build && pnpm verify`, with `/`, `/blog`,
`/learn` and `/about` all returning 200.

## Completion Criteria

- Four routes render.
- Navigation is shared, not duplicated per page.
- Light and dark palettes are defined and switch correctly.
- No page-specific duplicate navigation code.

---

# 8. Phase 3 — Content Pipeline

## Objective

Build the MDX pipeline **once**, complete with syntax highlighting and
mathematics.

This phase merges what an earlier draft of this plan split across three
separate phases. MDX compilation, `rehype-pretty-code` and `rehype-katex` are
one unified plugin chain; configuring it three times means rewiring
`next.config` and the compile function three times, each pass risking
regressions in already-finished pages.

## Tasks

Install per specification §4.7:

```bash
pnpm add next-mdx-remote gray-matter remark-gfm remark-math rehype-katex katex \
         rehype-pretty-code shiki
```

Create `lib/content/mdx.ts` exporting a single compile/render entry point built
on `next-mdx-remote/rsc`, with the plugin chain in one place:

```text
remark:  remark-gfm, remark-math
rehype:  rehype-katex, rehype-pretty-code (dual theme, see spec §19)
```

Import `katex/dist/katex.min.css` once in `app/layout.tsx`.

Create `content/blog/` and `content/learn/`, and one throwaway MDX file that
exercises the whole chain: headings, lists, links, a table, a blockquote,
inline code, fenced blocks in Python / TypeScript / JSON / Bash / YAML, inline
math, a display equation, and one trivial React component.

Do not create `/api/posts` or `/api/lessons`.

## Validation

Render the test file through a temporary route and confirm every feature above
renders. Confirm code blocks are readable in both themes and scroll rather than
overflow. Confirm no highlighter or math JavaScript is shipped to the client.

## Completion Criteria

- MDX renders as a Server Component.
- All six languages highlight; unknown languages degrade gracefully.
- Inline and block math render; equations scroll on narrow viewports.
- One plugin chain, in one file.
- The pipeline choice and Shiki theme names are recorded in
  `docs/decisions.md`.

---

# 9. Phase 4 — Schemas and Content Validation

## Objective

Typed, validated frontmatter, plus the eager validator.

## Tasks

Install Zod. Create `lib/content/schemas.ts` implementing exactly the schemas
in specification §10 and §12, including:

- the `isoDate` preprocessor (specification §12) — a bare `z.string()` would
  reject any unquoted YAML date, which parses as a JavaScript `Date`;
- `publishedAt` required on both posts and lessons; `updatedAt` optional;
- **no** `topic` and **no** `slug` in lesson frontmatter — both derive from the
  path;
- `draft` defaulting to `false`;
- `order` as a positive integer, sparse (multiples of ten).

Create `lib/content/env.ts` exporting the single `showDrafts` helper from
specification §16.

Create `scripts/validate-content.mjs` behind `pnpm validate:content`, wired as
`prebuild`. It performs the per-file checks with draft-dependent severity
(specification §18) and the cross-file checks: topic directory ↔ `topics.ts`
parity, `order` uniqueness within a topic, prerequisite resolution, and blog
slug uniqueness.

Error output must name the file, the field and the expectation:

```text
content/blog/example.mdx
  publishedAt: Expected an ISO date, e.g. 2026-09-04 (received a Date)
```

## Tests

Valid blog metadata; missing title; invalid date; **an unquoted YAML date,
which must pass**; valid lesson metadata; invalid difficulty; a draft with
invalid frontmatter warns rather than throwing; a published file with invalid
frontmatter throws.

## Completion Criteria

- Both schemas implemented; types derived from them, not hand-maintained.
- `pnpm validate:content` runs, passes on good content, exits non-zero on bad.
- Draft severity behaves as specified.

---

# 10. Phase 5 — Blog Content Utilities

## Objective

Programmatic blog retrieval, independent of any UI.

## Tasks

Implement `getAllBlogPosts()` and `getBlogPostBySlug(slug)` in
`lib/content/blog.ts`, exposing `{ slug, metadata, content }`. Implement
discovery, frontmatter parsing, validation, slug derivation from filename, and
reverse-chronological sorting.

**Draft filtering belongs here, not in a later phase.** `getAllBlogPosts()`
consults `showDrafts` and excludes drafts when it is false. Every consumer
inherits correct behaviour instead of improvising its own filter.

Create sample content per specification §3.1 and §37: two published posts
(each opening with a placeholder callout) and one draft post.

## Tests

Discovery; parsing; ordering; slug generation; drafts excluded when
`showDrafts` is false and included when true.

## Completion Criteria

Blog retrieval and draft filtering work with no UI code involved.

---

# 11. Phase 6 — Blog User Interface

## Objective

The complete blog reading experience.

## Tasks

Implement `/blog` and `/blog/[slug]`.

Index entries show title, description, publication date, updated date when
present, and tags. Article pages show the same plus the rendered MDX. A draft
entry, when visible, carries a `DRAFT` badge.

Set `export const dynamicParams = false` on `/blog/[slug]` and call
`notFound()` when a resolved post is a draft and `showDrafts` is false
(specification §16). Remember that `params` is a Promise in Next 16.

## Validation

`/blog` and a sample post return 200; a nonexistent slug returns 404; in a
production build with `SHOW_DRAFTS=false`, the draft slug returns 404. Extend
`scripts/verify.mjs` with these assertions.

## Completion Criteria

- Index generated from the filesystem; no hand-maintained listing.
- Articles render with highlighting and math.
- Missing posts 404; draft posts 404 in production.

---

# 12. Phase 7 — Learn Content Utilities

## Objective

The Learn content model.

## Tasks

Create the content tree:

```text
content/learn/
├── neural-networks/
│   ├── introduction.mdx          order 10
│   ├── activation-functions.mdx  order 20
│   ├── gradient-descent.mdx      order 30
│   └── backpropagation.mdx       order 40
└── transformers/
    ├── embeddings.mdx            order 10
    └── attention.mdx             order 20
```

Create `lib/content/topics.ts` mapping topic id to `{ title, order,
description }`. The directory name is the canonical topic id (specification
§11.1); no lesson carries a `topic` field.

Implement `getAllLessons()`, `getLessonsByTopic(topicId)`,
`getLessonByPath(topicId, lessonId)` and `getAdjacentLessons(topicId,
lessonId)`, each returning `{ topicId, lessonId, metadata, content }`.

Draft filtering and adjacency both live here. Drafts are removed **before**
adjacency is computed, so previous/next never point at a hidden lesson.

## Tests

Topic grouping; sparse ordering; adjacency at the first and last lesson of a
topic; adjacency skipping a draft in the middle of a topic; draft filtering;
duplicate `order` rejected by `validate:content`.

## Completion Criteria

Learn content is fully queryable with no UI code involved.

---

# 13. Phase 8 — Learn User Interface

## Objective

Browsing and reading Learn content.

## Tasks

Implement three routes:

```text
/learn                      topics in configured order, lessons beneath each
/learn/[topic]              topic overview: description and ordered lessons
/learn/[topic]/[lesson]     the lesson
```

Explicit nested segments, not a catch-all (specification §11.2). The topic
overview route is required — phase 9's "back to topic" link needs a
destination.

Lesson pages show title, description, difficulty, prerequisites as links, and
dates, then the rendered MDX. The MDX body starts its headings at `##`; the
page template owns the `<h1>`.

Apply the same `dynamicParams` and draft-`notFound()` treatment as phase 6.

## Completion Criteria

- All three route levels work; invalid topics and lessons 404.
- Grouping and ordering come from content and `topics.ts`.
- Draft lessons 404 in production.

---

# 14. Phase 9 — Lesson Navigation

## Objective

Move through a topic without touching the URL bar.

## Tasks

Lesson pages show a link back to the topic, plus previous and next lessons
using `getAdjacentLessons`. Add a topic-level lesson list — a sidebar on
desktop, a collapsible disclosure on mobile — with the current lesson clearly
marked, using `aria-current="page"`.

Ordering comes from metadata. Never encode previous/next URLs in MDX.

## Completion Criteria

- Adjacency is automatic and correct at topic boundaries.
- Current lesson is identifiable visually and to assistive technology.
- Navigation is usable and keyboard-operable on mobile.

---

# 15. Phase 10 — MDX Component Registries

## Objective

Consistent MDX components without shipping every demo to every page.

## Tasks

Implement the two registries from specification §15:

- `components/mdx/registry.ts` — `Callout`, `Figure`, `Equation`,
  `ExternalLink`, and overrides for `a` and `img`. Server-rendered, always
  available.
- `components/learn/registry.ts` — demos, each wrapped in `next/dynamic`.

Blog pages render with the prose registry only. Lesson pages render with both.

## Completion Criteria

- Both registries exist and are used by the right routes.
- Demo JavaScript loads only on lessons that use a demo.
- MDX files contain no imports.

---

# 16. Phase 11 — Activation Function Explorer

## Objective

The first educational demonstration, and the shared plotting primitives.

Create `components/learn/neural-networks/ActivationFunctionExplorer.tsx`
supporting ReLU, sigmoid and tanh, showing the selected function's name and
equation, its plot, an adjustable input, and the resulting output value.

Build it in SVG, not canvas (specification §14.1). Extract the axis, grid and
curve primitives so the next phase reuses them.

Accessibility is a completion criterion of *this* phase, not of phase 18: a
labelled function selector, a labelled slider operable by arrow keys, visible
focus rings, and a live text summary such as
`ReLU, input 0.75, output 0.75` in an `aria-live="polite"` region.

## Tests

Switching functions changes the computed output; the slider updates the
reported value; the text summary matches the plotted state.

## Completion Criteria

- Renders inside lesson MDX with no network request.
- Keyboard-operable end to end.
- Usable at 375 px.

---

# 17. Phase 12 — Gradient Descent Demo

## Objective

An interactive optimization demonstration.

Create `components/learn/neural-networks/GradientDescentDemo.tsx` over a simple
function such as `f(x) = x²`, with adjustable starting point and learning rate,
start/step/reset controls, visualized steps, and the current parameter and
loss. Reuse the plotting primitives from phase 11.

Include a learning rate large enough to diverge — watching it fail is the
pedagogical point — and handle divergence without breaking the layout or
producing `NaN` in the readout.

Any animation must respect `prefers-reduced-motion`, and stepping must remain
available without animation.

## Tests

A step changes x in the expected direction; reset restores the initial state; a
large learning rate diverges without crashing or rendering `NaN`.

## Completion Criteria

- Works inside MDX, entirely client-side.
- Learning-rate behaviour is visible, including divergence.
- Controls are labelled and keyboard-operable; mobile layout holds.

---

# 18. Phase 13 — Homepage

Replace the placeholder homepage with content-driven sections: the hero with
site identity, positioning statement and calls to action for Blog and Learn;
the three most recent published posts from `getAllBlogPosts()`; featured Learn
content from a small configuration file; and the short explanation of the
Blog/Learn distinction.

Copy lives in a single site configuration module, not scattered through
components (specification §8.1).

**Completion criteria:** the homepage reflects real repository content and
requires no manual editing when a post is published; drafts never appear.

---

# 19. Phase 14 — About Page

Implement `/about` in MDX so it is authored the same way as everything else.
Explain who created the site, why it exists, the intended audience, and the
Blog/Learn distinction.

**Completion criteria:** the page renders through the MDX pipeline and is
editable through Git alone.

---

# 20. Phase 15 — Draft Audit

## Objective

Prove drafts cannot leak. Draft *filtering* was implemented in phases 5 and 7;
this phase audits every consumer and adds the tests.

## Tasks

Confirm that every one of these consults `showDrafts` and nothing else:
blog index, learn index, topic pages, homepage recent posts, featured lessons,
`generateStaticParams` for both dynamic routes, adjacency computation, the
sitemap and the RSS feed. Confirm `dynamicParams = false` and the draft
`notFound()` guard are present on both dynamic routes.

Add the `DRAFT` badge everywhere a draft can be visible.

Add tests that build with `SHOW_DRAFTS=false` and assert the draft slug appears
in no index, no sitemap, no feed, and returns 404. Add the same assertions to
`scripts/verify.mjs`.

## Completion Criteria

Draft content cannot appear in production navigation, sitemap, feed, or at its
own URL, and there is a test that fails if that regresses.

---

# 21. Phase 16 — SEO

Implement metadata for the homepage, blog index, posts, learn index, topics,
lessons and about, using the Next.js metadata API. Add `sitemap.ts`,
`robots.ts` and an RSS feed at `/rss.xml` (specification §25). Use a single
`NEXT_PUBLIC_SITE_URL` for canonical URLs across metadata, sitemap and feed.
Add Open Graph metadata, including article published and modified times.

**Completion criteria:** titles are unique; descriptions come from frontmatter;
published content appears in the sitemap and feed; drafts appear in neither;
`/rss.xml` validates as well-formed XML.

---

# 22. Phase 17 — Test Suite Expansion

Fill the gaps left by earlier phases rather than starting a suite from scratch.
At completion the suite covers: schema validation including the unquoted-date
case; blog discovery, sorting, slug generation and draft filtering; topic
grouping, sparse ordering, adjacency at boundaries and across drafts, and
duplicate-order rejection; prerequisite resolution; both interactive
components' behaviour; and the draft-leak assertions from phase 15.

**Completion criteria:** `pnpm test` passes consistently, and every content
utility has at least one test that would fail if its behaviour regressed.

---

# 23. Phase 18 — Accessibility and Responsive Refinement  *(human checkpoint)*

## Agent tasks

Audit and fix: semantic heading order on every page type, keyboard navigation
including the mobile menu and lesson sidebar, visible focus states, form and
slider labels, image alt text, link text, colour contrast in both themes, code
block overflow, equation overflow, and the text alternatives in both demos.

If browser automation is available, capture screenshots at 375, 768, 1024 and
1440 px in both themes and attach them to the session report.

## Human checkpoint

The author reviews visual design, typography, the real feel of the responsive
layouts, and the screen-reader experience of the demos. The agent must not
mark this phase complete on its own judgement; it reports findings and waits
(specification §54.2).

---

# 24. Phase 19 — Performance Refinement

Confirm that blog and lesson pages remain Server Components, that demo
JavaScript loads only where used, that images are optimized and sized, that no
unused dependency remains, and that no build warnings persist. Record the
production bundle size of an ordinary article page in
`docs/decisions.md` as a baseline for later comparison.

**Completion criteria:** article pages ship no MDX, highlighter or math runtime;
client JavaScript is limited to components that need it.

---

# 25. Phase 20 — Documentation

Write the README: overview, architecture, prerequisites, installation, local
development, project structure, blog authoring, lesson authoring, a complete
frontmatter reference, using MDX components, draft workflow, publishing
workflow, testing, deployment, and future architecture. All commands use pnpm.

The README must state that authoritative requirements live in
`docs/application-spec.md` and `docs/development-plan.md`, that decisions are
logged in `docs/decisions.md`, and that coding agents should read `CLAUDE.md`
first.

Explain *why* Phase 1 has no database, backend or authentication.

**Completion criteria:** someone unfamiliar with the project can clone, install,
run, add a blog post and add a lesson using the repository documentation alone.

---

# 26. Phase 21 — Deployment and CI  *(human steps required)*

## Human steps — the agent cannot and must not attempt these

- create the GitHub repository and add the remote;
- create the Vercel account and link the project;
- set `NEXT_PUBLIC_SITE_URL` and any other environment variables;
- configure the production domain.

## Agent tasks

- add `.github/workflows/ci.yml` running `pnpm install --frozen-lockfile`,
  `pnpm lint`, `pnpm validate:content`, `pnpm test` and `pnpm build` on every
  pull request and push to `main` (specification §53);
- document the branch → preview → merge → production workflow in the README;
- confirm that draft gating uses `VERCEL_ENV`, so drafts are visible on preview
  deployments and hidden in production;
- after the human completes the deployment steps, verify the deployed
  production site: routes, highlighting, math, demos, sitemap, feed, 404s, and
  the absence of drafts.

**Completion criteria:** CI is green on a pull request; a preview deployment
shows drafts; the production deployment does not.

---

# 27. Phase 22 — Final System Validation  *(human checkpoint)*

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm validate:content
pnpm test
pnpm build
pnpm verify
```

All must pass. Then verify the full acceptance criteria in specification §49
and §54.1, and confirm the end-to-end authoring loop: edit MDX, preview
locally, commit, push, preview deployment, merge, production deployment.

The author performs the §54.2 human checkpoints and confirms that placeholder
sample content has been replaced or is still clearly marked as placeholder
(specification §3.1) before the site is pointed at a public domain.

---

# 28. Commit Strategy

The agent commits its own work, one logical commit per phase, in
Conventional Commit form. Avoid one large implementation commit.

```text
chore: initialize ai-blog-learn-site application and tooling
feat: add site layout, navigation and theme foundation
feat: add MDX content pipeline with highlighting and math
feat: add content schemas and validation
feat: add blog content utilities
feat: add blog routes
feat: add learn content model
feat: add learn routes and lesson navigation
feat: add MDX component registries
feat: add activation function explorer
feat: add gradient descent demo
feat: add homepage and about page
fix: prevent draft content from reaching production
feat: add SEO metadata, sitemap and RSS feed
test: expand content and component test coverage
docs: complete project documentation
ci: add build and test workflow
```

Work on a feature branch per phase and open a pull request, so CI runs before
anything reaches `main`.

---

# 29. Coding Agent Session Protocol

1. Open the repository and check `git status`.
2. Read `CLAUDE.md`.
3. Read `docs/decisions.md` — what earlier sessions already settled.
4. Read the relevant sections of `docs/application-spec.md` for the assigned
   phase, and this plan's section for that phase.
5. Inspect the existing implementation, including installed versions in
   `package.json` (§2.5).
6. Implement only the assigned phase; make supporting changes only where a
   dependency genuinely requires them, and say so in the report.
7. Run the validation gate (§2.2).
8. Append any new decisions to `docs/decisions.md`.
9. Commit, and write the end-of-session report.

The agent should not read all 50-plus sections of the specification every
session. `CLAUDE.md` carries the standing rules; read the phase-relevant
specification sections.

---

# 30. End-of-Session Report

```text
Phase completed
Implemented
Files changed
Dependencies added (with resolved versions)
Decisions recorded in docs/decisions.md
Spec discrepancies found
Tests run and results
Lint status
validate:content status
Build status
verify status
Known limitations
Items awaiting a human checkpoint
Next phase
```

---

# 31. Definition of Done

A phase is complete only when:

1. the required functionality exists;
2. it integrates with prior work;
3. TypeScript compiles under `strict`;
4. `pnpm lint` passes;
5. `pnpm validate:content` passes;
6. `pnpm test` passes, including tests added this phase;
7. `pnpm build` succeeds;
8. `pnpm verify` passes, where the phase touched routing, drafts or SEO;
9. no known regression exists;
10. no future infrastructure was introduced;
11. new decisions are recorded in `docs/decisions.md`;
12. any human checkpoint has been flagged, not self-certified.

---

# 32. Human Checkpoints

The agent cannot complete these alone and must not claim to:

| Phase | Checkpoint |
|---|---|
| 18 | Visual design, real responsive feel, screen-reader experience |
| 21 | GitHub and Vercel accounts, remotes, domain, environment variables |
| 22 | Final acceptance; replacing placeholder editorial content |

Editorial quality is a standing human responsibility: the correctness and
pedagogical value of every published word is the author's, never the agent's.

---

# 33. Future Development Triggers

**FastAPI** — introduce only when a specific feature requires Python-side
computation: embedding generation, transformer inference, model inspection,
output comparison, training demonstrations. Write a separate backend plan then.

**PostgreSQL** — introduce only when persistent application data is needed:
saved progress, saved experiments, quizzes, preferences, comments, accounts.
Editorial content stays in MDX.

**Authentication** — introduce only when personalized features require
identity, not merely because a database exists. Public Blog and Learn content
stays anonymously accessible.

---

# 34. First Coding Session

Implement **phase 1 only**. Read `CLAUDE.md`, `docs/application-spec.md` and
`docs/development-plan.md` first. Finish with `pnpm lint`, `pnpm test`,
`pnpm build` and `pnpm verify` passing, `docs/decisions.md` updated with the
resolved dependency versions, and one commit.

Then proceed to phase 2.
