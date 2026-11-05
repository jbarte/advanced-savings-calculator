import { describe, expect, it } from "vitest";
import { addOneTimeDeposit, removeOneTimeDeposit, updateOneTimeDeposit } from "./one-time-deposits";
import { PLAN_LIMITS, createBlankPlan } from "./plan-document";
import { validatePlanDocument } from "./validate-plan";

const plan = createBlankPlan({ year: 2026, month: 1 });
const draft = { date: { year: 2027, month: 6 }, amount: 5_000_000, label: "Bonus" };

describe("one-time deposits", () => {
  it("adds with the next id and keeps the plan valid", () => {
    const once = addOneTimeDeposit(plan, draft);
    const twice = addOneTimeDeposit(once, { ...draft, label: "Gift" });
    expect(twice.oneTimeDeposits.map((d) => d.id)).toEqual([1, 2]);
    expect(() => validatePlanDocument(twice)).not.toThrow();
    expect(plan.oneTimeDeposits).toEqual([]);
  });

  it("updates in place and rejects an unknown id", () => {
    const once = addOneTimeDeposit(plan, draft);
    expect(updateOneTimeDeposit(once, 1, { ...draft, amount: 7 }).oneTimeDeposits[0]).toMatchObject({ id: 1, amount: 7 });
    expect(() => updateOneTimeDeposit(once, 9, draft)).toThrow(RangeError);
  });

  it("removes, and does nothing for an unknown id", () => {
    const once = addOneTimeDeposit(plan, draft);
    expect(removeOneTimeDeposit(once, 1).oneTimeDeposits).toEqual([]);
    expect(removeOneTimeDeposit(once, 9)).toEqual(once);
  });

  it("rejects zero, too large, an empty label and a date outside the year range", () => {
    expect(() => addOneTimeDeposit(plan, { ...draft, amount: 0 })).toThrow(RangeError);
    expect(() => addOneTimeDeposit(plan, { ...draft, amount: PLAN_LIMITS.maxOneTimeDepositAmount + 1 })).toThrow(RangeError);
    expect(() => addOneTimeDeposit(plan, { ...draft, label: " " })).toThrow(RangeError);
    expect(() => addOneTimeDeposit(plan, { ...draft, date: { year: 1999, month: 1 } })).toThrow(RangeError);
  });

  it("stops at the limit", () => {
    let full = plan;
    for (let i = 0; i < PLAN_LIMITS.maxOneTimeDeposits; i++) full = addOneTimeDeposit(full, draft);
    expect(() => addOneTimeDeposit(full, draft)).toThrow(RangeError);
  });

  it("is checked in a whole document: duplicate ids and too many are rejected", () => {
    const one = addOneTimeDeposit(plan, draft);
    expect(() => validatePlanDocument({ ...one, oneTimeDeposits: [...one.oneTimeDeposits, ...one.oneTimeDeposits] })).toThrow(RangeError);
  });
});

describe("labels", () => {
  it("stores the label trimmed", () => {
    expect(addOneTimeDeposit(plan, { ...draft, label: "  Gift " }).oneTimeDeposits[0]?.label).toBe("Gift");
  });
});
