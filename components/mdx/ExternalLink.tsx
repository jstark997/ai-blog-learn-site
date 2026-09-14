type ExternalLinkProps = React.ComponentPropsWithoutRef<"a"> & { href: string };

/**
 * A link that leaves the site.
 *
 * Two decisions, both recorded in `docs/decisions.md`:
 *
 * - it opens in the same tab. Forcing a new one overrides a choice that belongs
 *   to the reader, and WCAG 2.2 §3.2.5 treats an unrequested new window as a
 *   change of context;
 * - `rel="noopener noreferrer"` is set anyway, so the destination learns
 *   nothing about where the reader came from, and a future `target="_blank"`
 *   cannot reintroduce the `window.opener` hole by being added on its own.
 *
 * The arrow is decorative: it is `aria-hidden`, so a screen reader is not told
 * "up-right arrow" after every link text. `inline-block` keeps the underline of
 * the surrounding link from running through it.
 */
export function ExternalLink({ href, children, ...props }: ExternalLinkProps) {
  return (
    <a href={href} rel="noopener noreferrer" {...props}>
      {children}
      <span aria-hidden="true" className="ml-0.5 inline-block text-[0.85em] no-underline">
        ↗
      </span>
    </a>
  );
}
