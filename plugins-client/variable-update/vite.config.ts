import { defineConfig } from "vite";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "setup-tests.ts",
    coverage: {
      provider: "istanbul",
      reporter: ["lcov", "text"],
    },
  },
});