import { act, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GradientDescentDemo } from "@/components/learn/neural-networks/GradientDescentDemo";

/**
 * `usePrefersReducedMotion`, through the demo that acts on it (spec §14.1).
 *
 * `tests/gradient-descent-demo.test.tsx` covers what the demo does once the
 * preference has been read — the run applied in one go rather than animated.
 * What is asserted here is the reading itself, and the two cases the hook was
 * written as a `useSyncExternalStore` for rather than as an effect copying a
 * media query into state: the server, which cannot know the preference, and a
 * reader who changes it while the page is open.
 *
 * The demo's start button is the observable. It reads "Start" where there is an
 * animation to start and "Run to the end" where there is not.
 */

/** A `MediaQueryList` that real listeners can be attached to and fired. */
function mediaQueryStub(initial: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const query = {
    matches: initial,
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener);
    },
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  };

  return {
    install(): void {
      vi.stubGlobal("matchMedia", () => query);
    },
    /** What the system does when the reader changes the setting. */
    change(matches: boolean): void {
      query.matches = matches;
      act(() => {
        for (const listener of listeners) listener({ matches } as MediaQueryListEvent);
      });
    },
    get listenerCount(): number {
      return listeners.size;
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the reduced-motion preference", () => {
  it("is read as unreduced on the server, which cannot know it", () => {
    const system = mediaQueryStub(true);
    system.install();

    // Even with the preference set, server-rendered HTML shows the animated
    // form: the honest default is the one that is still fully operable by its
    // buttons, and the client corrects it on hydration.
    const html = renderToStaticMarkup(<GradientDescentDemo />);

    expect(html).toMatch(/<button[^>]*>Start<\/button>/);
    expect(html).not.toContain("Run to the end");
  });

  it("follows the reader when they change the setting with the page open", () => {
    const system = mediaQueryStub(false);
    system.install();
    render(<GradientDescentDemo />);

    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();

    system.change(true);

    expect(screen.getByRole("button", { name: "Run to the end" })).toBeInTheDocument();

    system.change(false);

    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
  });

  it("stops listening when the demo goes away", () => {
    const system = mediaQueryStub(false);
    system.install();
    const { unmount } = render(<GradientDescentDemo />);

    expect(system.listenerCount).toBeGreaterThan(0);

    unmount();

    expect(system.listenerCount).toBe(0);
  });
});
