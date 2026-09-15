import { render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { navItems } from "@/components/navigation/nav-links";
import { site } from "@/lib/site";

/**
 * The frame every route renders inside (spec §22, §29), and the page shown when
 * there is no route.
 *
 * Nothing here checks how any of it looks — that is the human checkpoint in
 * phase 18. What is asserted is the structure a reader navigates by and that no
 * page can restore on its own: one `<main>`, a skip link that reaches it, the
 * site's landmarks, and a 404 that offers a way out.
 *
 * `next/font/google` is a compile-time transform in the Next toolchain and is
 * simply a function here, so it is stubbed; `usePathname` needs a router the
 * test has no reason to build.
 */
vi.mock("next/font/google", () => ({
  Geist: (options: { variable: string }) => ({ variable: options.variable, className: "sans" }),
  Geist_Mono: (options: { variable: string }) => ({ variable: options.variable, className: "mono" }),
}));

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

/**
 * The layout renders `<html>` and `<body>`, which cannot be mounted inside the
 * container Testing Library renders into, so it is rendered as a document and
 * parsed back — the same markup a reader's browser would receive.
 */
async function renderLayout(): Promise<Document> {
  const { default: RootLayout } = await import("@/app/layout");
  const markup = renderToStaticMarkup(
    <RootLayout params={Promise.resolve({})}>
      <p>Page content.</p>
    </RootLayout>,
  );

  return new DOMParser().parseFromString(markup, "text/html");
}

describe("the root layout", () => {
  it("declares the language of the document, which a screen reader picks a voice from", async () => {
    const document = await renderLayout();

    expect(document.documentElement.getAttribute("lang")).toBe("en");
  });

  it("puts the page in the one main landmark, between the header and the footer", async () => {
    const document = await renderLayout();
    const mains = document.querySelectorAll("main");

    expect(mains).toHaveLength(1);
    expect(mains[0].textContent).toContain("Page content.");
    expect(document.querySelectorAll("header")).toHaveLength(1);
    expect(document.querySelectorAll("footer")).toHaveLength(1);

    // Source order is what a keyboard and a screen reader follow.
    const landmarks = [...document.body.querySelectorAll("header, main, footer")];
    expect(landmarks.map((element) => element.tagName)).toEqual(["HEADER", "MAIN", "FOOTER"]);
  });

  it("opens with a skip link that reaches the main landmark, and can be focused", async () => {
    const document = await renderLayout();
    const skipLink = document.body.querySelector("a");
    const main = document.querySelector("main");

    expect(skipLink?.textContent).toBe("Skip to content");
    expect(skipLink?.getAttribute("href")).toBe(`#${main?.id}`);
    expect(main?.id).not.toBe("");
    // Without this, following the link moves the page but not the focus, and
    // the next Tab starts again from the top of the document.
    expect(main?.getAttribute("tabindex")).toBe("-1");
  });
});

describe("SiteHeader", () => {
  it("leads with the site name, linked home", () => {
    render(<SiteHeader />);

    const banner = screen.getByRole("banner");
    const home = within(banner).getByRole("link", { name: site.name });

    expect(home).toHaveAttribute("href", "/");
  });

  it("offers the primary navigation twice, so one of the two is always usable", () => {
    render(<SiteHeader />);

    // Wide screens get the horizontal list, narrow ones the disclosure. Both
    // are in the markup at every width; CSS chooses between them.
    const banner = screen.getByRole("banner");

    expect(within(banner).getByRole("button", { name: /menu/i })).toBeInTheDocument();

    for (const item of navItems) {
      expect(within(banner).getAllByRole("link", { name: item.label }).length).toBeGreaterThan(0);
    }
  });
});

describe("SiteFooter", () => {
  it("names the author, the year and what the site is", () => {
    render(<SiteFooter />);

    const footer = screen.getByRole("contentinfo");

    expect(footer).toHaveTextContent(String(new Date().getFullYear()));
    expect(footer).toHaveTextContent(site.author);
    expect(footer).toHaveTextContent(site.description);
  });
});

describe("the 404 page", () => {
  it("says what happened and offers a way back into the site", async () => {
    const { default: NotFound } = await import("@/app/not-found");
    render(<NotFound />);

    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeInTheDocument();

    // It is also where a draft URL lands in production, so the wording covers
    // both: gone, or not published yet.
    expect(screen.getByText(/not published yet/)).toBeInTheDocument();

    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual(expect.arrayContaining(["/", "/blog", "/learn"]));
  });
});
