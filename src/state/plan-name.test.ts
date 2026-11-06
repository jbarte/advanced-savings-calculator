import { describe, expect, it } from "vitest";
import { PLAN_LIMITS, createBlankPlan } from "./plan-document";
import { renamePlan } from "./plan-name";
import { withPlanChange } from "./plan-change";
import { addWithdrawal } from "./withdrawals";
import type { AppState } from "./types";

const plan = createBlankPlan({ year: 2026, month: 1 });

const state: AppState = {
  scenarioId: "plan",
  plan,
  planOrigin: "example",
  storage: "idle",
  metric: "balance",
  selectedEvent: null,
  inflationAdjusted: false,
  chartMonth: null,
  theme: "system",
  notice: null,
};

describe("renamePlan", () => {
  it("gives the plan a trimmed name", () => {
    expect(renamePlan(plan, "  House 2031 ").name).toBe("House 2031");
  });

  it("replaces control characters with a space", () => {
    expect(renamePlan(plan, "Anna\tand\nme").name).toBe("Anna and me");
  });

  it("removes the name with empty text", () => {
    expect(renamePlan(renamePlan(plan, "House"), "   ").name).toBeNull();
  });

  it("accepts exactly the longest name and rejects one character more", () => {
    expect(renamePlan(plan, "x".repeat(PLAN_LIMITS.maxNameLength)).name).toHaveLength(PLAN_LIMITS.maxNameLength);
    expect(() => renamePlan(plan, "x".repeat(PLAN_LIMITS.maxNameLength + 1))).toThrow(RangeError);
  });

  it("keeps the same plan object when the name does not change", () => {
    expect(renamePlan(plan, "")).toBe(plan);
    const named = renamePlan(plan, "House");
    expect(renamePlan(named, " House ")).toBe(named);
  });

  it("keeps everything else in the plan", () => {
    expect(renamePlan(plan, "House")).toEqual({ ...plan, name: "House" });
  });
});

describe("renaming through withPlanChange", () => {
  it("makes the example the user's own plan", () => {
    const next = withPlanChange(state, (p) => renamePlan(p, "House 2031"));
    expect(next.planOrigin).toBe("own");
    expect(next.plan.name).toBe("House 2031");
  });

  it("keeps a shared plan shared", () => {
    const next = withPlanChange({ ...state, planOrigin: "shared" }, (p) => renamePlan(p, "House"));
    expect(next.planOrigin).toBe("shared");
  });

  it("leaves the example alone when the name is not changed", () => {
    const next = withPlanChange(state, (p) => renamePlan(p, ""));
    expect(next.plan).toBe(state.plan);
    expect(next.planOrigin).toBe("example");
  });

  it("says why when the name is too long", () => {
    const next = withPlanChange(state, (p) => renamePlan(p, "x".repeat(41)));
    expect(next.notice).toEqual({ kind: "change-rejected", problem: { code: "plan-name", max: PLAN_LIMITS.maxNameLength } });
  });
});

describe("event labels", () => {
  it("get control characters replaced, like the name", () => {
    const next = addWithdrawal(plan, { label: " New\tcar ", amount: 100, date: { year: 2027, month: 1 } });
    expect(next.withdrawals[0]?.label).toBe("New car");
  });

  it("are rejected when nothing is left", () => {
    expect(() => addWithdrawal(plan, { label: "\t \n", amount: 100, date: { year: 2027, month: 1 } })).toThrow(RangeError);
  });
});
