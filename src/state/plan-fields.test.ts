import { describe, expect, it } from "vitest";
import { createBlankPlan } from "./plan-document";
import { updatePlanFields } from "./plan-fields";

const plan = createBlankPlan({ year: 2026, month: 1 });

describe("updatePlanFields", () => {
  it("merges a valid change and keeps the rest", () => {
    const updated = updatePlanFields(plan, { monthlyDeposit: 300_000, annualReturnPct: 5 });
    expect(updated).toMatchObject({ monthlyDeposit: 300_000, annualReturnPct: 5, startAmount: 0, withdrawals: [] });
  });

  it("does not change the original plan", () => {
    updatePlanFields(plan, { startAmount: 1_000 });
    expect(plan.startAmount).toBe(0);
  });

  it("rejects an invalid value", () => {
    expect(() => updatePlanFields(plan, { startAmount: -1 })).toThrow(RangeError);
    expect(() => updatePlanFields(plan, { annualReturnPct: 500 })).toThrow(RangeError);
  });
});
