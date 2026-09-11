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

---

## 2026-09-09 — Colour tokens are declared once with `light-dark()`

**Context:** Spec §19 requires `prefers-color-scheme` plus a `class="dark"`
override on `<html>`. The usual expression of that is every token written
twice — once under `@media (prefers-color-scheme: dark)` and again under the
class selector — which is where palettes drift out of sync.

**Decision:** Each token is declared once in `@theme` as
`light-dark(<light>, <dark>)`. `:root` sets `color-scheme: light dark`, so the
system preference decides; `:root.dark` and `:root.light` pin `color-scheme`
and override it. Tailwind's `dark:` variant is redefined with
`@custom-variant` to match both mechanisms, for the rare case a token swap
cannot express.

**Alternatives:** Duplicated `@media` and `.dark` palette blocks (two places to
edit per colour); a `data-theme` attribute (no advantage over the class the
spec already names).

**Consequences:** Adding a colour means one line. Lightning CSS compiles
`light-dark()` down to a `--lightningcss-light`/`--lightningcss-dark` variable
pair and emits the matching `:root.light` / `:root.dark` overrides itself, so
the mechanism works regardless of browser support for the function; verified in
the built stylesheet and in a browser for all three states. Phase 3 should
select Shiki's dual theme the same way rather than adding a second mechanism.

No theme toggle exists yet — nothing writes those classes. Phase 2 was not
asked for one, and a toggle needs a blocking inline script to avoid a flash of
the wrong theme. If the author wants one, that is its own decision.

---

## 2026-09-09 — The reading measure is `--container-measure`, not `max-w-prose`

**Context:** Tailwind 4's built-in `max-w-prose` is a hard-coded `65ch` and is
not driven by a theme variable, so defining `--container-prose` in `@theme`
changed nothing — confirmed by grepping the built stylesheet.

**Decision:** The reading column is `--container-measure: 68ch`, used through
`max-w-measure` and exposed as `<Container width="prose">`.

**Consequences:** One token controls article width for phases 6 and 8. Do not
reach for `max-w-prose`; it silently ignores the theme.

---

## 2026-09-09 — Shell composition, and where the client boundary sits

**Context:** The shell needs the current pathname for `aria-current` and needs
state for the mobile menu, both of which are client-only concerns.

**Decision:** `components/layout/` holds `SiteHeader`, `SiteFooter` and
`Container`; `components/navigation/` holds `MainNav`, `MobileNav`, `NavLink`
and `nav-links.ts`. Files are PascalCase for components and kebab-case for
plain modules, with named exports throughout. Only `NavLink` and `MobileNav`
carry `"use client"` — the header, the footer and every page stay server
components.

The four navigation entries and the `isActivePath` rule live in
`nav-links.ts`, so the desktop and mobile menus cannot drift, and the active
rule is unit-testable without React. `/` matches exactly; every other entry
also matches its descendants, so an article marks its section as current.

Mobile navigation is a disclosure — a button owning a panel via
`aria-controls`/`aria-expanded` — not a drawer or a modal dialog. The panel
stays mounted and is hidden with the `hidden` attribute, so its links leave the
tab order; Escape closes it and returns focus to the button; choosing a link
closes it, because client-side navigation leaves the panel mounted. Spec §22
asks for the simplest accessible implementation.

**Consequences:** Phase 9's lesson navigation should follow the same shape.
Adding a nav entry is a one-line change in `nav-links.ts`.

---

## 2026-09-09 — Site copy lives in `lib/site.ts`

**Context:** Spec §8.1 requires the site's own words to be configurable rather
than embedded throughout the application.

**Decision:** `lib/site.ts` exports one `site` object — name, description,
section descriptions, author — consumed by the header, the footer, the page
metadata and the placeholder pages.

**Consequences:** The site name and every description are placeholders written
by an agent (spec §3.1) and are marked as such in the file. The author replaces
them; nothing else has to change. Phase 16 adds the canonical URL from
`NEXT_PUBLIC_SITE_URL` — put it here.

---

## 2026-09-09 — Testing Library cleanup is registered explicitly

**Context:** Vitest runs without globals (`describe`/`it` are imported), so
Testing Library cannot detect an `afterEach` to register its automatic cleanup.
Renders accumulated across tests within a file, and role queries found
duplicate elements.

**Decision:** `tests/setup.ts` calls `afterEach(cleanup)` explicitly.

**Consequences:** Component tests in later phases get a clean DOM without
repeating the hook. Do not enable Vitest globals to fix this — the explicit
imports are the clearer convention.

---

## 2026-09-10 — One MDX entry point, and what it does not return

**Context:** Spec §4.3 decided the compilation strategy; what was still open is
the shape of the function the rest of the site calls, and whether it also hands
back frontmatter.

**Decision:** `lib/content/mdx.ts` exports one function, `renderMdx({ source,
components })`, returning a `ReactElement`. It wraps `compileMDX` from
`next-mdx-remote/rsc` and is the only place the plugin chain is configured:
`remark-gfm` and `remark-math` on the remark side, `rehype-katex` then
`rehype-pretty-code` on the rehype side. `parseFrontmatter: true` strips
frontmatter so it cannot render as a stray paragraph, but the parsed object is
deliberately **not** returned.

**Alternatives:** Returning `{ content, frontmatter }` — rejected because it
offers pages a second, unvalidated route to metadata. Discovery reads
frontmatter with `gray-matter` and validates it with Zod (phases 4–5); a page
should never be able to reach around that.

**Consequences:** Callers pass a body and a registry and get an element.
Swapping a plugin touches one file. Content utilities own metadata entirely.

---

## 2026-09-10 — `blockJS` is turned off; `blockDangerousJS` stays on

**Context:** `next-mdx-remote` 6.0.0 added two security options, both defaulting
to `true`. `blockJS` strips every MDX expression — including JSX *attribute*
expressions, so `<GradientDescentDemo learningRate={0.1} />` silently loses its
props. The demos of phases 11 and 12 depend on exactly that.

**Decision:** `blockJS: false`, `blockDangerousJS: true`.

**Alternatives:** Leaving `blockJS` on and passing demo configuration as string
attributes — rejected: it pushes parsing into every demo and the failure is
silent, which is the worst property a content bug can have.

**Consequences:** The defaults protect sites that render MDX submitted by
strangers. This site's content is authored in this repository and reviewed in
pull requests, so the threat model does not apply. If that ever changes —
user-submitted or fetched MDX — this is the line to revisit first.

---

## 2026-09-10 — Shiki dual theme, selected by `light-dark()`

**Context:** Spec §19 fixes the themes but not how the page chooses between
them, and the shell (phase 2) already settled the site's theme mechanism.

**Decision:** `theme: { light: "github-light", dark: "github-dark" }`, with
`keepBackground: false` and `defaultLang: { block: "plaintext" }`. Shiki writes
`--shiki-light` and `--shiki-dark` on every token; `app/globals.css` picks one
with `light-dark()`, the same mechanism the colour tokens use, so the system
preference and a `class="dark"` override both work and nothing re-highlights.

**Alternatives:** A `.dark` descendant selector, as the rehype-pretty-code docs
suggest — rejected: it handles the class but not `prefers-color-scheme`, so the
code blocks would disagree with the rest of the page for a reader who has never
touched a toggle. Keeping Shiki's own background — rejected: the blocks sit on
the site's `surface` token instead, so a code block looks like part of the page.

**Consequences:** Verified in the built stylesheet: Lightning CSS downlevels
`light-dark()` to its `--lightningcss-light` / `--lightningcss-dark` pair,
already emitted for `:root`, `prefers-color-scheme`, `:root.light` and
`:root.dark`. `defaultLang` keeps an unknown language from producing an empty
`data-language`; such a fence falls back to plain text rather than failing.

---

## 2026-09-10 — KaTeX is pinned to one version by a pnpm override

**Context:** `rehype-katex@7.0.1` declares `katex: ^0.16.0` as an ordinary
dependency, not a peer. pnpm's strict layout therefore gave it a private KaTeX
0.16 to render with, while `app/layout.tsx` imported the stylesheet from the
pinned 0.18 (spec §4.7). KaTeX 0.18 prefixed nineteen generic internal class
names — `.base` → `.katex-base`, `.strut` → `.katex-strut`, and so on — so the
markup and the stylesheet would not have matched and every equation would have
rendered unstyled. Confirmed before the fix: two copies resolved, and 0.16's
output used the unprefixed names.

**Decision:** `overrides: { katex: 0.18.7 }` in `pnpm-workspace.yaml`, which is
where pnpm 11 reads overrides — the `pnpm.overrides` key in `package.json` is
ignored with a warning. `pnpm why katex` now reports one version, and
`tests/mdx.test.tsx` asserts on `katex-base` so a regression fails the suite.

**Alternatives:** Pinning `katex` to 0.16 to match the plugin — rejected, it
contradicts the spec's pin. Importing the stylesheet from the nested copy —
rejected as unmaintainable.

**Consequences:** Any future dependency bump must keep one KaTeX. This is worth
re-checking if `rehype-katex` ever widens its range.

---

## 2026-09-10 — Prose styling lives in `app/globals.css`

**Context:** The pipeline emits ordinary HTML — headings, lists, tables,
blockquotes — that no component intercepts. Nothing in the plan assigns that
styling to a phase, and the code blocks this phase owns cannot be judged
readable on an otherwise unstyled page.

**Decision:** A `.prose` block in `app/globals.css`, in `@layer components`,
styling the elements MDX produces, alongside the Shiki and KaTeX rules. No
`@tailwindcss/typography`: the type scale and colour tokens already exist and
the plugin would bring a second, competing one.

**Alternatives:** Deferring to phase 6 — rejected, this phase's validation
depends on it.

**Consequences:** Phase 10's registry components override individual tags and
inherit the rest. One thing is deliberately left undone: a wide table keeps its
table semantics and wraps inside its cells rather than scrolling, because
`display: block` on a `<table>` drops the table role in some screen readers.
The scrollable wrapper belongs to a `table` override in the prose registry.

---

## 2026-09-10 — The pipeline check is a page now and a test forever

**Context:** The plan asks for a throwaway MDX file rendered through a temporary
route. A route a human can look at is the only way to judge "readable in both
themes"; a route is also the only thing that disappears when the phase ends.

**Decision:** Both. `content/_pipeline-check.mdx` and
`app/mdx-pipeline-check/page.tsx` stay until phase 6 renders real posts, then
both are deleted along with the `/mdx-pipeline-check` line in `scripts/verify.mjs`.
The regression protection is `tests/mdx.test.tsx`, which compiles its own inline
sources through `renderMdx` and asserts on the HTML — GFM, both kinds of maths,
all six languages, unknown-language fallback, the component registry and JSX
attribute expressions.

**Alternatives:** Pointing the tests at the fixture file — rejected, the tests
would break when the fixture is deleted.

**Consequences:** The check file sits at the root of `content/`, not under
`content/blog/` or `content/learn/`, so no content utility will ever discover
it. Its leading underscore marks it as scaffolding.

---

## 2026-09-10 — Spec discrepancy: `next-mdx-remote` is archived upstream

**Context:** Not a decision — a finding to record. Spec §4.3 fixes
`next-mdx-remote/rsc` as the compilation strategy, and the pinned 6.0.0 works
exactly as specified. The repository itself, however, is now archived and
unsupported upstream; its README points at `next-mdx-remote-client`,
`mdx-bundler`, or `@mdx-js/mdx` directly.

**Decision:** Follow the specification. Nothing is changed in this phase.

**Consequences:** No security patches will arrive. The exposure is small — the
package is a build-time compiler over content this repository owns, and it is
used behind one function. If it has to be replaced, `lib/content/mdx.ts` is the
only file that changes. Flagged for the author.
