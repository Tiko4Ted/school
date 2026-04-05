import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup/session-mock.ts"],
    globalSetup: "tests/setup/global-setup.ts",
    testTimeout: 120000,
    hookTimeout: 120000,
    threads: false,
  },
  resolve: {
    alias: {
      "@": resolve(rootDir, "."),
    },
  },
});
