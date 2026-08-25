// vitest.config.mjs
// Unit-test configuration for pure logic (no DB / no network).
// Mirrors the `@` -> repo-root path alias used by Next.js/tsconfig.
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
  },
});
