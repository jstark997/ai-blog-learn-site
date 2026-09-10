import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MainNav } from "@/components/navigation/MainNav";
import { MobileNav } from "@/components/navigation/MobileNav";
import { isActivePath, navItems } from "@/components/navigation/nav-links";

const route = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));

afterEach(() => {
  route.pathname = "/";
});

describe("isActivePath", () => {
  it("matches the home route only exactly", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/blog", "/")).toBe(false);
  });

  it("matches a section and its descendants", () => {
    expect(isActivePath("/blog", "/blog")).toBe(true);
    expect(isActivePath("/blog/why-machines-learn", "/blog")).toBe(true);
    expect(isActivePath("/learn/neural-networks/attention", "/learn")).toBe(true);
  });

  it("does not match a section that merely shares a prefix", () => {
    expect(isActivePath("/blogroll", "/blog")).toBe(false);
  });
});

describe("MainNav", () => {
  it("renders every primary navigation item", () => {
    render(<MainNav />);
    for (const item of navItems) {
      expect(screen.getByRole("link", { name: item.label })).toHaveAttribute("href", item.href);
    }
  });

  it("marks the current section with aria-current", () => {
    route.pathname = "/learn/neural-networks/attention";
    render(<MainNav />);
    expect(screen.getByRole("link", { name: "Learn" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Blog" })).not.toHaveAttribute("aria-current");
  });
});

describe("MobileNav", () => {
  it("starts collapsed, with its links out of reach", () => {
    render(<MobileNav />);
    expect(screen.getByRole("button", { name: /menu/i })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Blog" })).not.toBeInTheDocument();
  });

  it("opens and closes from the keyboard", async () => {
    const user = userEvent.setup();
    render(<MobileNav />);
    const toggle = screen.getByRole("button", { name: /menu/i });

    await user.tab();
    expect(toggle).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Blog" })).toBeVisible();

    await user.keyboard("{Escape}");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveFocus();
  });

  it("closes when a link is chosen", async () => {
    const user = userEvent.setup();
    const { container } = render(<MobileNav />);
    // jsdom cannot navigate, and would log about it; the click still reaches
    // the link's own handler, which is what this test is about.
    container.addEventListener("click", (event) => event.preventDefault());
    const toggle = screen.getByRole("button", { name: /menu/i });

    await user.click(toggle);
    await user.click(screen.getByRole("link", { name: "About" }));

    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("controls the panel it owns", async () => {
    const user = userEvent.setup();
    render(<MobileNav />);
    const toggle = screen.getByRole("button", { name: /menu/i });
    const panelId = toggle.getAttribute("aria-controls") ?? "";

    expect(panelId).not.toBe("");
    expect(document.getElementById(panelId)).toHaveAttribute("hidden");

    await user.click(toggle);
    expect(document.getElementById(panelId)).not.toHaveAttribute("hidden");
  });
});
