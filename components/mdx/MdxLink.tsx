import Link from "next/link";

import { ExternalLink } from "@/components/mdx/ExternalLink";

/** The destinations that leave this site through the browser: http and https. */
const isWebUrl = (href: string) => /^(?:https?:)?\/\//i.test(href);

/**
 * The `a` override (spec §15). Markdown writes `[text](href)`; where that href
 * points decides what is rendered:
 *
 * | href                  | element                                  |
 * |-----------------------|------------------------------------------|
 * | `/learn`              | `next/link`, so navigation stays client-side and the route is prefetched |
 * | `https://example.com` | `ExternalLink`                           |
 * | `#section`, `mailto:` | a plain anchor — a fragment needs no router, and an arrow on an email address would be a lie |
 *
 * An href is always present in practice; markdown cannot produce a link
 * without one. The default keeps the type honest rather than asserting it away.
 */
export function MdxLink({ href = "", children, ...props }: React.ComponentPropsWithoutRef<"a">) {
  if (href.startsWith("/")) {
    return (
      <Link href={href} {...props}>
        {children}
      </Link>
    );
  }

  if (isWebUrl(href)) {
    return (
      <ExternalLink href={href} {...props}>
        {children}
      </ExternalLink>
    );
  }

  return (
    <a href={href} {...props}>
      {children}
    </a>
  );
}
