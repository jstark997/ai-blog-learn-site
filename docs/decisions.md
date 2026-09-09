# Architecture Decision Log

Append-only. Newest entries at the bottom.

Every coding agent appends here whenever it makes a choice the specification
left open — a library, a file layout, a naming convention, a workaround for a
version incompatibility. A decision that lives only in a session transcript is
a decision the next session will silently reverse.

Format:

```markdown
## YYYY-MM-DD — Short title
**Context:** what forced a choice
**Decision:** what was chosen
**Alternatives:** what was rejected, and why
**Consequences:** what this makes easy, and what it makes hard
```

---

## 2026-09-07 — MDX is compiled at build time via next-mdx-remote/rsc

**Context:** Editorial content lives in `content/`, outside `app/`, so
file-routed MDX (`@next/mdx` page files) does not apply. The alternatives had
materially different consequences and the choice was originally left to the
implementing agent — the highest-risk open decision in the project.

**Decision:** Compile MDX from the filesystem inside React Server Components
using `next-mdx-remote/rsc`, with `gray-matter` for frontmatter.

**Alternatives:** `@next/mdx` file routing (incompatible with content outside
`app/`); the legacy `next-mdx-remote` `serialize()` client flow (ships an MDX
runtime to the browser); compiling with `@mdx-js/mdx` directly (more wiring for
no gain at this scale).

**Consequences:** Ordinary articles ship no MDX runtime. The plugin chain lives
in one file, `lib/content/mdx.ts`. Content stays authorable as plain files in
Git. Recorded in spec §4.3.

---

## 2026-09-07 — Learn routes use nested dynamic segments, not a catch-all

**Context:** The specification and the development plan disagreed:
`app/learn/[...slug]` in one, `/learn/[topic]/[lesson]` in the other.

**Decision:** Explicit nested segments — `app/learn/[topic]/page.tsx` and
`app/learn/[topic]/[lesson]/page.tsx`. The topic overview route is required,
not optional.

**Alternatives:** A catch-all, which forces a `slug.length` branch to
distinguish topic pages from lesson pages and complicates
`generateStaticParams`, for no benefit at a fixed depth of two.

**Consequences:** Deeper Learn nesting would need a route change. Accepted;
lessons are two levels deep by design. Spec §11.2.

---

## 2026-09-07 — A topic has exactly one source of truth: its directory name

**Context:** The original design stored a topic in three places — the directory
(`neural-networks`), lesson frontmatter (`topic: "Neural Networks"`), and
`topics.ts` (`id: "neural-networks"`). A typo such as `"Neural networks"` would
silently create a second group on the Learn index with no error anywhere.

**Decision:** The directory name is the canonical topic id and URL segment.
`topics.ts` maps it to title, order and description. Lesson frontmatter has no
`topic` field, and no `slug` field either.

**Consequences:** Adding a topic touches two places instead of three, and
`validate:content` can enforce directory ↔ config parity. Spec §11.1, §12.

---

## 2026-09-07 — Dates are parsed with a Zod preprocessor, not `z.string()`

**Context:** YAML parses an unquoted `2026-09-04` into a JavaScript `Date`, not
a string. A `z.string()` schema would reject every date the author forgot to
quote — a bug that surfaces on the author's first real post rather than on the
carefully quoted examples in the spec.

**Decision:** An `isoDate` preprocessor coerces `Date` back to `YYYY-MM-DD`
before validating the format. Used for every date field on both content types.

**Consequences:** Authors may quote dates or not. Spec §12.

---

## 2026-09-07 — Draft visibility keys on VERCEL_ENV, not NODE_ENV

**Context:** A Vercel preview deployment is a *production* Next.js build
(`NODE_ENV === "production"`). A `NODE_ENV`-only rule would hide drafts on
preview URLs — precisely where the spec says drafts most need reviewing, for
math rendering, diagrams and responsive layout.

**Decision:** One helper, `showDrafts` in `lib/content/env.ts`, reading
`SHOW_DRAFTS` first and then `VERCEL_ENV ?? NODE_ENV`. Drafts are visible in
development and on preview deployments; hidden in production.

Separately: excluding a draft from `generateStaticParams` does **not** make its
URL 404, because Next.js defaults `dynamicParams` to `true`. Both
`dynamicParams = false` and a `notFound()` guard are required.

**Consequences:** One documented Vercel-specific environment read, isolated to
a single file, with `SHOW_DRAFTS` as the host-neutral escape hatch. Spec §16.

---

## 2026-09-07 — Invalid frontmatter fails for published content, warns for drafts

**Context:** The spec previously said both "reject malformed entries" and "do
not silently ignore invalid metadata", leaving the agent to guess. Under a
strict reading, a half-written draft missing a `description` would break
`pnpm dev` and block deployment of unrelated published content.

**Decision:** Published content fails the build; drafts warn and are skipped. A
file whose `draft` field is itself unreadable is treated as published, and
fails. `pnpm validate:content` applies the same rules eagerly plus the
cross-file checks.

**Consequences:** Drafts stay cheap to leave half-finished. Spec §18.

---

## 2026-09-07 — Two MDX component registries, with demos lazily loaded

**Context:** A single registry containing every demo places every interactive
component in the module graph of every MDX-rendering page, contradicting the
"minimal client-side JavaScript on ordinary article pages" requirement.

**Decision:** `proseComponents` (server-rendered, always available) and
`demoComponents` (each wrapped in `next/dynamic`). Blog pages use the first;
lesson pages use both.

**Consequences:** Demo JavaScript loads only on lessons that use a demo. Spec
§15.

---

## 2026-09-07 — Demos are SVG, and accessible from the first commit

**Context:** Accessibility was originally a late polish phase, after both demos
were built. Retrofitting keyboard operation and a text alternative into a
`<canvas>` plot is substantially more work than building it that way.

**Decision:** Render demos in SVG. Labelled controls, keyboard-operable
sliders, visible focus rings and an `aria-live` state summary are completion
criteria of the phases that build each demo.

**Consequences:** Slightly more work per demo, much less rework. Spec §14.1.

---

## 2026-09-07 — Dependency versions are pinned, not "latest"

**Context:** `create-next-app` installs whatever is current, while a coding
agent writes from its training data. The predictable results are Next 14-style
synchronous `params` against a Next 16 scaffold, and a `tailwind.config.ts`
created for a Tailwind 4 project that no longer uses one.

**Decision:** Pin the versions listed in spec §4.7, verified 2026-09-07. Pin
`next`, `react`, `react-dom` and `tailwindcss` exactly. TypeScript pins to the
5.9 line rather than the 7.x native compiler, whose surrounding lint and editor
toolchain is still settling.

**Consequences:** Upgrades become deliberate. Revisit TypeScript 7 later and
record the outcome here.

---

## 2026-09-07 — Test runner is configured in phase 1

**Context:** The plan required `pnpm test` to pass at the end of every phase
while introducing the test runner in a late phase, and its "no critical
regression" rule had no mechanism behind it.

**Decision:** Vitest, `@testing-library/react` and `jsdom` are installed in
phase 1, with one trivial passing test, so the validation gate is real from the
first commit and the suite grows alongside the code.

**Consequences:** A few minutes of setup in phase 1; a working regression net
for the following twenty-one phases. Spec §40.

---

## 2026-09-07 — MDX, syntax highlighting and math are one phase

**Context:** The original plan split them across phases 3, 11 and 12. They are
a single unified plugin chain; configuring it three times means rewiring
`next.config` and the compile function three times, each pass risking
regressions in already-finished pages.

**Decision:** One "content pipeline" phase builds all three. Draft filtering
likewise moves into the content-utility phases rather than a later retrofit.

**Consequences:** A larger phase 3, and fewer rewrites later. Spec §50.

---

## 2026-09-09 — Project-local skills, agent and command adopted from assoc-mgr-ai

**Context:** The sibling project `assoc-mgr-ai` already carries a set of
Claude Code skills that encode conventions this project also needs, rather than
re-deriving them here.

**Decision:** Copied into `.claude/`: `conventional-commits` (the plan requires
one Conventional Commit per phase), `clean-typescript`, `modern-accessible-html-jsx`,
`modern-best-practice-react-components` (with its `you-dont-need-useeffect`
reference), `modern-tailwind`, the `DocsExplorer` agent, and the `code-review`
command.

Two were modified rather than copied verbatim:

- `modern-tailwind` advised extending the theme in `tailwind.config`, which is
  Tailwind 3 guidance and directly contradicts this project's Tailwind 4 pin
  and `CLAUDE.md`. Rewritten for CSS-first `@theme` configuration, with the
  project's dark-mode strategy added.
- `code-review` reviewed the entire codebase on every invocation. Now defaults
  to the current branch's diff against `main` — which matches the
  one-branch-per-phase workflow — with `SCOPE=ALL` for the full sweep, plus an
  `A11Y` mode and a list of this project's characteristic failure modes.

**Not adopted:** `web-security` (written for an authenticated FastAPI and
Postgres application; revisit when a backend exists) and `modern-browser-apis`
(encourages View Transitions, Popover, Web Workers and similar, which pulls
against the "minimal client-side JavaScript on article pages" requirement).

**Consequences:** `.claude/skills`, `.claude/agents` and `.claude/commands` are
version-controlled project tooling. `.claude/settings.local.json` is personal
and may be gitignored. A skill copied from another project can carry stale
version advice — check any future import against spec §4.7 before trusting it.

---

## 2026-09-08 — Phase 1 resolved dependency versions

**Context:** Spec §4.7 pins version *lines*; the plan requires the resolved
versions of every dependency to be recorded here.

**Decision:** Installed with pnpm 11.13.0 on Node v23.5.0. `next`, `react`,
`react-dom`, `tailwindcss` and `@tailwindcss/postcss` are pinned exactly;
`typescript` is pinned to the 5.9 line with `~`; the rest carry `^`.

```text
next                          16.3.4     exact
react                         19.2.8     exact
react-dom                     19.2.8     exact
tailwindcss                    4.3.3     exact
@tailwindcss/postcss           4.3.3     exact
typescript                     5.9.3     ~5.9.3
eslint                         9.39.5
eslint-config-next            16.3.4     exact
@types/node                  24.13.3
@types/react                 19.2.18
@types/react-dom              19.2.7
vitest                         5.0.0
@vitejs/plugin-react           6.1.1
jsdom                         30.0.1
@testing-library/react        16.3.3
@testing-library/jest-dom      7.0.1
@testing-library/user-event   14.6.7
```

**Alternatives:** `typescript@latest` resolves to 7.0.2, which spec §4.7
explicitly defers. `@types/node@^20`, which `create-next-app` scaffolds, is
rejected by Vitest 5's peer range (`^22 || >=24`) — raised to `^24`.

**Consequences:** `pnpm peers check` is clean. Zod, MDX, KaTeX and Shiki are
not installed yet; phases 3 and 4 add them and append their resolved versions.
The `@types/node` major (24) is ahead of the local runtime (Node 23.5, not an
LTS release). Types only, and CI should run an LTS Node.

---

## 2026-09-08 — create-next-app flags differ from the plan; scaffolded via a temporary directory

**Context:** Plan §6.3 lists flags to verify against the installed scaffolder.
`create-next-app@16.3.4 --help` documents `--src-dir` but not `--no-src-dir`,
and adds `--agents-md` (default on), which would write an `AGENTS.md` competing
with `CLAUDE.md` as the agent contract.

**Decision:** Scaffolded with `--ts --tailwind --eslint --app --no-src-dir
--no-agents-md --disable-git --import-alias "@/*" --use-pnpm --skip-install`.
Both negated flags are accepted even though only the positive form is
documented. Scaffolded into `/tmp` and copied the application files in, rather
than running it against the non-empty repository root, so the existing
`.gitignore`, `docs/`, `CLAUDE.md` and `.git/` could not be overwritten.

**Not copied:** the scaffold's `.gitignore` (the repository's own is
authoritative — only `.pnpm-debug.log*` was merged in), its `README.md` (Next.js
boilerplate; the real README is phase 20), and `public/*.svg` (Next.js and
Vercel marketing assets). `app/page.tsx` was replaced with a placeholder;
phase 2 owns the real shell. `next-env.d.ts` is gitignored and regenerated by
`next build`.

**Consequences:** `pnpm-workspace.yaml` came from the scaffold and is kept —
it carries `allowBuilds` entries for `sharp` and `unrs-resolver`. Re-running
the scaffolder is not part of any later phase.

---

## 2026-09-08 — package.json declares "type": "module"

**Context:** Vitest 5 loads `vitest.config.ts` through Vite's native config
loader and warns that ESM syntax in a file treated as CommonJS is unsupported
in a future major: *"Use a `.mjs` extension or set `type: module`"*.

**Decision:** Set `"type": "module"` in `package.json`, keeping the filename
`vitest.config.ts` that plan §6.6 specifies.

**Alternatives:** Renaming to `vitest.config.mts` — silences the warning but
diverges from the plan's filename and from every other config in the tree.

**Consequences:** The whole repository is ESM. `scripts/*.mjs` are unaffected;
any future `.js` file at the root is ESM by default. `next build`, `eslint` and
PostCSS are unaffected.

---

## 2026-09-08 — `LayoutProps` and friends are build-generated types

**Context:** `pnpm build` succeeds, but a bare `tsc --noEmit` on a clean
checkout fails with `TS2304: Cannot find name 'LayoutProps'`. Next 16 generates
route-aware helper types (`LayoutProps<"/">`, `PageProps<…>`) into
`.next/types/`, which `tsconfig.json` includes but which do not exist until a
build has run.

**Decision:** Type checking is a build step, not a separate script. There is no
`typecheck` script in `package.json`; `next build` runs TypeScript itself and
the validation gate covers it. A standalone `tsc --noEmit` is valid only after
a build.

**Consequences:** CI must run `pnpm build` to type check. If a future phase
wants a standalone `typecheck` script, it has to depend on generated types
being present, and that ordering must be recorded here.

---

## 2026-09-08 — `scripts/verify.mjs` builds, then probes a free port

**Context:** Plan §2.3 forbids a foreground `next start`. Verification needs a
production server that is guaranteed to shut down.

**Decision:** `verify.mjs` builds (skippable with `VERIFY_SKIP_BUILD=true`),
asks the OS for a free port rather than assuming 3000, polls until the server
answers, runs a table of `{ path, status, description }` assertions, and always
stops the server in a `finally` block with `SIGTERM` then `SIGKILL`.

**Consequences:** Later phases extend one `ASSERTIONS` array — blog and learn
routes, 404s, draft gating, sitemap, feed — instead of restructuring the
script. Concurrent runs cannot collide on a port.
