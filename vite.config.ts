import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

/**
 * The Content-Security-Policy of the built page: everything comes from this site, nothing is loaded from anywhere
 * else, and no inline script runs. Inline style attributes are allowed because the page sets some from code (chart
 * positions, bar widths); stylesheets themselves must come from the site. GitHub Pages can't send headers, so it is a
 * meta tag, which can't carry `frame-ancestors`.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "style-src-attr 'unsafe-inline'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

/** Adds the policy to the built page only: Vite's dev server needs a websocket and inline scripts it would block. */
function contentSecurityPolicy(): Plugin {
  return {
    name: "content-security-policy",
    apply: "build",
    transformIndexHtml: () => [
      { tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: CONTENT_SECURITY_POLICY }, injectTo: "head-prepend" },
    ],
  };
}

export default defineConfig({
  // Served from https://<user>.github.io/advanced-savings-calculator/
  base: "/advanced-savings-calculator/",
  plugins: [contentSecurityPolicy()],
  test: {
    include: ["src/**/*.test.ts"],
  },
});
