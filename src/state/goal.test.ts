import { describe, expect, it } from "vitest";
import { clearGoal, setGoal } from "./goal";
import { PLAN_LIMITS, createBlankPlan } from "./plan-document";

const plan = createBlankPlan({ year: 2026, month: 1 });
const goal = { amount: 400_000_000, date: { year: 2056, month: 11 } };

describe("setGoal", () => {
  it("sets the goal without changing the plan it was given, and replaces an earlier goal", () => {
    const first = setGoal(plan, goal);
    expect(first.goal).toEqual(goal);
    expect(plan.goal).toBeNull();
    expect(setGoal(first, { ...goal, amount: 5_000_000 }).goal?.amount).toBe(5_000_000);
  });

  it("accepts the largest amount and rejects zero, too much, a fraction of an öre and a date outside the years", () => {
    expect(() => setGoal(plan, { ...goal, amount: PLAN_LIMITS.maxGoalAmount })).not.toThrow();
    expect(() => setGoal(plan, { ...goal, amount: 0 })).toThrow(RangeError);
    expect(() => setGoal(plan, { ...goal, amount: PLAN_LIMITS.maxGoalAmount + 1 })).toThrow(RangeError);
    expect(() => setGoal(plan, { ...goal, amount: 1.5 })).toThrow(RangeError);
    expect(() => setGoal(plan, { ...goal, date: { year: PLAN_LIMITS.maxEventYear + 1, month: 1 } })).toThrow(RangeError);
    expect(() => setGoal(plan, { ...goal, date: { year: 2056, month: 0 } })).toThrow(RangeError);
  });
});

describe("clearGoal", () => {
  it("removes the goal, and keeps the same plan when there is none", () => {
    expect(clearGoal(setGoal(plan, goal)).goal).toBeNull();
    expect(clearGoal(plan)).toBe(plan);
  });
});
