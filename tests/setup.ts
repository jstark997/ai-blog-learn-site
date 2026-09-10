import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest runs without globals, so Testing Library cannot register its own
// automatic cleanup; without this, renders accumulate across tests in a file.
afterEach(cleanup);
