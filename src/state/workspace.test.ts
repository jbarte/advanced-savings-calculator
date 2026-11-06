import { describe, expect, it } from "vitest";
import { PLAN_LIMITS, createBlankPlan, createExamplePlan } from "./plan-document";
import type { PlanDocument } from "./plan-document";
import { createTestState } from "./test-support";
import type { PlanEntry, PlanSet } from "./types";
import {
  activeEntry,
  addPlan,
  canAddPlan,
  deletePlan,
  keepSharedPlan,
  leaveSharedPlan,
  openSharedPlan,
  ownCount,
  selectPlan,
  updateActivePlan,
  withPlanSetChange,
} from "./workspace";

const start = { year: 2026, month: 1 };
const named = (name: string): PlanDocument => ({ ...createBlankPlan(start), name });
const example = createExamplePlan(start);

function setOf(entries: readonly PlanEntry[], activeId = entries[0]?.id ?? 1): PlanSet {
  return { plans: entries, activeId, returnId: null };
}
const own = (id: number, plan: PlanDocument = named(`P${id}`)): PlanEntry => ({ id, plan, origin: "own" });

describe("activeEntry and selectPlan", () => {
  it("finds the open plan, and falls back to the first for an unknown id", () => {
    const set = setOf([own(1), own(2)], 2);
    expect(activeEntry(set).id).toBe(2);
    expect(activeEntry({ ...set, activeId: 99 }).id).toBe(1);
  });

  it("opens another plan, and ignores an id that does not exist", () => {
    const set = setOf([own(1), own(2)]);
    expect(selectPlan(set, 2).activeId).toBe(2);
    expect(selectPlan(set, 9)).toBe(set);
  });
});

describe("addPlan", () => {
  it("adds the plan as the user's own, one id above the highest, and opens it", () => {
    const next = addPlan(setOf([own(1), own(4)]), named("New"));
    expect(next.plans.map((entry) => entry.id)).toEqual([1, 4, 5]);
    expect(next.plans[2]).toEqual({ id: 5, plan: named("New"), origin: "own" });
    expect(next.activeId).toBe(5);
  });

  it("makes the untouched example the user's own, so it is saved with the rest", () => {
    const next = addPlan(setOf([{ id: 1, plan: example, origin: "example" }]), named("B"));
    expect(next.plans.map((entry) => entry.origin)).toEqual(["own", "own"]);
  });

  it("stops at the limit, and says so with a problem code", () => {
    const full = setOf(Array.from({ length: PLAN_LIMITS.maxPlans }, (_, i) => own(i + 1)));
    expect(canAddPlan(full)).toBe(false);
    expect(() => addPlan(full, named("one more"))).toThrow(RangeError);
  });

  it("does not count a plan opened from a link toward the limit", () => {
    const entries: PlanEntry[] = [...Array.from({ length: PLAN_LIMITS.maxPlans - 1 }, (_, i) => own(i + 1)), { id: 9, plan: named("S"), origin: "shared" }];
    expect(ownCount(entries)).toBe(PLAN_LIMITS.maxPlans - 1);
    expect(canAddPlan(setOf(entries))).toBe(true);
  });
});

describe("updateActivePlan", () => {
  it("replaces the open plan only, and makes the example the user's own", () => {
    const set = setOf([{ id: 1, plan: example, origin: "example" }, own(2)], 1);
    const changed = { ...example, startAmount: 1 };
    const next = updateActivePlan(set, changed);
    expect(next.plans[0]).toEqual({ id: 1, plan: changed, origin: "own" });
    expect(next.plans[1]).toBe(set.plans[1]);
  });

  it("keeps a shared plan shared, and the same set when nothing changes", () => {
    const set = setOf([{ id: 1, plan: example, origin: "shared" }]);
    expect(updateActivePlan(set, { ...example, startAmount: 1 }).plans[0]?.origin).toBe("shared");
    expect(updateActivePlan(set, example)).toBe(set);
  });
});

describe("deletePlan", () => {
  it("removes a plan, and moves to its neighbour when it was the open one", () => {
    const set = setOf([own(1), own(2), own(3)], 2);
    const next = deletePlan(set, 2);
    expect(next.plans.map((entry) => entry.id)).toEqual([1, 3]);
    expect(next.activeId).toBe(3);
  });

  it("moves to the one before when the last plan is removed", () => {
    expect(deletePlan(setOf([own(1), own(2)], 2), 2).activeId).toBe(1);
  });

  it("keeps the open plan when another one is removed", () => {
    expect(deletePlan(setOf([own(1), own(2)], 1), 2).activeId).toBe(1);
  });

  it("never removes the last plan of their own, or a shared plan", () => {
    const one = setOf([own(1)]);
    expect(deletePlan(one, 1)).toBe(one);
    const withShared = setOf([own(1), { id: 2, plan: named("S"), origin: "shared" }], 2);
    expect(deletePlan(withShared, 2)).toBe(withShared);
  });
});

describe("a plan opened from a link", () => {
  const base = setOf([own(1), own(2)], 2);

  it("is added as an extra, unsaved plan and opened, remembering where to go back to", () => {
    const next = openSharedPlan(base, named("Link"));
    expect(next.plans.map((entry) => [entry.id, entry.origin])).toEqual([[1, "own"], [2, "own"], [3, "shared"]]);
    expect(next.activeId).toBe(3);
    expect(next.returnId).toBe(2);
  });

  it("replaces a shared plan that was already open, and still goes back to the same plan", () => {
    const once = openSharedPlan(base, named("Link 1"));
    const twice = openSharedPlan(once, named("Link 2"));
    expect(twice.plans.filter((entry) => entry.origin === "shared")).toHaveLength(1);
    expect(twice.plans.at(-1)?.plan.name).toBe("Link 2");
    expect(twice.returnId).toBe(2);
  });

  it("can be left, which goes back to the plan that was open", () => {
    const back = leaveSharedPlan(openSharedPlan(base, named("Link")));
    expect(back.plans.map((entry) => entry.id)).toEqual([1, 2]);
    expect(back.activeId).toBe(2);
    expect(back.returnId).toBeNull();
  });

  it("can be kept as one of the user's own, next to the others", () => {
    const kept = keepSharedPlan(openSharedPlan(base, named("Link")));
    expect(kept.plans.map((entry) => entry.origin)).toEqual(["own", "own", "own"]);
    expect(kept.activeId).toBe(3);
    expect(kept.returnId).toBeNull();
  });

  it("can't be kept when there is no room", () => {
    const full = setOf(Array.from({ length: PLAN_LIMITS.maxPlans }, (_, i) => own(i + 1)));
    expect(() => keepSharedPlan(openSharedPlan(full, named("Link")))).toThrow(RangeError);
  });

  it("changes nothing to keep or leave when no shared plan is open", () => {
    expect(keepSharedPlan(base)).toBe(base);
    expect(leaveSharedPlan(base)).toBe(base);
  });
});

describe("withPlanSetChange", () => {
  const state = createTestState(named("A"), "own", { selectedEvent: "withdrawal-1", chartMonth: 12, notice: { kind: "storage-blocked" } });

  it("applies the change, clears the notice, and resets the selection when another plan opens", () => {
    const next = withPlanSetChange(state, (set) => addPlan(set, named("B")));
    expect(next.plans).toHaveLength(2);
    expect(next.activeId).toBe(2);
    expect(next.notice).toBeNull();
    expect(next.selectedEvent).toBeNull();
    expect(next.chartMonth).toBeNull();
  });

  it("goes back to the plan's own horizon when another plan opens", () => {
    const zoomed = { ...state, viewHorizonYears: 10 };
    expect(withPlanSetChange(zoomed, (set) => addPlan(set, named("B"))).viewHorizonYears).toBeNull();
    expect(withPlanSetChange(zoomed, (set) => set).viewHorizonYears).toBe(10);
  });

  it("keeps the selection when the open plan stays the same", () => {
    const next = withPlanSetChange(state, (set) => set);
    expect(next.selectedEvent).toBe("withdrawal-1");
    expect(next.plans).toBe(state.plans);
  });

  it("leaves everything as it was and says why when the change is refused", () => {
    const full = createTestState(named("A"), "own", { plans: Array.from({ length: PLAN_LIMITS.maxPlans }, (_, i) => own(i + 1)) });
    const next = withPlanSetChange(full, (set) => addPlan(set, named("B")));
    expect(next.plans).toBe(full.plans);
    expect(next.notice).toEqual({ kind: "change-rejected", problem: { code: "too-many-plans", max: PLAN_LIMITS.maxPlans } });
  });

  it("does not hide errors that are not about invalid values", () => {
    expect(() =>
      withPlanSetChange(state, () => {
        throw new TypeError("a bug");
      }),
    ).toThrow(TypeError);
  });
});
