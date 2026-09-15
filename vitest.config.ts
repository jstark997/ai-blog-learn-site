import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Mirrors the "@/*" path alias in tsconfig.json.
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup.ts"],
    /**
     * `pnpm test:coverage`, and only there: coverage is a tool for finding the
     * code no test has an opinion about, not a gate. It is deliberately left
     * out of `pnpm test` and out of the validation gate — it measures which
     * lines ran, which an import alone can satisfy, so a threshold on it would
     * reward the wrong test. `/coverage/` is git-ignored.
     */
    coverage: {
      provider: "v8",
      // Application code only. `tests/` and the config files are not the
      // subject, and an uncovered line in `scripts/` is covered by running it.
      include: ["app/**", "components/**", "lib/**"],
      reporter: ["text", "html"],
    },
  },
});
