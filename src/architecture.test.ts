import { describe, expect, it } from "vitest";

/*
 * Enforces the layer rules in CLAUDE.md without a linter: dependencies point inwards (ui → state → core), the
 * core is pure, and only src/state/ touches storage and the URL. Sources are read as text through Vite.
 */

type Sources = Record<string, string>;

const read = (files: Sources): [string, string][] => Object.entries(files).filter(([path]) => !path.endsWith(".test.ts"));

const core = read(import.meta.glob<string>("./core/**/*.ts", { query: "?raw", import: "default", eager: true }));
const state = read(import.meta.glob<string>("./state/**/*.ts", { query: "?raw", import: "default", eager: true }));
const ui = read(import.meta.glob<string>("./ui/**/*.ts", { query: "?raw", import: "default", eager: true }));

const everything = read(import.meta.glob<string>("./**/*.ts", { query: "?raw", import: "default", eager: true }));
const styles = Object.entries(import.meta.glob<string>("./styles/*.css", { query: "?raw", import: "default", eager: true }));
const page = Object.entries(import.meta.glob<string>("../index.html", { query: "?raw", import: "default", eager: true }));

/** The module paths a file imports, static or dynamic. */
function importsOf(source: string): string[] {
  return [...source.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)].map((match) => match[1] ?? "");
}

/** Source without comments, so a word in a comment doesn't count as code. */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function offenders(files: [string, string][], test: (source: string) => boolean): string[] {
  return files.filter(([, source]) => test(source)).map(([path]) => path);
}

describe("architecture", () => {
  it("finds the source files, so the rules below are not checked against nothing", () => {
    expect(core.length).toBeGreaterThan(5);
    expect(state.length).toBeGreaterThan(10);
    expect(ui.length).toBeGreaterThan(15);
  });

  it("keeps the core free of imports from state and ui", () => {
    expect(offenders(core, (s) => importsOf(s).some((path) => /\/(state|ui)\//.test(path) || /^\.\.\/(state|ui)/.test(path)))).toEqual([]);
  });

  it("keeps state free of imports from ui", () => {
    expect(offenders(state, (s) => importsOf(s).some((path) => /^\.\.\/ui/.test(path)))).toEqual([]);
  });

  it("keeps the core pure: no clock, randomness, DOM, storage or network", () => {
    const impure = /\bDate\.now\b|\bnew Date\b|\bMath\.random\b|\bwindow\b|\bdocument\b|\blocalStorage\b|\bfetch\(/;
    expect(offenders(core, (s) => impure.test(code(s)))).toEqual([]);
  });

  it("leaves storage and the URL to src/state/", () => {
    const io = /\blocalStorage\b|\bsessionStorage\b|\blocation\.|\bhistory\.(?:push|replace)State\b/;
    expect(offenders(ui, (s) => io.test(code(s)))).toEqual([]);
  });

  it("never sets innerHTML in the UI", () => {
    expect(offenders(ui, (s) => /\.innerHTML\s*=|insertAdjacentHTML/.test(code(s)))).toEqual([]);
  });

  it("keeps every request on this site: no network calls in the code, and nothing loaded from other hosts", () => {
    const network = /\bfetch\(|\bXMLHttpRequest\b|\bsendBeacon\b|\bWebSocket\b|\bEventSource\b|\bnew Image\(/;
    expect(offenders(everything, (s) => network.test(code(s)))).toEqual([]);

    // The site's own address is fine (the link preview needs it in full); the SVG namespace is a name, not a request.
    const external = /https?:\/\/(?!jbarte\.github\.io\/)/;
    expect(page).toHaveLength(1);
    expect([...page, ...styles].filter(([, source]) => external.test(source)).map(([path]) => path)).toEqual([]);
  });
});
