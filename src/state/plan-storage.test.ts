import { describe, expect, it } from "vitest";
import { createBlankPlan, createExamplePlan } from "./plan-document";
import { PLAN_STORAGE_KEY, clearSavedPlan, loadSavedPlan, savePlan } from "./plan-storage";
import type { StorageLike } from "./plan-storage";
import { serializePlan } from "./read-plan";

function fakeStorage(initial: Record<string, string> = {}): StorageLike & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

const blocked: StorageLike = {
  getItem: () => {
    throw new DOMException("blocked", "SecurityError");
  },
  setItem: () => {
    throw new DOMException("full", "QuotaExceededError");
  },
  removeItem: () => {
    throw new DOMException("blocked", "SecurityError");
  },
};

const plan = createExamplePlan({ year: 2026, month: 1 });

describe("loadSavedPlan", () => {
  it("finds nothing in empty storage", () => {
    expect(loadSavedPlan(fakeStorage())).toEqual({ kind: "none" });
  });

  it("loads a plan that was saved", () => {
    const storage = fakeStorage();
    expect(savePlan(plan, storage)).toBe(true);
    expect(loadSavedPlan(storage)).toEqual({ kind: "loaded", plan });
  });

  it("reports why a saved plan is unusable, and leaves it in place", () => {
    const storage = fakeStorage({ [PLAN_STORAGE_KEY]: serializePlan({ ...plan, startAmount: -5 }) });
    const result = loadSavedPlan(storage);
    expect(result.kind).toBe("invalid");
    expect(result.kind === "invalid" && result.reason).toMatch(/start amount/i);
    expect(storage.data.has(PLAN_STORAGE_KEY)).toBe(true);
  });

  it("reports text that is not JSON as invalid", () => {
    expect(loadSavedPlan(fakeStorage({ [PLAN_STORAGE_KEY]: "{oops" })).kind).toBe("invalid");
  });

  it("reports blocked storage, and a missing storage object, as unavailable", () => {
    expect(loadSavedPlan(blocked)).toEqual({ kind: "unavailable" });
    expect(loadSavedPlan(null)).toEqual({ kind: "unavailable" });
  });
});

describe("savePlan and clearSavedPlan", () => {
  it("returns false instead of throwing when storage refuses", () => {
    expect(savePlan(plan, blocked)).toBe(false);
    expect(savePlan(plan, null)).toBe(false);
    expect(clearSavedPlan(blocked)).toBe(false);
  });

  it("overwrites an earlier save", () => {
    const storage = fakeStorage();
    savePlan(plan, storage);
    savePlan(createBlankPlan({ year: 2027, month: 2 }), storage);
    expect(loadSavedPlan(storage)).toEqual({ kind: "loaded", plan: createBlankPlan({ year: 2027, month: 2 }) });
  });

  it("clears the save", () => {
    const storage = fakeStorage();
    savePlan(plan, storage);
    expect(clearSavedPlan(storage)).toBe(true);
    expect(loadSavedPlan(storage)).toEqual({ kind: "none" });
  });
});
