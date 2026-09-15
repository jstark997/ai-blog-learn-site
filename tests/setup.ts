import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest runs without globals, so Testing Library cannot register its own
// automatic cleanup; without this, renders accumulate across tests in a file.
afterEach(cleanup);

// jsdom evaluates no CSS and implements no media queries, so `matchMedia` is
// simply absent — and a component that reads a user preference through it
// (`usePrefersReducedMotion`, used by the demos) throws on its first render.
// The stub answers what jsdom means: no preference expressed. A test that needs
// the other answer replaces it, as tests/gradient-descent-demo.test.tsx does.
if (typeof window !== "undefined" && window.matchMedia === undefined) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
