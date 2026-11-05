import { describe, expect, it } from "vitest";
import { PLAN_LIMITS, createBlankPlan } from "./plan-document";
import type { WithdrawalDraft } from "./plan-document";
import { addWithdrawal, removeWithdrawal, updateWithdrawal } from "./withdrawals";

const blank = createBlankPlan({ year: 2026, month: 1 });
const draft = (n: number): WithdrawalDraft => ({ date: { year: 2030, month: n }, amount: n * 100_000, label: `W${n}` });

describe("addWithdrawal", () => {
  it("adds the withdrawal with the first id", () => {
    const plan = addWithdrawal(blank, draft(3));
    expect(plan.withdrawals).toEqual([{ id: 1, date: { year: 2030, month: 3 }, amount: 300_000, label: "W3" }]);
  });

  it("gives each new withdrawal an id one above the highest existing one", () => {
    const two = addWithdrawal(addWithdrawal(blank, draft(1)), draft(2));
    expect(two.withdrawals.map((w) => w.id)).toEqual([1, 2]);
    const afterRemoval = addWithdrawal(removeWithdrawal(two, 1), draft(3));
    expect(afterRemoval.withdrawals.map((w) => w.id)).toEqual([2, 3]);
  });

  it("keeps the rest of the plan and does not change the original", () => {
    const plan = addWithdrawal(blank, draft(1));
    expect(plan).toMatchObject({ version: 1, startAmount: blank.startAmount, start: blank.start });
    expect(blank.withdrawals).toEqual([]);
  });

  it("refuses to go past the limit", () => {
    let plan = blank;
    for (let i = 0; i < PLAN_LIMITS.maxWithdrawals; i++) plan = addWithdrawal(plan, draft(1));
    expect(plan.withdrawals).toHaveLength(PLAN_LIMITS.maxWithdrawals);
    expect(() => addWithdrawal(plan, draft(1))).toThrow(RangeError);
  });
});

describe("updateWithdrawal", () => {
  it("replaces the fields but keeps the id and the position", () => {
    const plan = addWithdrawal(addWithdrawal(blank, draft(1)), draft(2));
    const updated = updateWithdrawal(plan, 1, { date: { year: 2040, month: 12 }, amount: 5, label: "Changed" });
    expect(updated.withdrawals).toEqual([
      { id: 1, date: { year: 2040, month: 12 }, amount: 5, label: "Changed" },
      { id: 2, date: { year: 2030, month: 2 }, amount: 200_000, label: "W2" },
    ]);
  });

  it("rejects an id that does not exist", () => {
    expect(() => updateWithdrawal(blank, 7, draft(1))).toThrow(RangeError);
  });
});

describe("removeWithdrawal", () => {
  it("removes only that withdrawal", () => {
    const plan = addWithdrawal(addWithdrawal(blank, draft(1)), draft(2));
    expect(removeWithdrawal(plan, 1).withdrawals.map((w) => w.id)).toEqual([2]);
  });

  it("does nothing for an id that is already gone", () => {
    const plan = addWithdrawal(blank, draft(1));
    expect(removeWithdrawal(plan, 9)).toEqual(plan);
  });
});

describe("validation", () => {
  it("rejects an invalid withdrawal when adding", () => {
    expect(() => addWithdrawal(blank, { ...draft(1), amount: 0 })).toThrow(RangeError);
    expect(() => addWithdrawal(blank, { ...draft(1), label: "x".repeat(PLAN_LIMITS.maxLabelLength + 1) })).toThrow(RangeError);
    expect(() => addWithdrawal(blank, { ...draft(1), date: { year: 2030, month: 13 } })).toThrow(RangeError);
  });

  it("rejects an invalid withdrawal when updating, and leaves the plan alone", () => {
    const plan = addWithdrawal(blank, draft(1));
    expect(() => updateWithdrawal(plan, 1, { ...draft(1), amount: -1 })).toThrow(RangeError);
    expect(plan.withdrawals[0]?.amount).toBe(100_000);
  });
});

describe("labels", () => {
  it("stores the label trimmed", () => {
    const plan = addWithdrawal(createBlankPlan({ year: 2026, month: 1 }), { date: { year: 2030, month: 1 }, amount: 100, label: "  Car  " });
    expect(plan.withdrawals[0]?.label).toBe("Car");
    expect(updateWithdrawal(plan, 1, { date: { year: 2030, month: 1 }, amount: 100, label: " Boat " }).withdrawals[0]?.label).toBe("Boat");
  });
});
