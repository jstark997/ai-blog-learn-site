import { cn } from "@/lib/utils/cn";

/**
 * Variants, and the one place their colours are chosen. Adding a third is an
 * entry here; nothing else changes.
 *
 * `note` reuses the site accent, `warning` the warning tokens added to
 * `@theme` for it. Both carry a visible label, so the meaning survives for a
 * reader who cannot see the colour (spec §28).
 */
const variants = {
  note: {
    label: "Note",
    container: "border-accent bg-accent-soft",
    labelColor: "text-accent",
  },
  warning: {
    label: "Warning",
    container: "border-warning bg-warning-soft",
    labelColor: "text-warning",
  },
} as const;

export type CalloutVariant = keyof typeof variants;

type CalloutProps = {
  children: React.ReactNode;
  variant?: CalloutVariant;
  /** Replaces the variant's default label, e.g. "Placeholder content". */
  title?: string;
  className?: string;
};

/**
 * An aside inside prose: a note, or the warning that spec §3.1 requires at the
 * top of every scaffolding file.
 *
 * Server-rendered, like everything in the prose registry (spec §15) — it holds
 * no state and ships no JavaScript.
 *
 * The element is an unnamed `<aside>`. Nested inside the `<article>` both
 * content routes render, an `<aside>` without an accessible name is a generic
 * container rather than a `complementary` landmark, which is what a callout
 * should be: a page with six of them should not offer six landmarks.
 */
export function Callout({ children, variant = "note", title, className }: CalloutProps) {
  // MDX is not type-checked, so `variant` arrives as whatever the author wrote.
  // A typo fails the build with a sentence naming the mistake, rather than
  // silently rendering a warning as a note — the placeholder notices spec §3.1
  // requires are warnings, and quietly downgrading one is worse than stopping.
  const chosen: (typeof variants)[CalloutVariant] | undefined = variants[variant];
  if (chosen === undefined) {
    throw new Error(
      `Callout: unknown variant "${variant}" — use ${Object.keys(variants).join(" or ")}`,
    );
  }

  const { label, container, labelColor } = chosen;

  return (
    <aside className={cn("rounded-lg border p-4", container, className)}>
      <p className={cn("font-mono text-xs font-semibold tracking-wide uppercase", labelColor)}>
        {title ?? label}
      </p>
      <div className="mt-2 flex flex-col gap-3 text-ink">{children}</div>
    </aside>
  );
}
