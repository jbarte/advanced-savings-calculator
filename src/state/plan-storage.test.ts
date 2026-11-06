import { describe, expect, it } from "vitest";
import { createBlankPlan, createExamplePlan } from "./plan-document";
import type { PlanDocument } from "./plan-document";
import { LEGACY_PLAN_STORAGE_KEY, PLANS_STORAGE_KEY, PLAN_STORAGE_KEY, clearSavedPlans, loadSavedPlans, savePlans } from "./plan-storage";
import type { StorageLike } from "./plan-storage";
import { serializePlan } from "./read-plan";
import type { PlanSet } from "./types";

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

/** A set of the user's own plans, the first one open. */
function setOf(...plans: PlanDocument[]): PlanSet {
  return { plans: plans.map((item, i) => ({ id: i + 1, plan: item, origin: "own" as const })), activeId: 1, returnId: null };
}

describe("loadSavedPlans", () => {
  it("finds nothing in empty storage", () => {
    expect(loadSavedPlans(fakeStorage())).toEqual({ kind: "none" });
  });

  it("loads the plans that were saved, and which one was open", () => {
    const storage = fakeStorage();
    const other = createBlankPlan({ year: 2027, month: 2 });
    expect(savePlans({ ...setOf(plan, other), activeId: 2 }, storage)).toBe(true);
    expect(loadSavedPlans(storage)).toEqual({
      kind: "loaded",
      workspace: { plans: [{ id: 1, plan }, { id: 2, plan: other }], activeId: 2 },
    });
  });

  it("reports why saved plans are unusable, and leaves them in place", () => {
    const text = JSON.stringify({ version: 1, activeId: 1, plans: [{ id: 1, plan: { ...plan, startAmount: -5 } }] });
    const storage = fakeStorage({ [PLANS_STORAGE_KEY]: text });
    const result = loadSavedPlans(storage);
    expect(result.kind).toBe("invalid");
    expect(result.kind === "invalid" && result.problem).toMatchObject({ code: "amount", field: "startAmount" });
    expect(storage.data.has(PLANS_STORAGE_KEY)).toBe(true);
  });

  it("reports text that is not JSON as invalid", () => {
    expect(loadSavedPlans(fakeStorage({ [PLANS_STORAGE_KEY]: "{oops" })).kind).toBe("invalid");
  });

  it("reports blocked storage, and a missing storage object, as unavailable", () => {
    expect(loadSavedPlans(blocked)).toEqual({ kind: "unavailable" });
    expect(loadSavedPlans(null)).toEqual({ kind: "unavailable" });
  });
});

describe("savePlans and clearSavedPlans", () => {
  it("returns false instead of throwing when storage refuses", () => {
    expect(savePlans(setOf(plan), blocked)).toBe(false);
    expect(savePlans(setOf(plan), null)).toBe(false);
    expect(clearSavedPlans(blocked)).toBe(false);
  });

  it("overwrites an earlier save", () => {
    const storage = fakeStorage();
    savePlans(setOf(plan), storage);
    savePlans(setOf(createBlankPlan({ year: 2027, month: 2 })), storage);
    expect(loadSavedPlans(storage)).toEqual({
      kind: "loaded",
      workspace: { plans: [{ id: 1, plan: createBlankPlan({ year: 2027, month: 2 }) }], activeId: 1 },
    });
  });

  it("never saves a plan opened from a link, and keeps the plan to go back to as the open one", () => {
    const storage = fakeStorage();
    const shared = createBlankPlan({ year: 2030, month: 1 });
    const set: PlanSet = {
      plans: [{ id: 1, plan, origin: "own" }, { id: 2, plan: shared, origin: "shared" }],
      activeId: 2,
      returnId: 1,
    };
    savePlans(set, storage);
    expect(loadSavedPlans(storage)).toEqual({ kind: "loaded", workspace: { plans: [{ id: 1, plan }], activeId: 1 } });
  });

  it("clears the save", () => {
    const storage = fakeStorage();
    savePlans(setOf(plan), storage);
    expect(clearSavedPlans(storage)).toBe(true);
    expect(loadSavedPlans(storage)).toEqual({ kind: "none" });
  });
});

describe("a single plan saved before there could be several", () => {
  it("opens as a set of one, under the key it was saved with", () => {
    const storage = fakeStorage({ [PLAN_STORAGE_KEY]: serializePlan(plan) });
    expect(loadSavedPlans(storage)).toEqual({ kind: "loaded", workspace: { plans: [{ id: 1, plan }], activeId: 1 } });
  });

  it("opens a plan saved under the shortest key, including a version 1 plan", () => {
    const { horizonYears: _h, inflationPct: _i, ...v1 } = plan;
    const storage = fakeStorage({ [LEGACY_PLAN_STORAGE_KEY]: JSON.stringify({ ...v1, version: 1 }) });
    expect(loadSavedPlans(storage)).toEqual({ kind: "loaded", workspace: { plans: [{ id: 1, plan }], activeId: 1 } });
  });

  it("reports a broken single plan as invalid", () => {
    expect(loadSavedPlans(fakeStorage({ [PLAN_STORAGE_KEY]: "{oops" })).kind).toBe("invalid");
  });

  it("moves to the new key on the next save, and start over clears every key", () => {
    const storage = fakeStorage({ [LEGACY_PLAN_STORAGE_KEY]: serializePlan(plan), [PLAN_STORAGE_KEY]: serializePlan(plan) });
    savePlans(setOf(plan), storage);
    expect([...storage.data.keys()]).toEqual([PLANS_STORAGE_KEY]);
    storage.data.set(LEGACY_PLAN_STORAGE_KEY, "old");
    storage.data.set(PLAN_STORAGE_KEY, "old");
    clearSavedPlans(storage);
    expect(storage.data.size).toBe(0);
  });

  it("prefers the saved set of plans when both exist", () => {
    const other = { ...plan, startAmount: 1 };
    const storage = fakeStorage({ [PLANS_STORAGE_KEY]: JSON.stringify({ version: 1, activeId: 1, plans: [{ id: 1, plan }] }), [PLAN_STORAGE_KEY]: serializePlan(other) });
    expect(loadSavedPlans(storage)).toEqual({ kind: "loaded", workspace: { plans: [{ id: 1, plan }], activeId: 1 } });
  });
});
