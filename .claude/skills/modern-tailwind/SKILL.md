---
name: modern-tailwind
description: Build clean, scalable UIs with Tailwind CSS using modern utilities and variants
---

# Tailwind CSS Best Practices

## Core Principles

- Prefer utility classes over custom CSS for most styling
- Keep class lists readable by grouping: layout → spacing → typography → color → effects
- Use semantic HTML first; utilities should enhance, not replace structure

## Variants & State

- Use `hover`, `focus-visible`, `disabled`, `dark`, and `motion-safe` variants where appropriate
- Prefer `data-*` and `aria-*` variants for stateful styling tied to DOM semantics
- Use `group` and `peer` for parent/sibling state without extra JS

## Responsive & Container Queries

- Start with the base styles, then add responsive variants (`sm`, `md`, `lg`, ...)
- Use container query utilities when layout depends on parent size

## Theming & Customization

This project uses **Tailwind CSS 4**, which is configured in CSS, not JavaScript.

- There is **no `tailwind.config.ts`** — do not create one
- `app/globals.css` starts with `@import "tailwindcss";`
- Extend the theme in a `@theme { ... }` block in that file, defining design
  tokens as CSS custom properties, instead of ad-hoc custom classes
- The v3 directives `@tailwind base;` / `@tailwind components;` /
  `@tailwind utilities;` do not exist in v4 — do not emit them
- Use `@layer` for custom utilities/components when repetition is unavoidable
- Avoid `@apply` except for small, repeatable patterns

Example:

```css
@import "tailwindcss";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --color-ink: oklch(0.25 0.02 260);
  --spacing-prose: 68ch;
}
```

## Dark Mode

The site supports light and dark mode (application spec §19), via
`prefers-color-scheme` plus a `class="dark"` override on `<html>`.

- Define colour tokens once, in `@theme`, and override them under the dark
  selector — do not sprinkle `dark:` colour utilities on every element
- Reserve `dark:` variants for the cases where a token swap is not enough
- Every component must be checked in both themes, including code blocks and
  rendered equations

## Maintainability

- Extract reusable UI into components instead of repeating large class strings
- Keep class names deterministic; avoid dynamic string concatenation when possible
