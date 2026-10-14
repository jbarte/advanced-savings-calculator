import { defineConfig } from "vitest/config";

export default defineConfig({
  // Served from https://<user>.github.io/advanced-savings-calculator/
  base: "/advanced-savings-calculator/",
  test: {
    include: ["src/**/*.test.ts"],
  },
});
