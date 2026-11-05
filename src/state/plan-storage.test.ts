import { describe, expect, it } from "vitest";
import { createBlankPlan, createExamplePlan } from "./plan-document";
import { LEGACY_PLAN_STORAGE_KEY, PLAN_STORAGE_KEY, clearSavedPlan, loadSavedPlan, savePlan } from "./plan-storage";
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
    expect(result.kind === "invalid" && result.problem).toMatchObject({ code: "amount", field: "startAmount" });
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

describe("the earlier storage key", () => {
  it("still reads a plan saved under the short key, including a version 1 plan", () => {
    const { horizonYears: _h, inflationPct: _i, ...v1 } = plan;
    const storage = fakeStorage({ [LEGACY_PLAN_STORAGE_KEY]: JSON.stringify({ ...v1, version: 1 }) });
    expect(loadSavedPlan(storage)).toEqual({ kind: "loaded", plan });
  });

  it("moves the plan to the new key on the next save, and clears both on start over", () => {
    const storage = fakeStorage({ [LEGACY_PLAN_STORAGE_KEY]: serializePlan(plan) });
    savePlan(plan, storage);
    expect([...storage.data.keys()]).toEqual([PLAN_STORAGE_KEY]);
    storage.data.set(LEGACY_PLAN_STORAGE_KEY, "old");
    clearSavedPlan(storage);
    expect(storage.data.size).toBe(0);
  });

  it("prefers the new key when both exist", () => {
    const other = { ...plan, startAmount: 1 };
    const storage = fakeStorage({ [PLAN_STORAGE_KEY]: serializePlan(plan), [LEGACY_PLAN_STORAGE_KEY]: serializePlan(other) });
    expect(loadSavedPlan(storage)).toEqual({ kind: "loaded", plan });
  });
});

