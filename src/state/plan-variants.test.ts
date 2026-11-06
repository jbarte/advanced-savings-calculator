import { describe, expect, it } from "vitest";
import { createBlankPlan } from "./plan-document";
import type { PlanDocument } from "./plan-document";
import { planWithoutEvent } from "./plan-variants";

const date = { year: 2031, month: 3 };
const plan: PlanDocument = {
  ...createBlankPlan({ year: 2026, month: 1 }),
  withdrawals: [{ id: 1, date, amount: 100, label: "Car" }, { id: 2, date, amount: 200, label: "Boat" }],
  depositChanges: [{ id: 1, startDate: date, endDate: null, amount: 0, label: "Pause" }],
  oneTimeDeposits: [{ id: 1, date, amount: 300, label: "Bonus" }],
};

describe("planWithoutEvent", () => {
  it("leaves out a withdrawal and keeps everything else", () => {
    const result = planWithoutEvent(plan, "withdrawal-2");
    expect(result?.label).toBe("Boat");
    expect(result?.plan).toEqual({ ...plan, withdrawals: [plan.withdrawals[0]] });
  });

  it("finds a deposit change and a one-time deposit, whose ids are numbered apart", () => {
    expect(planWithoutEvent(plan, "deposit-change-1")).toMatchObject({ label: "Pause", plan: { depositChanges: [], withdrawals: plan.withdrawals } });
    expect(planWithoutEvent(plan, "one-time-deposit-1")).toMatchObject({ label: "Bonus", plan: { oneTimeDeposits: [] } });
  });

  it("does not change the original plan", () => {
    planWithoutEvent(plan, "withdrawal-1");
    expect(plan.withdrawals).toHaveLength(2);
  });

  it("gives null for an event that is not there, or a key that is not an event", () => {
    expect(planWithoutEvent(plan, "withdrawal-9")).toBeNull();
    expect(planWithoutEvent(plan, "withdrawal-x")).toBeNull();
    expect(planWithoutEvent(plan, "goal-1")).toBeNull();
  });
});
