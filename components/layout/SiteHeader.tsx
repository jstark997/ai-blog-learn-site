import Link from "next/link";

import { MainNav } from "@/components/navigation/MainNav";
import { MobileNav } from "@/components/navigation/MobileNav";
import { site } from "@/lib/site";
import { Container } from "./Container";

/**
 * The global header (spec §22): the site name, then the primary navigation —
 * horizontal on desktop, collapsed into a disclosure on small screens.
 *
 * `relative` positions the mobile panel, which spans the full width of the
 * header rather than the width of its button.
 */
export function SiteHeader() {
  return (
    <header className="relative border-b border-rule bg-canvas">
      <Container className="flex items-center justify-between gap-4 py-3">
        <Link
          href="/"
          className="rounded-md text-base font-semibold tracking-tight text-ink transition-colors hover:text-accent"
        >
          {site.name}
        </Link>
        <MainNav className="hidden md:block" />
        <MobileNav className="md:hidden" />
      </Container>
    </header>
  );
}
