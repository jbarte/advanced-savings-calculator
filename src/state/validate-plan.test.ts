import { describe, expect, it } from "vitest";
import { PLAN_LIMITS, createBlankPlan, createExamplePlan } from "./plan-document";
import type { PlanDocument, PlanFields, WithdrawalDraft } from "./plan-document";
import { validatePlanDocument, validatePlanFields, validateWithdrawalDraft } from "./validate-plan";

const fields: PlanFields = {
  start: { year: 2026, month: 1 },
  startAmount: 5_000_000,
  monthlyDeposit: 300_000,
  annualReturnPct: 7,
};

const draft: WithdrawalDraft = { date: { year: 2031, month: 4 }, amount: 15_000_000, label: "Car" };

describe("validatePlanFields", () => {
  it("accepts ordinary values", () => {
    expect(() => validatePlanFields(fields)).not.toThrow();
  });

  it("accepts values exactly on the limits", () => {
    expect(() => validatePlanFields({ ...fields, startAmount: 0, monthlyDeposit: 0, annualReturnPct: PLAN_LIMITS.minReturnPct })).not.toThrow();
    expect(() =>
      validatePlanFields({
        start: { year: PLAN_LIMITS.maxStartYear, month: 12 },
        startAmount: PLAN_LIMITS.maxStartAmount,
        monthlyDeposit: PLAN_LIMITS.maxMonthlyDeposit,
        annualReturnPct: PLAN_LIMITS.maxReturnPct,
      }),
    ).not.toThrow();
  });

  it.each([
    ["a negative start amount", { startAmount: -1 }],
    ["a fractional start amount", { startAmount: 10.5 }],
    ["a start amount above the limit", { startAmount: PLAN_LIMITS.maxStartAmount + 1 }],
    ["a non-finite start amount", { startAmount: Number.NaN }],
    ["a negative deposit", { monthlyDeposit: -1 }],
    ["a deposit above the limit", { monthlyDeposit: PLAN_LIMITS.maxMonthlyDeposit + 1 }],
    ["a return below the limit", { annualReturnPct: PLAN_LIMITS.minReturnPct - 0.1 }],
    ["a return above the limit", { annualReturnPct: PLAN_LIMITS.maxReturnPct + 0.1 }],
    ["a non-finite return", { annualReturnPct: Number.POSITIVE_INFINITY }],
    ["a month of 0", { start: { year: 2026, month: 0 } }],
    ["a month of 13", { start: { year: 2026, month: 13 } }],
    ["a fractional month", { start: { year: 2026, month: 1.5 } }],
    ["a year before the limit", { start: { year: PLAN_LIMITS.minStartYear - 1, month: 1 } }],
    ["a year after the limit", { start: { year: PLAN_LIMITS.maxStartYear + 1, month: 1 } }],
  ])("rejects %s", (_name, patch) => {
    expect(() => validatePlanFields({ ...fields, ...patch })).toThrow(RangeError);
  });

  it("says which value is wrong", () => {
    expect(() => validatePlanFields({ ...fields, startAmount: -1 })).toThrow(/start amount/i);
    expect(() => validatePlanFields({ ...fields, monthlyDeposit: -1 })).toThrow(/monthly deposit/i);
    expect(() => validatePlanFields({ ...fields, annualReturnPct: 99 })).toThrow(/return/i);
  });
});

describe("validateWithdrawalDraft", () => {
  it("accepts an ordinary withdrawal", () => {
    expect(() => validateWithdrawalDraft(draft)).not.toThrow();
  });

  it("accepts the smallest amount and the longest label", () => {
    expect(() => validateWithdrawalDraft({ ...draft, amount: 1 })).not.toThrow();
    expect(() => validateWithdrawalDraft({ ...draft, label: "x".repeat(PLAN_LIMITS.maxLabelLength) })).not.toThrow();
  });

  it.each([
    ["an amount of 0", { amount: 0 }],
    ["a negative amount", { amount: -5 }],
    ["a fractional amount", { amount: 1.5 }],
    ["an amount above the limit", { amount: PLAN_LIMITS.maxStartAmount + 1 }],
    ["an empty label", { label: "" }],
    ["a blank label", { label: "   " }],
    ["a label that is too long", { label: "x".repeat(PLAN_LIMITS.maxLabelLength + 1) }],
    ["a month of 13", { date: { year: 2031, month: 13 } }],
    ["a year after the limit", { date: { year: PLAN_LIMITS.maxStartYear + 1, month: 1 } }],
  ])("rejects %s", (_name, patch) => {
    expect(() => validateWithdrawalDraft({ ...draft, ...patch })).toThrow(RangeError);
  });
});

describe("validatePlanDocument", () => {
  const withWithdrawals = (withdrawals: PlanDocument["withdrawals"]): PlanDocument => ({ ...createBlankPlan({ year: 2026, month: 1 }), withdrawals });
  const w = (id: number): PlanDocument["withdrawals"][number] => ({ id, ...draft });

  it("accepts the example and the blank plan", () => {
    const today = { year: 2026, month: 11 };
    expect(() => validatePlanDocument(createExamplePlan(today))).not.toThrow();
    expect(() => validatePlanDocument(createBlankPlan(today))).not.toThrow();
  });

  it("rejects an unknown version", () => {
    expect(() => validatePlanDocument({ ...createBlankPlan({ year: 2026, month: 1 }), version: 2 as unknown as 1 })).toThrow(RangeError);
  });

  it("rejects invalid plan fields and invalid withdrawals", () => {
    expect(() => validatePlanDocument({ ...createBlankPlan({ year: 2026, month: 1 }), startAmount: -1 })).toThrow(RangeError);
    expect(() => validatePlanDocument(withWithdrawals([{ ...w(1), amount: 0 }]))).toThrow(RangeError);
  });

  it("rejects duplicate ids and ids that are not positive whole numbers", () => {
    expect(() => validatePlanDocument(withWithdrawals([w(1), w(1)]))).toThrow(/id/i);
    expect(() => validatePlanDocument(withWithdrawals([w(0)]))).toThrow(RangeError);
    expect(() => validatePlanDocument(withWithdrawals([w(1.5)]))).toThrow(RangeError);
  });

  it("rejects too many withdrawals", () => {
    const many = Array.from({ length: PLAN_LIMITS.maxWithdrawals + 1 }, (_, i) => w(i + 1));
    expect(() => validatePlanDocument(withWithdrawals(many))).toThrow(RangeError);
    expect(() => validatePlanDocument(withWithdrawals(many.slice(0, PLAN_LIMITS.maxWithdrawals)))).not.toThrow();
  });
});
