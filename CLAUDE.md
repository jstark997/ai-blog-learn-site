# ai-blog-learn-site — rules for coding agents

A single-author website with two parts: **Blog** (essays about AI) and
**Learn** (structured lessons with interactive React demonstrations).
Next.js + MDX. Git is the CMS. No database, no backend, no auth in Phase 1.

Read this file first, every session. It is the standing contract; the
specification carries the detail.

## Documents

| File | Role |
|---|---|
| `docs/application-spec.md` | authoritative requirements — **do not edit** |
| `docs/development-plan.md` | authoritative phase order — **do not edit** |
| `docs/decisions.md` | decision log — **append to this whenever you choose something** |

Read the specification sections relevant to your assigned phase, not the whole
document. If code and specification disagree, the specification wins; report
the discrepancy.

## Skills, agents and commands in this repository

`.claude/` carries project-local tooling. Claude Code loads it automatically;
this table is a map, not an instruction to read it all.

| Path | Use it when |
|---|---|
| `skills/conventional-commits` | writing any commit message — every phase ends in one |
| `skills/clean-typescript` | writing TypeScript; strict mode gates every phase |
| `skills/modern-accessible-html-jsx` | writing markup, especially demo controls and navigation |
| `skills/modern-best-practice-react-components` | writing React — read it before reaching for `useEffect` in a demo |
| `skills/modern-tailwind` | styling; carries this project's Tailwind 4 and dark-mode rules |
| `agents/DocsExplorer` | you need current docs for a pinned library rather than recalled ones |
| `commands/code-review` | `/code-review` reviews this branch's diff; `SCOPE=ALL` reviews everything |

`DocsExplorer` earns its keep here specifically: the pinned versions in spec
§4.7 are newer than most training data, and the mistakes that follow —
synchronous `params`, a `tailwind.config.ts`, Zod 3 error handling — are the
ones most likely to cost a phase.

## Non-negotiables

- **pnpm only.** Never `npm`, `yarn` or `bun`. One lockfile: `pnpm-lock.yaml`.
  Delete any other lockfile that appears.
- **Never run `pnpm dev` or a foreground `pnpm start`.** They block and will
  hang the session. To check that the app serves, use `pnpm verify`, or build,
  background the server, `curl`, and kill it.
- **`pnpm create next-app` must be run with explicit flags**, never
  interactively.
- **Do not edit the spec or the plan.** Append to `docs/decisions.md` instead.
- **Do not add** FastAPI, a database, authentication, an admin UI, a CMS, API
  routes for content, or abstractions for infrastructure that does not exist.
- **Do not publish agent-written editorial prose.** Sample content is
  scaffolding: mark it with a placeholder callout (spec §3.1). The author
  writes the real thing.
- **Work only on the assigned phase.** Supporting changes are fine when a
  dependency requires them; say so in the report.

## Check the installed versions before writing code

Read `package.json`. Do not write from memory. The two failure modes that
matter here:

- **Next.js 16** — `params` and `searchParams` are **Promises**. Await them in
  every page, layout and `generateMetadata`. Next 14-style synchronous access
  will not compile.
- **Tailwind CSS 4** — CSS-first config: `@import "tailwindcss"` and `@theme`
  in `app/globals.css`. There is **no `tailwind.config.ts`** — do not create
  one. The v3 `@tailwind base/components/utilities` directives do not exist.

Also: Zod 4 error shapes differ from Zod 3; React 19 makes `ref` an ordinary
prop, so no `forwardRef` in new code.

Pinned versions: spec §4.7.

## Architecture invariants

```text
content/           MDX, the source of truth for all editorial content
lib/content/       discovery, parsing, validation, ordering — no JSX
components/mdx/    prose components, server-rendered
components/learn/  interactive demos, client components, lazily loaded
app/               routes only; thin, no content logic
```

- Content is read from the filesystem at build time. No `/api/*` for content.
- Server Components by default. Client Components only for real interactivity.
- MDX carries prose; React carries interaction. Neither leaks into the other.

## Content model — the parts that are easy to get wrong

- **A lesson's topic is its directory name.** There is no `topic` field in
  frontmatter, and no `slug` field either. Both derive from the path.
  `content/learn/neural-networks/attention.mdx` → `/learn/neural-networks/attention`.
- **`lib/content/topics.ts`** maps topic id → title, order, description. It is
  presentation data only.
- **Dates use the `isoDate` Zod preprocessor**, never a bare `z.string()`.
  Unquoted YAML dates parse as JavaScript `Date` objects and would fail.
- **`order` is sparse** (10, 20, 30…) and unique within a topic.
- **Draft visibility is decided by one helper**, `showDrafts` in
  `lib/content/env.ts`. Never read `NODE_ENV` in a component. Drafts are
  visible in dev *and on preview deployments*, hidden in production.
- **A draft URL must 404 in production.** `dynamicParams = false` *and* a
  `notFound()` guard. Omitting a route from `generateStaticParams` is not
  enough.

## Validation gate — every phase ends here

```bash
pnpm lint
pnpm validate:content
pnpm test
pnpm build
pnpm verify        # phases touching routing, drafts or SEO
```

A phase is done when the gate passes, not when the code looks right.

## What you cannot verify yourself

Visual design, real responsive feel, screen-reader experience, editorial
correctness, and anything needing a GitHub or Vercel account. Report these as
awaiting a human checkpoint. Do not self-certify them.

## End every session with

Phase completed · files changed · dependencies added with resolved versions ·
decisions appended to `docs/decisions.md` · spec discrepancies · lint,
validate, test, build, verify status · known limitations · items awaiting a
human · next phase.
