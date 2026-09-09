---
name: conventional-commits
description: >
  Writes git commit messages that strictly follow the Conventional Commits
  specification. Use this skill whenever Claude Code is asked to commit
  changes, stage and commit files, or write a commit message for any reason.
  Triggers on phrases like "commit this", "commit these changes", "make a
  commit", "write a commit message", "stage and commit", or any request that
  results in running `git commit`. Always apply this skill before writing any
  commit message — never write a commit message from memory or intuition alone.
---

# Conventional Commits Skill

Always follow this skill when writing a git commit message.

---

## The Format

Every commit message has this structure:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

The **first line** (type + scope + description) is the **subject line**. It must be 72 characters or fewer.

---

## Types

Use exactly one of these types. Choose the most specific match:

| Type | When to use |
|---|---|
| `feat` | A new feature or capability visible to users |
| `fix` | A bug fix |
| `docs` | Documentation only (README, CLAUDE.md, comments, SPEC.md) |
| `style` | Code formatting, whitespace, missing semicolons — no logic change |
| `refactor` | Code restructuring with no feature addition or bug fix |
| `test` | Adding or updating tests — no production code change |
| `chore` | Tooling, config, dependencies, build scripts, project setup |
| `perf` | A change that improves performance |
| `ci` | CI/CD configuration changes |
| `revert` | Reverts a previous commit |

**When in doubt between `feat` and `refactor`:** if a user can observe the change, use `feat`. If it's purely internal restructuring, use `refactor`.

**When in doubt between `fix` and `refactor`:** if the code was broken and is now correct, use `fix`. If it worked before and still works — just differently — use `refactor`.

---

## Scope

The scope is **optional but strongly recommended**. It names the part of the codebase the commit affects, written in kebab-case and wrapped in parentheses.

Good scopes for this project:

| Scope | Covers |
|---|---|
| `auth` | Authentication pages, AuthContext, route guards |
| `api` | `src/api/` — client, auth, users, whitelist modules |
| `ui` | Primitive UI components (`src/components/ui/`) |
| `layout` | Layout components (`src/components/layout/`) |
| `profile` | User profile pages |
| `admin` | Admin pages (users, whitelist) |
| `routes` | Route definitions and guards |
| `types` | TypeScript type definitions |
| `config` | Vite, Tailwind, TypeScript, Vitest configuration |
| `deps` | Dependency additions, removals, or upgrades |
| `tests` | Test files or test utilities |

Omit the scope only when the change genuinely spans the entire codebase and no single scope fits.

---

## Description

The description is a **short imperative summary** of the change — written as a command, not a past-tense observation.

```
# Correct — imperative mood
feat(auth): add password visibility toggle to login form

# Wrong — past tense
feat(auth): added password visibility toggle to login form

# Wrong — present continuous
feat(auth): adding password visibility toggle to login form
```

Rules:
- Lowercase first letter (the type prefix is already capitalized by convention)
- No period at the end
- 72 character limit on the full subject line
- Be specific: "add PasswordInput component with show/hide toggle" is better than "update input component"

---

## Body (optional)

Include a body when the **why** or **what** is not obvious from the subject line alone. Separate it from the subject with a blank line. Wrap lines at 72 characters.

Use the body to explain:
- Why the change was made
- What problem it solves
- Any non-obvious consequences or trade-offs

```
fix(api): dispatch auth:expired event instead of importing AuthContext

Importing AuthContext directly from client.ts created a circular
dependency. Using a window event decouples the two modules while
preserving the session expiry behaviour.
```

Do not use the body to list every file changed — the diff does that.

---

## Footer (optional)

Use footers for two purposes:

**Breaking changes:**
```
feat(auth): replace cookie strategy with token-based auth

BREAKING CHANGE: Session cookies are no longer used. Consumers must
update their backend to issue JWT tokens instead.
```

**Issue references:**
```
fix(admin): prevent admin from deactivating their own account

Closes #42
```

---

## Breaking Changes

A breaking change must be indicated in **both** places:
1. Add `!` after the type/scope: `feat(auth)!:`
2. Add a `BREAKING CHANGE:` footer with a full explanation

```
feat(auth)!: replace session cookies with JWT tokens

BREAKING CHANGE: The application now uses Authorization header bearer
tokens instead of HTTP-only cookies. Update the backend to issue JWTs
and remove the SameSite cookie configuration.
```

---

## Multi-file Commits

When a commit touches multiple files across different concerns, choose the type and scope that best represents the **primary intent** of the commit — not an exhaustive list of everything changed.

If the changes are genuinely unrelated, they should be in separate commits. Ask the user before bundling unrelated changes into a single commit.

---

## Examples

```bash
# New feature
feat(auth): add email verification page

# Bug fix with body
fix(api): handle 429 response with toast notification

Previously, rate limit responses caused an unhandled promise rejection.
Now they surface a user-friendly toast and resolve gracefully.

# Chore — project setup
chore: scaffold react-starter with Vite, Tailwind, React Router, and Vitest

# Documentation
docs: add CLAUDE.md with project conventions and coding rules

# Tests only
test(auth): add unit tests for login form validation schemas

# Refactor with scope
refactor(ui): extract ConfirmDialog from Dialog component

# Dependency update
chore(deps): add sonner for toast notifications

# Config change
chore(config): add @/ path alias to vite and tsconfig

# Breaking change
feat(auth)!: remove remember-me cookie support

BREAKING CHANGE: The remember_me field is no longer accepted by the
login endpoint. Sessions now use a fixed 24-hour expiry.
```

---

## Before Committing

Before running `git commit`, verify:

1. The type accurately reflects the nature of the change.
2. The scope identifies the affected area of the codebase.
3. The description is in imperative mood and under 72 characters total (including type and scope).
4. If the change is not self-explanatory, a body is included.
5. Breaking changes are flagged with `!` and a `BREAKING CHANGE:` footer.
6. Unrelated changes are not bundled into one commit.
