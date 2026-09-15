import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { FEED_PATH } from "@/lib/seo";
import { site, siteUrl } from "@/lib/site";

// KaTeX typesets the mathematics at build time; this is the stylesheet its
// output needs. Imported once, here, for the whole site (spec §20).
import "katex/dist/katex.min.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Site-wide metadata (spec §25). Every route then overrides what is its own
 * through `pageMetadata`, which replaces `alternates` and `openGraph` whole —
 * Next merges metadata shallowly, so a nested object set here is inherited
 * only by a page that sets none of its own.
 *
 * `metadataBase` is the reason a route can write `canonical: "/blog"` instead
 * of pasting the origin in: Next resolves every relative URL in metadata
 * against it (spec §25).
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: site.name,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  // The feed, for a page that declares no alternates of its own — the 404,
  // in practice. Every real page repeats it through `pageMetadata`.
  alternates: { types: { "application/rss+xml": FEED_PATH } },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans text-base">
        <a
          href="#main"
          className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:top-3 focus-visible:left-3 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-accent focus-visible:px-4 focus-visible:py-2 focus-visible:text-sm focus-visible:font-medium focus-visible:text-on-accent"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" tabIndex={-1} className="flex-1 py-12">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
