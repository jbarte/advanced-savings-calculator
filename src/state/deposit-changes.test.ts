import { describe, expect, it } from "vitest";
import { addDepositChange, removeDepositChange, updateDepositChange } from "./deposit-changes";
import { PLAN_LIMITS, createBlankPlan } from "./plan-document";
import type { DepositChangeDraft } from "./plan-document";

const blank = createBlankPlan({ year: 2026, month: 1 });
const draft = (n: number): DepositChangeDraft => ({
  startDate: { year: 2030, month: n },
  endDate: null,
  amount: n * 10_000,
  label: `C${n}`,
});

describe("addDepositChange", () => {
  it("adds the change with the first id", () => {
    const plan = addDepositChange(blank, draft(3));
    expect(plan.depositChanges).toEqual([{ id: 1, startDate: { year: 2030, month: 3 }, endDate: null, amount: 30_000, label: "C3" }]);
  });

  it("gives each new change an id one above the highest existing one", () => {
    const two = addDepositChange(addDepositChange(blank, draft(1)), draft(2));
    expect(two.depositChanges.map((c) => c.id)).toEqual([1, 2]);
    expect(addDepositChange(removeDepositChange(two, 1), draft(3)).depositChanges.map((c) => c.id)).toEqual([2, 3]);
  });

  it("keeps the ids of changes and withdrawals apart", () => {
    const plan = addDepositChange({ ...blank, withdrawals: [{ id: 5, date: { year: 2030, month: 1 }, amount: 100, label: "W" }] }, draft(1));
    expect(plan.depositChanges[0]?.id).toBe(1);
  });

  it("does not change the original plan", () => {
    addDepositChange(blank, draft(1));
    expect(blank.depositChanges).toEqual([]);
  });

  it("refuses to go past the limit", () => {
    let plan = blank;
    for (let i = 0; i < PLAN_LIMITS.maxDepositChanges; i++) plan = addDepositChange(plan, draft(1));
    expect(() => addDepositChange(plan, draft(1))).toThrow(RangeError);
  });

  it("rejects an invalid change", () => {
    expect(() => addDepositChange(blank, { ...draft(1), amount: -1 })).toThrow(RangeError);
    expect(() => addDepositChange(blank, { ...draft(5), endDate: { year: 2030, month: 1 } })).toThrow(/end month/i);
  });
});

describe("updateDepositChange", () => {
  it("replaces the fields but keeps the id and the position", () => {
    const plan = addDepositChange(addDepositChange(blank, draft(1)), draft(2));
    const updated = updateDepositChange(plan, 1, { ...draft(9), label: "Changed" });
    expect(updated.depositChanges.map((c) => [c.id, c.label])).toEqual([
      [1, "Changed"],
      [2, "C2"],
    ]);
  });

  it("rejects an unknown id and an invalid change, leaving the plan alone", () => {
    const plan = addDepositChange(blank, draft(1));
    expect(() => updateDepositChange(plan, 7, draft(1))).toThrow(RangeError);
    expect(() => updateDepositChange(plan, 1, { ...draft(1), amount: -1 })).toThrow(RangeError);
    expect(plan.depositChanges[0]?.amount).toBe(10_000);
  });
});

describe("removeDepositChange", () => {
  it("removes only that change and ignores an id that is gone", () => {
    const plan = addDepositChange(addDepositChange(blank, draft(1)), draft(2));
    expect(removeDepositChange(plan, 1).depositChanges.map((c) => c.id)).toEqual([2]);
    expect(removeDepositChange(plan, 9)).toEqual(plan);
  });
});
