import { afterEach, describe, expect, it, vi } from "vitest";
import { clearShareHash, currentPageUrl, currentRoute, sharedPlanToken } from "./route";

function stubLocation(hash: string): { replaced: string[] } {
  const replaced: string[] = [];
  vi.stubGlobal("window", {
    location: { hash, href: `https://x.example/app/${hash}`, pathname: "/app/", search: "" },
    history: { replaceState: (_state: unknown, _title: string, url: string) => replaced.push(url) },
  });
  return { replaced };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("route", () => {
  it("knows the design-system page and the share link", () => {
    stubLocation("#design-system");
    expect(currentRoute()).toBe("design-system");
    expect(sharedPlanToken()).toBeNull();

    stubLocation("#plan=z.abc");
    expect(currentRoute()).toBe("app");
    expect(sharedPlanToken()).toBe("z.abc");
    expect(currentPageUrl()).toBe("https://x.example/app/#plan=z.abc");
  });

  it("clears the token from the address without adding to the history", () => {
    const { replaced } = stubLocation("#plan=z.abc");
    clearShareHash();
    expect(replaced).toEqual(["/app/"]);
  });

  it("falls back safely when there is no window (a sandboxed frame or a test)", () => {
    vi.stubGlobal("window", undefined);
    expect(currentRoute()).toBe("app");
    expect(sharedPlanToken()).toBeNull();
    expect(currentPageUrl()).toBe("");
    expect(() => clearShareHash()).not.toThrow();
  });
});
