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

---

## 2026-09-10 — Zod resolved version, pinned to the 4.5 line with `~`

**Context:** Spec §4.7 pins `zod 4.5.x`. The current release is 4.6.2, so a
caret range would quietly move off the pinned line on the next clean install.

**Decision:** `"zod": "~4.5.4"` in `package.json`; resolved 4.5.4. The same
reasoning already applies to `typescript` (`~5.9.3`); the other dependencies
carry `^` because their pinned line is also the newest published line.

**Consequences:** Moving to Zod 4.6 becomes a deliberate edit. Re-check this
when the spec's pins are next revised.

---

## 2026-09-10 — `validate-content.mjs` imports the TypeScript schemas directly

**Context:** The schemas must have exactly one definition: the application
imports `lib/content/schemas.ts` through the Next.js build, and the plan puts
the eager validator in `scripts/validate-content.mjs`, which Node runs itself.
A `.mjs` script cannot import a `.ts` module without help.

**Decision:** The script imports the TypeScript modules through Node's native
type stripping. Node strips types unflagged from v23.6; the script asks
`process.features.typescript` (documented since v22.10) and, when the answer is
falsy, re-execs itself once with `--experimental-strip-types`. The TypeScript
modules are therefore imported dynamically, after that guard, because static
imports are resolved before any statement runs.

**Alternatives:** Pinning `--experimental-strip-types` in the `package.json`
script — rejected, a flag a future Node may reject, and the runtime that needs
it is the older one. Adding `tsx`, `ts-node` or a build step for one script —
rejected, a dependency and a compile stage for a file that runs in a second.
Duplicating the schemas in JavaScript — rejected outright; two definitions of
frontmatter is precisely the bug this phase exists to prevent.

**Consequences:** `lib/content/schemas.ts` and `lib/content/validate.ts` must
stay importable by bare Node: no path aliases (`@/…`), no JSX, and only erasable
TypeScript — no `enum`, no `namespace`, no parameter properties. Anything they
import must resolve as an ordinary package. Later phases may add files to
`lib/content/` freely; only what the script imports carries this constraint,
and `lib/content/topics.ts` will be the next one.

---

## 2026-09-10 — Frontmatter is strict: an unknown field is an error

**Context:** Zod strips unknown keys by default. Under that default a misspelt
`drafts: true` publishes an unfinished post, in silence — the failure mode this
project can least afford, and one no test would catch.

**Decision:** Both schemas are `z.strictObject`. An unrecognised key fails
validation and is named in the error. Spec §10 lists `featured`,
`canonicalUrl` and `coverImage` as possible future fields; a future field is
added to the schema first, which is a one-line change.

**Alternatives:** Passthrough or stripping, either of which trades a silent
draft leak for the convenience of undeclared fields.

**Consequences:** Content cannot carry private notes in frontmatter. If an
author wants scratch metadata, it belongs in prose or in a field the schema
declares.

---

## 2026-09-10 — What the schemas enforce beyond the specification's sketch

**Context:** Spec §10 and §12 give the field lists; a few details were left to
the implementation.

**Decision:**

- `order` is a positive integer. Sparse multiples of ten are the *convention*
  (spec §13) and the reason for it — inserting a lesson without renumbering —
  is defeated by enforcing it, so an author who deliberately writes 15 is
  allowed. `validate:content` does reject a duplicate `order` within a topic,
  which is the check that actually protects lesson ordering.
- `tags` and `prerequisites` default to `[]`, so omitting them is legal and
  every consumer receives an array.
- `title` and `description` are trimmed and must be non-empty, so `title: ""`
  fails rather than rendering a blank heading.
- A date is checked for the ISO shape *and* for existing: `Date.parse` accepts
  `2026-02-30` and silently rolls it over to 2 March. The shape check carries
  `abort: true` so a malformed date produces one line of explanation, not two.
- A prerequisite must look like `<topic-id>/<lesson-id>`, lowercase and
  hyphenated, matching the URL rules in spec §26.

**Consequences:** The error messages name the field and the expectation, as
spec §18 requires, and read as instructions to an author rather than as Zod
internals.

---

## 2026-09-10 — The content tree's shape is validated, not assumed

**Context:** Discovery in phases 5 and 7 will read `content/blog/*.mdx` and
`content/learn/<topic>/<lesson>.mdx`. A file outside those shapes is not a
build error — it is simply never read, which is the silent failure spec §18
forbids.

**Decision:** `validate:content` walks the tree and reports anything the
utilities will not see: a subdirectory under `content/blog/` (a post there has
no route), an `.mdx` file directly under `content/learn/` (a lesson needs a
topic directory), a directory nested below a topic, and — as a warning — any
non-`.mdx` file. Names beginning with `_` or `.` are skipped as scaffolding,
which is what keeps `content/_pipeline-check.mdx` and `.gitkeep` out of the
report.

**Consequences:** Blog posts stay flat and lessons stay exactly two levels
deep, enforced rather than remembered. A dated archive layout such as
`content/blog/2026/` would need this rule revisited first.

---

## 2026-09-10 — Cross-file clashes involving a draft warn rather than fail

**Context:** Spec §18 sets severity by draft status for *per-file* validation
and is silent about the cross-file checks. A duplicate `order` shared by a
published lesson and a half-finished draft would otherwise fail the production
build — where the draft does not exist at all.

**Decision:** A clash — duplicate `order`, duplicate blog slug — is an error
only when every file involved is published; if any is a draft it warns. An
unresolvable or draft prerequisite takes its severity from the lesson that
declares it, so a published lesson may not depend on a draft.

**Consequences:** Drafts stay cheap. The checks still fail the build for
anything a reader could actually reach.

---

## 2026-09-10 — Validation lives in `lib/content/validate.ts`, shared by both callers

**Context:** Validation happens twice (spec §4.4): lazily, as the build reads a
file, and eagerly, in `validate:content`. Implementing the severity rule and
the error formatting in each would let them drift, and the eager one would be
the one nobody notices is wrong.

**Decision:** A third module beside the schemas. `checkFrontmatter` classifies
a failure without acting on it; `parseFrontmatter` is the lazy wrapper that
throws for published content and warns-and-returns-`null` for a draft — the
function phases 5 and 7 call; `crossFileIssues` is a pure function over already
parsed records, so the cross-file rules are unit-tested directly rather than
only through a subprocess. The script contributes the filesystem walk, the
report and the exit code, and nothing else.

**Consequences:** Content utilities call `parseFrontmatter` and inherit correct
severity for free. `scripts/validate-content.mjs` takes an optional content
root, which is how the end-to-end test hands it a tree of its own.

---

## 2026-09-10 — `showDrafts` also honours `SHOW_DRAFTS=false`

**Context:** Spec §16 gives the helper as code in which `SHOW_DRAFTS` can only
turn drafts *on*. The same section's table says a local production build shows
drafts "unless `SHOW_DRAFTS=false`", and the committed `.env.example` documents
that value — under the literal code, setting it has no effect anywhere.

**Decision:** The environment rule is the specification's; `SHOW_DRAFTS` is
read as an explicit override in both directions, so `false` hides drafts
wherever it is set. With the variable unset, behaviour is exactly the
specification's code.

**Alternatives:** Implementing the snippet verbatim and leaving `.env.example`
describing a switch that does nothing.

**Consequences:** The override can only ever hide more, never leak more, so the
production guarantee is unaffected. The remaining discrepancy is reported, not
resolved here: spec §16's table also claims a *local* production build shows
drafts by default, which its own code contradicts — locally, `NODE_ENV` is
`production` and `VERCEL_ENV` is unset, so drafts are hidden. The implementation
follows the code; `SHOW_DRAFTS=true` is the way to preview drafts in a local
production build.

**Note on testing:** `showDrafts` is a module-level constant, as specified, so a
test that needs a different environment must `vi.resetModules()` and re-import
the module. `tests/env.test.ts` shows the pattern for phases 5, 7 and 15.

---

## 2026-09-11 — Strict frontmatter accepted by the author, with a revisit trigger

**Context:** The strict-object decision of 2026-09-10 was left for the author to
confirm, because the cost lands on them: no undeclared field, no scratch
metadata, and a Markdown editor that stamps its own keys would fail the build.

**Decision:** Accepted as it stands. The asymmetry holds — a stripped unknown
key means `drafts: true` publishes an unfinished post with no error anywhere,
while a strict failure is loud, immediate and names the key.

**Revisit when:** frontmatter starts being written by something other than the
author in this repository — a non-technical contributor, or an editor that
injects its own keys. The middle ground then is to keep the strict schema and
declare one ignored `meta:` mapping as an escape hatch, rather than to relax to
passthrough with a warning; a warning that does not block is a warning nobody
reads.

---

## 2026-09-11 — `getAllBlogPosts` returns raw MDX, not rendered React

**Context:** The plan specifies `{ slug, metadata, content }` without saying
what `content` is. `renderMdx` returns a `ReactElement`, so returning rendered
content was an option.

**Decision:** `content` is the raw MDX body with frontmatter stripped, exactly
as `gray-matter` produces it. The route compiles it with `renderMdx`.

**Alternatives:** Returning a rendered element, which would pull JSX and the
whole plugin chain into `lib/content/` — contradicting the architecture
invariant that `lib/content/` contains no JSX, and forcing the sitemap, the
feed and every test to compile articles they only need metadata from.

**Consequences:** A consumer that wants HTML does one more call. Blog
retrieval stays usable from a plain Node test with no React runtime, and
`lib/content/blog.ts` has no opinion about how a post is displayed.

---

## 2026-09-11 — Content-root parameter, so tests do not depend on sample content

**Context:** `getAllBlogPosts()` reads `content/blog/`. Testing discovery,
ordering and slug derivation against that directory would couple the test suite
to scaffolding the author is expected to delete, and every new post would risk
breaking an assertion.

**Decision:** Both functions take an optional trailing `root` parameter
defaulting to `<cwd>/content/blog`. Tests pass a temporary tree; application
code calls `getAllBlogPosts()` and `getBlogPostBySlug(slug)`.

**Alternatives:** Mocking `node:fs`, which tests the mock rather than the walk;
an environment variable for the content root, which is real configuration for a
test-only need; asserting against the sample posts, which is brittle.

**Consequences:** Matches `scripts/validate-content.mjs`, which already accepts
a content root for the same reason. The parameter is public surface that nothing
in `app/` should ever pass — the doc comment says so. Three tests do still read
`content/blog/` deliberately, to assert the §37 sample set exists, and they
assert only properties that survive the author adding posts.

---

## 2026-09-11 — No caching layer on blog retrieval

**Context:** During a static build, `getAllBlogPosts()` is called by the blog
index, the home page, the sitemap and the feed, re-reading the same files each
time.

**Decision:** No memoisation. Each call walks the directory and reads the files.

**Alternatives:** A module-level promise cache, which would have to be
invalidated between tests and would hold a stale tree across `root` arguments;
React's `cache()`, which is request-scoped and behaves differently outside a
render, so the tests would exercise a different code path than the build.

**Consequences:** A few dozen small file reads per build — cheaper than the
machinery to avoid them (plan §2.6). If the content tree ever grows enough to
matter, the fix is one wrapper in this module and nothing else changes.

---

## 2026-09-11 — Sample posts open with a Markdown blockquote, not `<Callout>`

**Context:** Spec §3.1 requires every sample file to open with a visible
placeholder callout and gives `<Callout variant="warning">` as its example. The
MDX component registries, `Callout` among them, are phase 10. The blog UI is
phase 6.

**Decision:** The placeholder is a Markdown blockquote opening with
**Placeholder content.** in bold. No sample file references a component.

**Alternatives:** Writing `<Callout>` now, which would make phase 6 fail to
render its own sample posts — an MDX file may only use components the registry
passes it — and force phase 10's work to be pulled forward under a different
phase's name.

**Consequences:** The placeholder is visible and unmissable from phase 6
onward, with no component dependency. When phase 10 lands `proseComponents`,
the three sample files may be switched to `<Callout variant="warning">`; they
are scaffolding either way, and the author's real posts will not carry one.

---

## 2026-09-11 — A blog slug must be a bare filename

**Context:** `/blog/[slug]` hands `getBlogPostBySlug` a URL segment, which the
function turns into a filesystem path.

**Decision:** The slug is rejected — `null`, so the route 404s — unless it is
non-empty, does not begin with `.`, and equals its own `path.basename`. A
traversal attempt never reaches `readFile`.

**Alternatives:** A strict `^[a-z0-9-]+$` pattern, which would also reject
legitimate filenames the author might choose and make discovery and lookup
disagree about what counts as a post.

**Consequences:** Discovery and lookup stay consistent: anything
`getAllBlogPosts()` can find, `getBlogPostBySlug()` can fetch. `dynamicParams =
false` in phase 6 makes this belt-and-braces, which is the intent.

---

## 2026-09-11 — Content dates are formatted by one helper, in UTC, in a fixed locale

**Context:** Frontmatter dates are `YYYY-MM-DD` calendar days. Two ways to
render them go wrong: `new Date("2026-01-01")` formatted in a zone behind UTC
prints 31 December, and a formatter with no explicit locale produces whatever
the build machine's ICU defaults are, so the generated HTML changes without the
content changing.

**Decision:** `lib/utils/date.ts` exports `formatDate`, the only place a date
becomes words. It reads the value as UTC midnight and formats it with a pinned
`en-GB` long form — `4 September 2026` — matching the British spelling the
project's documents already use. Every date is wrapped in a `<time dateTime>`
element, so the machine-readable value travels with the readable one.

**Alternatives:** Per-component `toLocaleDateString` calls, which is how the
time-zone bug reaches production one component at a time. `Intl.RelativeTimeFormat`
("3 days ago"), rejected: statically generated pages would age in place.

**Consequences:** Changing the site's date style is a one-line change. The
locale is not negotiated with the reader's browser, which is the point — these
pages are static HTML, and there is no request to negotiate with.

---

## 2026-09-11 — Listing and article share one metadata component

**Context:** Spec §9.1 and §9.2 ask for the same five fields — title,
description, publication date, updated date, tags — in two places. Written
twice, they drift.

**Decision:** `components/blog/PostMeta.tsx` renders the dates and tags for both,
and `components/blog/TagList.tsx` renders tags as plain labels rather than links,
because Phase 1 has no tag pages (spec §35). `components/blog/PostCard.tsx` is the
listing entry and takes `Pick<BlogPost, "slug" | "metadata">`, so a listing cannot
accidentally reach for an MDX body it is not going to render.

The `DRAFT` badge lives in `components/content/DraftBadge.tsx`, not under
`components/blog/`: the learn routes need the same badge in phase 8. Its label is
written in mixed case and uppercased with CSS so a screen reader announces
"Draft" instead of spelling it.

**Alternatives:** One `PostHeader` for both, rejected — the listing needs an
`h2` inside a link and the article needs an `h1`; the shared part is the metadata
row, and that is what is shared.

**Consequences:** `updatedAt` is shown whenever the frontmatter carries one, even
when it equals `publishedAt`, which is what the development plan asks for
("updated date when present"). Suppressing the duplicate would be a content
judgement, and the author can make it by removing the field.

---

## 2026-09-11 — A visible draft page is `noindex`, and canonical URLs wait for phase 16

**Context:** Drafts are reachable on preview deployments (spec §16, §33). A
preview URL is crawlable if anything links to it.

**Decision:** `generateMetadata` on `/blog/[slug]` emits
`robots: { index: false, follow: false }` for a draft. Everything else it emits
is per-page: title, description, and Open Graph `article` metadata with the
publication and modification dates. `metadataBase`, canonical URLs, the sitemap
and the feed are deliberately absent — they all depend on `NEXT_PUBLIC_SITE_URL`
and are phase 16's single concern (spec §25).

**Consequences:** Phase 16 adds `alternates.canonical` to this route rather than
restructuring its metadata.

---

## 2026-09-11 — `verify.mjs` derives its blog assertions from content, and reads frontmatter itself

**Context:** Spec §54.1 wants *every* published post to return 200 and a known
draft slug to 404. A hand-written list of slugs is wrong the moment the author
renames a sample post.

**Decision:** The script lists `content/blog/`, derives each slug from its
filename and reads only the `draft` flag, with `gray-matter`. It then asserts
200 for every published post, 404 for every draft, 404 for an unknown slug, and
that the `/blog` body mentions no draft URL. It refuses to run — rather than
passing vacuously — if the content tree has no published post or no draft.

Both the build and the server run with `SHOW_DRAFTS=false`, so `pnpm verify`
measures production draft behaviour whatever the ambient environment says.

**Alternatives:** Importing `getAllBlogPosts` from `lib/content/blog.ts`.
Rejected twice over. This script is the independent oracle: asking the code
under test which slugs *ought* to 404 lets one bug conceal another. And Node's
native type stripping cannot resolve that module's extensionless relative
imports (`./env`), so a plain `.mjs` script cannot load it at all —
`validate-content.mjs` gets away with importing `schemas.ts` and `validate.ts`
only because neither has a relative import. A future script that needs a `lib`
module with relative imports has to add explicit `.ts` extensions there first.

**Consequences:** Adding a post extends the check for free. Next logs
`Internal: NoFallbackError` when it refuses an unknown dynamic param — noise on
the server's stderr, not a failure: the response is a 404 carrying the custom
`app/not-found.tsx` page, which was checked by hand.

---

## 2026-09-11 — The phase 3 pipeline check is deleted, as planned

**Context:** The 2026-09-10 decision above scheduled `content/_pipeline-check.mdx`,
`app/mdx-pipeline-check/page.tsx` and their `verify.mjs` assertion for deletion
once a real post rendered through `renderMdx`.

**Decision:** Done in this phase. `/blog/[slug]` now renders the pipeline on
real content, and `tests/mdx.test.tsx` keeps the regression protection with its
own inline sources.

**Consequences:** `validate-content.mjs` no longer has a live example of an
underscored file to point at; its comment now states the convention instead.

---

## 2026-09-11 — Path conventions are shared by both content trees

**Context:** `lib/content/blog.ts` had grown three private helpers — what
counts as a content file, how a file is named in an error, and which URL
segments are safe to rebuild a path from. `lib/content/learn.ts` needed all
three, with identical answers.

**Decision:** Extract them to `lib/content/paths.ts` (`MDX_EXTENSION`,
`isIgnoredEntry`, `isContentFile`, `idFromFilename`, `displayPath`,
`isReadableSegment`) and move `blog.ts` onto it.

**Alternatives:** Copying the three helpers into `learn.ts`, which is how two
trees start answering "is `_draft.mdx` content?" differently — and the
traversal guard is the one that must not drift, because both take their ids
from URL segments.

**Consequences:** One change updates both trees, and
`scripts/validate-content.mjs` keeps matching them because it walks by the same
convention. `blog.ts` changed in this phase without its behaviour changing;
`tests/blog.test.ts` passes untouched, which is the evidence.

---

## 2026-09-11 — `getAllLessons` is flat, ordered by topic rank then lesson order

**Context:** Lessons are grouped by topic, but the topic's position lives in
`topics.ts`, not in the content tree. A retrieval function could return a
grouped structure or a flat list.

**Decision:** Flat, sorted by `topicRank(topicId)`, then topic id, then `order`
ascending with lesson id as a tiebreak. Grouping is the Learn index's job, and
it groups from `learningTopics` — the only place topic titles exist anyway.

**Alternatives:** Returning `Array<{ topic, lessons }>`. The sitemap, the feed
and every count would flatten it straight back, and the shape would carry
presentation data into a module that otherwise knows nothing about titles.

**Consequences:** A topic directory with no `topics.ts` entry sorts last rather
than throwing — `validate:content` already fails the build on one, and a
listing that still renders during a rename is more useful in `pnpm dev` than a
crash.

---

## 2026-09-11 — `validate-content.mjs` takes the topics module as a second argument

**Context:** Topic parity — every `content/learn/<topic>/` has a `topics.ts`
entry and vice versa — is checked against the repository's real `topics.ts`.
Once that file existed, every test that hands the script a throwaway content
tree began failing: its trees have no learn directories, so both configured
topics reported "no directory".

**Decision:** `node scripts/validate-content.mjs <contentRoot> [topicsModule]`.
The second argument defaults to `lib/content/topics.ts`, and the tests write a
one-line topics module beside their temp tree.

**Alternatives:** Skipping parity whenever a custom content root is given —
which would leave the check untested end-to-end, exactly where the plan asks
for a `validate:content` test. Or mirroring the real topic ids in every test
tree, which reintroduces the coupling the content-root parameter removed.

**Consequences:** Parity is now exercised in both directions by
`tests/validate-content.test.ts`. `pnpm validate:content` is unchanged.

---

## 2026-09-11 — The sample draft lesson is the last of its topic, not the middle

**Context:** Spec §37 asks for at least one draft lesson, and §13 asks that
adjacency skip a draft rather than link to a page that 404s. The obvious
demonstration would be a draft in the middle of Neural Networks.

**Decision:** `neural-networks/backpropagation.mdx` (order 40) is the draft.
The mid-topic case — previous/next stepping over a hidden lesson — is covered
by `tests/learn.test.ts` against a throwaway tree instead.

**Alternatives:** Drafting `activation-functions` or `gradient-descent`. Those
two host the Activation Function Explorer and the Gradient Descent Demo
(spec §37), so drafting either would hide an interactive component from
production the moment phases 11 and 12 land — a sample that breaks the thing it
is meant to demonstrate.

**Consequences:** The sample tree exercises draft filtering and end-of-topic
adjacency; the skip-a-draft path is proved by tests, which is where it stays
proved after the author replaces this content.

---

## 2026-09-11 — Sample lessons carry no demo components yet

**Context:** Spec §37 places the Activation Function Explorer in
`activation-functions.mdx` and the Gradient Descent Demo in
`gradient-descent.mdx`. Neither component exists: they arrive in phases 11 and
12, and the MDX registry that would resolve their names arrives in phase 10.

**Decision:** The two lessons carry prose, mathematics and code only, each
saying in its placeholder callout that the demonstration arrives later. The
tags are added by the phase that adds the component.

**Alternatives:** Writing `<GradientDescentDemo />` now, which would fail to
render for three phases — MDX resolves an unknown component to nothing useful
and the lesson page would be visibly broken meanwhile.

**Consequences:** Phases 11 and 12 each edit one lesson file as part of their
own work. Nothing in the tree references a component that does not exist.

---

## 2026-09-13 — Learn's presentational components live in `components/lesson/`

**Context:** The blog's listing components sit in `components/blog/`, so the
obvious home for a lesson card is `components/learn/`. Spec §6 reserves that
directory for the interactive demonstrations — `neural-networks/`,
`transformers/`, `shared/` — and CLAUDE.md records the same split: everything
under `components/learn/` is a client component, lazily loaded.

**Decision:** Server-rendered Learn UI — `LessonCard`, `LessonList`,
`LessonMeta`, `PrerequisiteList` — goes in `components/lesson/`.
`components/learn/` stays empty until phase 11 puts the first demo in it.

**Alternatives:** `components/learn/shared/`, which would put server components
inside the directory whose whole contents are otherwise `"use client"`, and
make the "everything here is a demo" rule something a reader has to check file
by file. Or `components/content/`, which holds the pieces both sections share
(`DraftBadge`, `PlaceholderNote`) and would stop meaning that.

**Consequences:** A directory name answers "is this shipped to the browser?".
Phase 11 adds `components/learn/` with no reshuffling of this phase's work.

---

## 2026-09-13 — A topic with nothing published in it has no page

**Context:** `topics.ts` declares a topic and the directory supplies its
lessons, so a topic can legitimately exist with every lesson still a draft —
during authoring, that is the normal state of a new topic. `/learn` and
`/learn/[topic]` both have to decide what to show for it in production.

**Decision:** Such a topic is left off the Learn index, `generateStaticParams`
does not generate it, and `/learn/<topic>` calls `notFound()`. Topic routes are
derived from the visible lessons, not from `topics.ts`.

**Alternatives:** Rendering the heading with an empty list, or a topic page
reading "no lessons yet" — a published page that announces the author's
unfinished work, and an entry in phase 16's sitemap with nothing on it. Neither
is what a visitor should meet in production; in development and on previews the
drafts are visible, so the topic appears there as normal.

**Consequences:** A topic becomes reachable the moment its first lesson is
published, with no separate switch to remember. `pnpm verify` asserts the 404
for any topic in the tree with nothing published in it.

---

## 2026-09-13 — Prerequisites resolve in the content layer, and unresolved ones are not linked

**Context:** Spec §12 asks that a lesson page render prerequisites as links
"using the target lesson's own title", so the `<topic-id>/<lesson-id>` paths in
frontmatter have to be resolved against the tree before anything is rendered.
`validate:content` guarantees they resolve to published lessons — but only in
the tree it validated, and a prerequisite whose target is a draft resolves to
nothing while drafts are hidden.

**Decision:** `getPrerequisites` in `lib/content/learn.ts` returns
`{ topicId, lessonId, title }`, with `title: null` for anything it cannot
resolve. The page renders a resolved prerequisite as a link and an unresolved
one as its plain path.

**Alternatives:** Resolving in the page, which would put content lookup in a
route; or linking unconditionally, which would produce a link to a 404 on a
development server the moment an author drafts a lesson another one depends on.

**Consequences:** Titles cannot drift from the lessons they name. The
unresolved case is a development-time signal rather than a broken published
page, and phase 9's navigation reuses the same resolver shape.

---

## 2026-09-13 — Lesson navigation lives in `components/navigation/`

**Context:** Phase 9 adds two navigation surfaces to a lesson page: the
previous/next pager, which is server-rendered, and the topic lesson list, which
needs a disclosure button below the sidebar breakpoint and is therefore a Client
Component. Phase 8 decided that `components/lesson/` is the server-rendered
Learn UI and that a directory name should answer "is this shipped to the
browser?".

**Decision:** Both go in `components/navigation/`, beside `MainNav`, `MobileNav`
and `NavLink`: `LessonPager.tsx` and `TopicLessonNav.tsx`. That directory
already holds navigation of both kinds, and its promise is about what a
component is for rather than where it runs.

**Alternatives:** Putting them in `components/lesson/`, which would place the
first `"use client"` file in the directory phase 8 declared server-rendered, and
leave a reader checking file by file. Or splitting them across both directories
by rendering mode, which would separate two halves of one feature.

**Consequences:** `components/lesson/` stays server-only and `components/learn/`
stays empty until the first demo. Navigation generated from content sits next to
navigation generated from `nav-links.ts`, and the two disclosures — site menu and
lesson list — are visibly the same pattern.

---

## 2026-09-13 — One lesson list, with the breakpoint in CSS and the state in React

**Context:** Spec §23 wants a topic-level lesson list as a sidebar on a wide
screen and "the simplest accessible implementation" — a collapsible menu,
dropdown or drawer — on a narrow one. The server cannot know the viewport, so
the shape cannot be chosen during rendering.

**Decision:** `TopicLessonNav` renders one nav for both. The toggle button is
`lg:hidden` and the panel is `hidden lg:flex`, so above the breakpoint the list
is always open and the button does not exist; below it, React's `isOpen` swaps
`hidden` for `flex`. The current lesson carries `aria-current="page"`, and the
link back to the topic overview sits above the toggle, visible in both shapes.

**Alternatives:** Rendering the sidebar and the mobile menu as two elements, one
hidden at each breakpoint, which duplicates every lesson title in the DOM and
puts two navigation landmarks in the accessibility tree. Or reading the viewport
with `matchMedia`, which makes the first paint a guess. Or `<details>`, which
cannot be forced open on a wide screen without JavaScript anyway.

**Consequences:** The collapsed panel is hidden by `display: none` from a
utility class rather than by the `hidden` attribute — its links leave the tab
order and the accessibility tree exactly the same way, but jsdom applies no
stylesheet, so `tests/lesson-navigation.test.tsx` asserts the contract the
breakpoint hangs on (`aria-expanded`, `aria-controls`, the display class and the
keyboard) rather than querying whether a link is reachable. The real
small-screen behaviour is a phase 18 human checkpoint.

---

## 2026-09-13 — `pnpm verify` derives adjacency itself rather than importing it

**Context:** "Adjacency is automatic and correct at topic boundaries" is a
completion criterion for phase 9, and the interesting case — a topic whose last
published lesson is followed by a draft — only exists in a production build,
where `pnpm test` cannot see it.

**Decision:** `scripts/verify.mjs` now reads `order` from frontmatter, sorts each
topic's published lessons itself, and asserts that every lesson page links its
topic and its neighbours, with `rel="prev"` and `rel="next"` absent at the two
ends of a topic. Assertions gained a `bodyIncludes` counterpart to
`bodyExcludes` for it.

**Alternatives:** Importing `getAdjacentLessons` into the script, which would
check the renderer against the code that fed it and let one bug hide another —
the reason the script already reads frontmatter directly rather than through
`lib/content/`.

**Consequences:** A pager that wrapped around, pointed at a draft or lost a
neighbour fails the gate on the real HTML. The script now carries a second copy
of the ordering rule (spec §13); a change to that rule has to be made in both
places, which is the price of an independent oracle.

---

## 2026-09-13 — The prose registry overrides three tags: `a`, `img` and `table`

**Context:** Phase 10's brief names `Callout`, `Figure`, `Equation`,
`ExternalLink` and overrides for `a` and `img`. A third override was already
owed: the `.prose table` rules written in phase 3 record that the scrollable
wrapper "belongs to the `table` override in the prose registry (phase 10)",
because a table wide enough to overflow the reading column had nowhere to
scroll.

**Decision:** `proseComponents` overrides `a`, `img` and `table`, and nothing
else. `MdxTable` renders the `<table>` unchanged inside a
`<div role="region" aria-label="Table" tabIndex={0} class="overflow-x-auto">`.
Every other tag markdown emits — headings, lists, code, blockquotes — is styled
by `.prose` in `app/globals.css` and needs no component.

**Alternatives:** `display: block` on the table itself, which scrolls but costs
the table role in some screen readers. Or leaving wide tables to squeeze their
cells, which is what phase 3 deferred.

**Consequences:** A wide table scrolls with the keyboard as well as a pointer.
The cost is a tab stop on a table narrow enough not to need one: whether a box
overflows is knowable only at layout time, and removing the `tabIndex` when it
does not would take client-side JavaScript on a page that otherwise ships none.
A caption would name the region better than the literal "Table"; GFM tables have
none to offer.

---

## 2026-09-13 — External links open in the same tab

**Context:** `ExternalLink` is the registry's component for a link that leaves
the site, and `MdxLink` routes every `https://` markdown link to it. Whether such
a link opens in a new tab is a choice the specification does not make.

**Decision:** the same tab. `rel="noopener noreferrer"` is set regardless, and a
decorative `↗`, `aria-hidden`, marks the link visually. `MdxLink` sends `/…` to
`next/link`, `http(s)` to `ExternalLink`, and leaves a fragment, a relative path
or a `mailto:`/`tel:` scheme as a plain anchor.

**Alternatives:** `target="_blank"` with a visually hidden "opens in a new tab",
which is the common pattern but takes a decision that belongs to the reader;
WCAG 2.2 §3.2.5 treats an unrequested new window as a change of context.

**Consequences:** Flipping it later is two lines in one file, and the `rel` is
already correct if anyone does. The arrow is `inline-block` so the link's
underline stops before it; a screen reader hears the link text only, and an
`↗` never appears on an email address.

---

## 2026-09-13 — `Figure` takes explicit dimensions; a markdown image is a plain `<img>`

**Context:** Spec §21 asks for `next/image` "where practical" and for image use
to sit behind a small `Figure` component, so that a static export would be a
one-file change. `next/image` needs an intrinsic width and height to reserve
space, and MDX files may not import the asset to have them inferred.

**Decision:** `Figure` requires `src`, `alt`, `width` and `height`, and is the
only place in the codebase that imports `next/image`. The `img` override renders
a plain `<img loading="lazy" decoding="async">`, because markdown's
`![alt](src)` carries no dimensions to give the optimizer.

**Alternatives:** `width={0} height={0} sizes="100vw"` on `next/image`, which is
a widely copied trick for unknown dimensions and reintroduces exactly the layout
shift the dimensions exist to prevent. Or defaulting the dimensions, which
silently distorts the first image whose aspect ratio differs.

**Consequences:** An author writes `<Figure src="…" alt="…" width={1200}
height={630} />` for an optimized, captioned image, and `![…](…)` for a quick
one. `Figure`'s `sizes` describes the reading column rather than the viewport, so
a wide screen does not fetch an image wider than the prose. No sample content
uses it yet: the first editorial image is the first real exercise.

---

## 2026-09-13 — `Callout` has two variants and refuses a third

**Context:** Spec §3.1 requires a visible placeholder callout at the top of every
scaffolding file, written as `<Callout variant="warning">`. MDX is not
type-checked, so the variant arrives as whatever the author typed.

**Decision:** Two variants, `note` (the site accent) and `warning` (a
`--color-warning` / `--color-warning-soft` pair added to `@theme`), each with a
visible text label so the meaning does not depend on colour. An unknown variant
throws an error naming the mistake and the alternatives. A `title` prop replaces
the label, which is how the placeholder notices say "Placeholder content".

**Alternatives:** A longer set — tip, caution, danger — invented before any
content asks for one. Or falling back to `note` on an unknown variant, which
would let `variant="warnign"` ship a warning styled as an aside.

**Consequences:** The scaffolding placeholders are now `Callout`s rather than
blockquotes, which is what spec §3.1 describes, and `tests/blog.test.ts` and
`tests/learn.test.ts` assert that opening line. A typo in a variant fails the
build. Adding a third variant is one entry in one map.

---

## 2026-09-13 — The demo registry ships empty, and every entry must be lazy

**Context:** Phase 10 wires `components/learn/registry.ts` into the lesson
route, but the two demos it will hold are phases 11 and 12. An MDX file naming a
component that does not exist fails the build, and a placeholder demo would be
agent-written scaffolding in component form (spec §3.1).

**Decision:** `demoComponents` is exported empty, with the exact
`dynamic(() => import(…))` form the next phases must use documented above it.
`tests/mdx-registry.test.tsx` asserts that no demo name collides with a prose
component, and reads the registry source to require `dynamic(` beside every key
that is present — the rule holds vacuously today and bites the moment phase 11
adds an eager import.

**Alternatives:** A stub demo to make the lazy path observable now, which is
content the author did not write. Or asserting laziness by inspecting the
exported value, which cannot distinguish a `next/dynamic` component from an
ordinary one.

**Consequences:** Lesson pages render with `{ ...proseComponents,
...demoComponents }`, built once at module scope, demos second so a demo cannot
be shadowed. "Demo JavaScript loads only on the lessons that use a demo" is
structurally guaranteed but not yet observable in a build; the first real
measurement is phase 11. `ssr: false` is unavailable here in any case —
`next/dynamic` rejects it inside a Server Component.

---

## 2026-09-13 — `validate:content` enforces that MDX files import nothing

**Context:** "MDX files contain no imports" is a completion criterion of this
phase and an architecture invariant in `CLAUDE.md`, but nothing failed when one
appeared: `next-mdx-remote` strips `import` and `export` before compiling, so the
statement vanishes and the component it named is simply undefined.

**Decision:** `checkBody` in `lib/content/validate.ts` scans each content file
for an `import`/`export` at the start of a line, outside frontmatter and outside
code fences, and `scripts/validate-content.mjs` reports it beside the frontmatter
issues. Severity follows the rule of spec §18: a published file fails, a draft
warns.

**Alternatives:** Checking in `lib/content/blog.ts` and `learn.ts` as each file
is read, which would cost the check on every build of every page for a rule the
`prebuild` gate already catches once. Or trusting review, which is what let the
silent failure exist.

**Consequences:** The report names the line the author's editor shows, because
the check reads the whole file and skips the frontmatter rather than scanning
gray-matter's body. A Python snippet may still `import numpy as np`: fences and
indented code blocks are skipped. A statement hidden inside an unusual fence
style would be missed — the check is a line scanner, not an MDX parser.

---

## 2026-09-13 — Plotting primitives are a frame, a scale module and free-standing marks

**Context:** Phase 11 must build the activation explorer in SVG and "extract the
axis, grid and curve primitives so the next phase reuses them" — but a gradient
descent demo needs a *different* set of marks over the same axes, so the shape
of the seam decides whether phase 12 reuses or rewrites.

**Decision:** Three pieces under `components/learn/plot/`.
`scale.ts` is pure arithmetic — `linearScale`, `ticks`, `sample`, `toPathData`,
`formatNumber` — with no React in it. `Plot.tsx` draws the frame, grid, zero
axes and tick labels into a fixed `viewBox`, and hands its children the two
scales through a render prop rather than a context. `PlotMarks.tsx` holds the
marks: `PlotCurve`, `PlotPolyline`, `PlotPoint`, `PlotGuides`, each taking the
`scales` object explicitly.

**Alternatives:** A context provider, which would force a hook and a client
boundary into the frame itself. Or a single `<Plot data={…} />` that owns its
marks, which turns every new kind of mark into a change to the frame.

**Consequences:** `Plot` calls no hook and holds no state, so it renders on the
server and only the demo above it is a Client Component. A fixed `viewBox`
scaled by `w-full` means nothing is measured in the browser, but it also scales
the tick labels, so a caller caps the width — the explorer uses `max-w-md`,
which keeps labels between about 9 px and 15 px. Phase 12 adds no primitive it
does not already have except whatever it needs for animation.

---

## 2026-09-13 — A value that cannot be drawn breaks the line rather than the plot

**Context:** Phase 12 deliberately offers a learning rate large enough to
diverge, and must not produce `NaN` in a readout or a broken layout. A single
invalid number anywhere in an SVG `d` attribute makes the browser discard the
entire path, so the failure mode is not a wrong picture but no picture.

**Decision:** `toPathData` skips any point that does not project to two finite
numbers and restarts the subpath with `M` at the next usable one; the marks
first map anything outside the y domain to `NaN`, so leaving the frame and
diverging are the same case. `formatNumber` renders the non-finite values as
`undefined`, `∞` and `−∞` rather than letting `NaN` reach a readout.
`PlotPoint` and `PlotGuides` render nothing when their point is off the plot.

**Alternatives:** A `clipPath`, which needs an id — shared between two plots on
one page it is invalid markup, and generated per plot it forces a hook into a
component that otherwise needs none.

**Consequences:** A curve that exits the frame stops at its last in-range
sample rather than exactly at the edge; at the default 240 samples that gap is
sub-pixel. `tests/plot.test.ts` covers the divergence cases now, before phase 12
can produce them.

---

## 2026-09-13 — The demo writes its equation as text, not as typeset mathematics

**Context:** The explorer must show the selected function's equation. KaTeX
typesets the lesson's mathematics, but it runs in the MDX pipeline at build time
(spec §20) and is not shipped to the browser; a client component that typeset
its own equation would have to download the whole formula renderer to draw one
line, against spec §30.

**Decision:** Each entry in `components/learn/neural-networks/activations.ts`
carries its definition as a plain string — `sigmoid(z) = 1 / (1 + exp(−z))` —
rendered in the monospace face. `exp(-z)` is written out rather than
superscripted because it survives being read aloud. The sign is a true minus
(U+2212): it is the right character for mathematics, and unlike a hyphen a
browser will not break a line after it, which is what stops `exp(−z)` splitting
across two lines at 375 px.

**Alternatives:** MathML, which is verbose to hand-write and adds a rendering
path nothing else on the site uses. Or importing KaTeX into the client bundle.

**Consequences:** The equation in the demo does not look like the `$$ … $$`
block three paragraphs above it in the same lesson. That is a visible
inconsistency and a candidate for the design checkpoint; the alternative is
about 270 KB of client JavaScript per lesson that embeds a demo.

---

## 2026-09-13 — The demo is a labelled landmark, and its title is a paragraph

**Context:** The explorer needs an accessible name, and the obvious way to give
it one is a heading. But a demo is embedded in authored MDX at a heading level
it cannot know, and `.prose h2` in `app/globals.css` would style and space it as
a section title inside the demo's own card.

**Decision:** `<section aria-labelledby>` pointing at a paragraph. The demo
becomes a named `region`, which a screen-reader user can jump to — the opposite
of the phase 10 decision that a `Callout` is *not* a landmark, and for the same
reason: a lesson has one or two demos and may have six callouts.

**Consequences:** The demo does not appear in the page's heading outline; the
`##` the author writes above it does. Anything else the demo renders is
similarly subject to the `.prose` rules, since it is a child of `.prose` — the
current markup uses no element those rules target.

---

## 2026-09-13 — `dynamic()` in the demo registry does not split the lesson bundle

**Context:** Spec §15 prescribes wrapping every demo in `next/dynamic` so that
"its JavaScript loads only on the lessons that actually use it", and phase 10
made that a completion criterion it could not yet measure. Phase 11 is the first
build with a real demo in the registry, so it is the first measurement.

**Decision:** Keep the prescribed form. The specification wins over the
measurement, the structure is right, and the two causes of the shortfall are
both outside this repository.

**Discrepancy, measured:** the explorer's code reaches every lesson, not only
the one that embeds it. Both lessons load an identical set of eight chunks, and
rebuilding with a plain eager import in place of `dynamic()` produces the same
per-page chunk lists and 2.6 KB *less* client JavaScript overall. Two causes:

1. Next's own documentation states that "when a Server Component dynamically
   imports a Client Component, automatic code splitting is currently not
   supported". Every documented example of `dynamic()` producing a separate
   client bundle has its call site inside a `"use client"` file, which
   `components/learn/registry.ts` is not and cannot be.
2. Turbopack's production chunker merges small chunks by default
   (`minChunkSize` 50 000 bytes); the whole application's client code is about
   26 KB, so it would be merged into one chunk even if step 1 split it.

**What does hold:** the *registry split* works, which is the part spec §30 names
explicitly. A blog article loads no demo code at all — the lesson chunk carrying
the explorer appears on lesson pages and not on article pages.

**Consequences:** "Demo JavaScript loads only on the lessons that use a demo" is
not true today and should not be claimed. Revisiting it means either moving the
`dynamic()` call site into a Client Component wrapper — which changes the
architecture spec §15 fixes, and is not phase 11's to decide — or
`experimental.turbopackChunking.generateComponentChunks`, which is documented as
experimental and not recommended for production. Worth re-measuring when the
demos are large enough for the difference to matter.

---

## 2026-09-13 — A run stops itself: divergence is bounded, not computed to `NaN`

**Context:** Phase 12 requires a learning rate large enough to diverge, and
requires the readout not to show `NaN`. For `f(x) = x²` the step is
`x ← x(1 − 2η)`, so η > 1 grows without bound; iterate far enough and `x`
reaches `Infinity`, at which point the next step computes `∞ − ∞` and every
number on screen becomes `NaN`.

**Decision:** The run's status is derived from the path, in one place
(`statusOf` in `gradientDescent.ts`), and `extendPath` refuses to step a run
that is not `"stepping"`. A run ends as `converged` (|x| < 0.001), `diverged`
(|x| > 1000), or `exhausted` (80 steps). The demo reads the status during
render, so the buttons, the message and the arithmetic cannot disagree about
whether the run is over.

**Consequences:** The readout always holds a finite number; divergence is shown
by a figure in the millions and a marker that has left the plot, not by `∞`.
The bounds are also what makes "start" terminate: the slowest rate the slider
offers, η = 0.05, converges in about 73 steps, inside the budget.

---

## 2026-09-13 — Reduced motion replaces the animation rather than disabling the control

**Context:** The demo animates a run at one step every 220 ms. Spec §14.1 and
the phase both require that stepping work without animation, and that animation
respect `prefers-reduced-motion`.

**Decision:** `usePrefersReducedMotion` reads the media query through
`useSyncExternalStore` — the store *is* the query, so there is no copy in state
to fall out of step and a reader who changes the setting mid-page sees the demo
change with it. Under reduced motion the primary button becomes "Run to the
end" and applies the whole run in one state update; no timer is started. Step
and reset are unaffected.

**Consequences:** jsdom implements no media queries and therefore has no
`matchMedia` at all, so `tests/setup.ts` now stubs the "no preference" answer;
the reduced-motion test replaces the stub. The server snapshot is `false`,
which is the only honest default — server-rendered HTML cannot know the
preference, and a demo that animates nothing until asked is still fully
operable.

---

## 2026-09-13 — The live region is silent while a run is animating

**Context:** The demo's state readout is a live region (spec §14.1). Animating
eighty steps through a polite live region would announce eighty times.

**Decision:** The visible readout is `aria-hidden` — the sighted reader's copy,
the same pattern the sliders use for their values — and a visually hidden
`aria-live="polite"` paragraph carries the text. While the timer is running it
says only "Running."; when the run pauses, converges or diverges, the full
state is announced once.

**Consequences:** A screen-reader user hears where a run *ended*, not every
step of it, and manual stepping still announces each step. Two nodes carry the
same text when the demo is idle, which the tests assert stay equal — a demo
that told a screen reader something other than what it showed would be worse
than either alone.
