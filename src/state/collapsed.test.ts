import { afterEach, describe, expect, it, vi } from "vitest";
import { loadCollapsed, readCollapsed, saveCollapsed, toggleCollapsed } from "./collapsed";

describe("readCollapsed", () => {
  it("reads a saved list and keeps only known parts, once each", () => {
    expect(readCollapsed('["compare"]')).toEqual(["compare"]);
    expect(readCollapsed('["plan","compare","chart","compare"]')).toEqual(["compare"]);
  });

  it("shows everything for nothing saved, broken text or something that is not a list", () => {
    expect(readCollapsed(null)).toEqual([]);
    expect(readCollapsed("{oops")).toEqual([]);
    expect(readCollapsed('{"compare":true}')).toEqual([]);
  });
});

describe("toggleCollapsed", () => {
  it("collapses an open part and opens a collapsed one", () => {
    expect(toggleCollapsed([], "compare")).toEqual(["compare"]);
    expect(toggleCollapsed(["compare"], "compare")).toEqual([]);
  });
});

describe("the saved choice", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("is saved under the app's key and read back, and removed when nothing is collapsed", () => {
    const data = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
      removeItem: (key: string) => void data.delete(key),
    });
    saveCollapsed(["compare"]);
    expect(data.get("advanced-savings-calculator:collapsed")).toBe('["compare"]');
    expect(loadCollapsed()).toEqual(["compare"]);
    saveCollapsed([]);
    expect(data.size).toBe(0);
  });

  it("does not throw when storage is blocked", () => {
    const blocked = (): never => {
      throw new DOMException("blocked", "SecurityError");
    };
    vi.stubGlobal("localStorage", { getItem: blocked, setItem: blocked, removeItem: blocked });
    expect(loadCollapsed()).toEqual([]);
    expect(() => saveCollapsed(["compare"])).not.toThrow();
  });
});
