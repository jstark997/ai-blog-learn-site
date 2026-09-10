"use client";

import { useId, useRef, useState } from "react";

import { cn } from "@/lib/utils/cn";
import { NavLink } from "./NavLink";
import { navItems } from "./nav-links";

/**
 * The collapsed navigation shown below the `md` breakpoint (spec §22).
 *
 * A plain disclosure: a button that owns the panel through `aria-controls` and
 * reports its state through `aria-expanded`. The panel is kept in the DOM and
 * hidden with the `hidden` attribute, so its links leave the tab order while it
 * is closed. Escape closes it and returns focus to the button; choosing a link
 * closes it, because a client-side navigation leaves the panel mounted.
 */
export function MobileNav({ className }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  function close() {
    setIsOpen(false);
  }

  return (
    <nav
      aria-label="Main"
      className={className}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !isOpen) return;
        close();
        buttonRef.current?.focus();
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
          "text-muted transition-colors hover:bg-accent-soft hover:text-accent",
        )}
      >
        <MenuIcon isOpen={isOpen} />
        Menu
      </button>

      <div
        id={panelId}
        hidden={!isOpen}
        className="absolute inset-x-0 top-full border-b border-rule bg-canvas shadow-sm"
      >
        <ul className="mx-auto flex max-w-wide flex-col gap-1 px-gutter py-3">
          {navItems.map((item) => (
            <li key={item.href}>
              <NavLink
                href={item.href}
                onClick={close}
                className={cn(
                  "block rounded-md px-3 py-2 text-base font-medium transition-colors",
                  "hover:bg-accent-soft hover:text-accent",
                )}
                activeClassName="bg-accent-soft text-accent"
                inactiveClassName="text-ink"
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

function MenuIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      className="size-5"
    >
      {isOpen ? (
        <path d="M6 6l12 12M18 6L6 18" />
      ) : (
        <path d="M4 7h16M4 12h16M4 17h16" />
      )}
    </svg>
  );
}
