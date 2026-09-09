---
allowed-tools: Read(*), Grep(*), Glob(*), Bash(git diff *), Bash(git log *), Bash(git merge-base *), Bash(git status)
description: Review this branch's changes (default), or the whole codebase with SCOPE=ALL
---

ARGUMENTS: $ARGUMENTS

Arguments are a comma-separated list that may set SCOPE and MODE. Both are
optional and order does not matter, e.g. `BUGS`, `SCOPE=ALL`,
`SCOPE=ALL,BUGS,SECURITY`.

## Scope — default is the current branch's diff

**SCOPE=BRANCH (the default when SCOPE is not given).**

Review only what this branch changed. Establish the range first:

```bash
git merge-base HEAD main
git diff --stat $(git merge-base HEAD main)...HEAD
git diff $(git merge-base HEAD main)...HEAD
```

Read the full current contents of every changed file — a diff hides the
context a change breaks — plus any file that directly consumes what changed.
Do not review untouched parts of the codebase.

This is the default because this project is built one phase per branch
(`docs/development-plan.md` §28), so the interesting question at review time
is "is this phase correct and does it fit what already exists", not "re-read
all twenty-two phases of work".

**SCOPE=ALL.**

Review the entire codebase file by file. Use this deliberately — before a
deployment, at phase 22 final validation, or when hunting something systemic.
Do not rush it; understand the structure and architecture first.

## Mode

- `BUGS` — logic and correctness defects only
- `SECURITY` — security issues only
- `PERFORMANCE` — performance issues only
- `A11Y` — accessibility issues only
- Any combination, e.g. `BUGS,A11Y` — perform the combined review
- No mode, or an unrecognized one — perform a thorough general review

## What this project cares about

Weight the review toward the failure modes this codebase is actually prone to.
The authoritative rules are in `CLAUDE.md`, `docs/application-spec.md` and
`docs/decisions.md`; read the relevant sections rather than guessing.

- **Draft leaks.** Anything that could put `draft: true` content into a
  production index, sitemap, RSS feed, static param list, or a reachable URL.
  Check `dynamicParams = false` and the `notFound()` guard on both dynamic
  routes, and that nothing reads `NODE_ENV` instead of the `showDrafts` helper.
- **Version-correct APIs.** Next 16 `params`/`searchParams` are Promises and
  must be awaited. Tailwind 4 has no `tailwind.config.ts` and no `@tailwind`
  directives. React 19 needs no `forwardRef`. Zod 4 error shapes are not Zod 3.
- **Server/client boundary.** An article or lesson page that has become a
  Client Component, a `"use client"` that pulls prose rendering to the browser,
  or a demo that is not lazily loaded through `next/dynamic`.
- **Content-model drift.** A reintroduced `topic` or `slug` frontmatter field,
  a bare `z.string()` where the `isoDate` preprocessor belongs, route
  information duplicated outside the file path.
- **Accessibility of the demos.** Labelled controls, keyboard operation,
  visible focus, and a text alternative that conveys the state.
- **Type honesty.** `any`, unchecked assertions, or types hand-maintained
  alongside the Zod schemas instead of derived from them.

## Output

Produce a report grouped by severity — blocking, should-fix, and nitpick —
with a file path and line reference for each finding, a one-sentence statement
of the actual defect, and a concrete failure scenario for anything you call
blocking. Say plainly when you found nothing in a category rather than padding
the list.

Do not fix anything in this command. Report only.
