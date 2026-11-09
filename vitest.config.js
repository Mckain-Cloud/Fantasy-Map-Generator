import {defineConfig} from "vitest/config";

/**
 * Fast, browser-free unit tests. Everything here runs in Node in a few seconds.
 * Browser-dependent behaviour is covered by Playwright (see playwright.config.js).
 */
export default defineConfig({
  test: {
    include: ["modules/ai/**/*.test.js", "tests/node/**/*.test.js"],
    environment: "node",
    reporters: process.env.CI ? ["default", "junit"] : ["default"],
    outputFile: {junit: "test-results/vitest-junit.xml"}
  }
});
