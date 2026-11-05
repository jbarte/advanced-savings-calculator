import { describe, expect, it } from "vitest";
import { PLAN_LIMITS, createBlankPlan, createExamplePlan } from "./plan-document";
import type { DepositChangeDraft, PlanDocument, PlanFields, WithdrawalDraft } from "./plan-document";
import {
  validateDepositChangeDraft,
  validateOneTimeDepositDraft,
  validatePlanDocument,
  validatePlanFields,
  validateWithdrawalDraft,
} from "./validate-plan";

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
    ["a year after the limit", { date: { year: PLAN_LIMITS.maxEventYear + 1, month: 1 } }],
  ])("rejects %s", (_name, patch) => {
    expect(() => validateWithdrawalDraft({ ...draft, ...patch })).toThrow(RangeError);
  });
});

const change: DepositChangeDraft = {
  startDate: { year: 2027, month: 2 },
  endDate: { year: 2028, month: 1 },
  amount: 0,
  label: "Parental leave",
};

describe("validateDepositChangeDraft", () => {
  it("accepts a period, an open-ended change and a pause", () => {
    expect(() => validateDepositChangeDraft(change)).not.toThrow();
    expect(() => validateDepositChangeDraft({ ...change, endDate: null, amount: 500_000 })).not.toThrow();
  });

  it("accepts a one month period and an amount on the limit", () => {
    expect(() => validateDepositChangeDraft({ ...change, endDate: change.startDate })).not.toThrow();
    expect(() => validateDepositChangeDraft({ ...change, amount: PLAN_LIMITS.maxMonthlyDeposit })).not.toThrow();
  });

  it.each([
    ["a negative amount", { amount: -1 }],
    ["a fractional amount", { amount: 1.5 }],
    ["an amount above the monthly deposit limit", { amount: PLAN_LIMITS.maxMonthlyDeposit + 1 }],
    ["an empty label", { label: " " }],
    ["a label that is too long", { label: "x".repeat(PLAN_LIMITS.maxLabelLength + 1) }],
    ["a start month of 13", { startDate: { year: 2027, month: 13 } }],
    ["an end year after the limit", { endDate: { year: PLAN_LIMITS.maxEventYear + 1, month: 1 } }],
    ["an end month before the start month", { endDate: { year: 2027, month: 1 } }],
  ])("rejects %s", (_name, patch) => {
    expect(() => validateDepositChangeDraft({ ...change, ...patch })).toThrow(RangeError);
  });

  it("explains an end before the start", () => {
    expect(() => validateDepositChangeDraft({ ...change, endDate: { year: 2027, month: 1 } })).toThrow(/end month/i);
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

  describe("deposit changes", () => {
    const d = (id: number): PlanDocument["depositChanges"][number] => ({ id, ...change });
    const withChanges = (depositChanges: PlanDocument["depositChanges"]): PlanDocument => ({ ...createBlankPlan({ year: 2026, month: 1 }), depositChanges });

    it("accepts valid changes", () => {
      expect(() => validatePlanDocument(withChanges([d(1), d(2)]))).not.toThrow();
    });

    it("rejects an invalid change, duplicate ids and bad ids", () => {
      expect(() => validatePlanDocument(withChanges([{ ...d(1), amount: -1 }]))).toThrow(RangeError);
      expect(() => validatePlanDocument(withChanges([d(1), d(1)]))).toThrow(/id/i);
      expect(() => validatePlanDocument(withChanges([d(0)]))).toThrow(RangeError);
    });

    it("rejects too many changes, counted apart from withdrawals", () => {
      const many = Array.from({ length: PLAN_LIMITS.maxDepositChanges + 1 }, (_, i) => d(i + 1));
      expect(() => validatePlanDocument(withChanges(many))).toThrow(RangeError);
      expect(() => validatePlanDocument(withChanges(many.slice(0, PLAN_LIMITS.maxDepositChanges)))).not.toThrow();
    });

    it("lets a withdrawal and a deposit change share the same id", () => {
      const plan: PlanDocument = { ...withChanges([d(1)]), withdrawals: [{ id: 1, ...draft }] };
      expect(() => validatePlanDocument(plan)).not.toThrow();
    });
  });
});

describe("step 0a: ids, event dates and labels", () => {
  const base = createBlankPlan({ year: 2026, month: 1 });
  const w = { id: 1, date: { year: 2030, month: 1 }, amount: 100, label: "w" };

  it("rejects an id that is not a safe integer, or so large that the next id would not be", () => {
    expect(() => validatePlanDocument({ ...base, withdrawals: [{ ...w, id: 2 ** 53 }] })).toThrow(RangeError);
    expect(() => validatePlanDocument({ ...base, withdrawals: [{ ...w, id: Number.MAX_SAFE_INTEGER }] })).toThrow(RangeError);
    expect(() => validatePlanDocument({ ...base, withdrawals: [{ ...w, id: Number.MAX_SAFE_INTEGER - 1 }] })).not.toThrow();
  });

  it("lets events reach the end of the longest horizon of a plan that starts in the last allowed year", () => {
    const late = { ...base, start: { year: PLAN_LIMITS.maxStartYear, month: 1 } };
    const at = (year: number): PlanDocument => ({ ...late, withdrawals: [{ ...w, date: { year, month: 12 } }] });
    expect(() => validatePlanDocument(at(PLAN_LIMITS.maxEventYear))).not.toThrow();
    expect(() => validatePlanDocument(at(PLAN_LIMITS.maxEventYear + 1))).toThrow(RangeError);
  });

  it("still caps the plan start at the start limit", () => {
    expect(() => validatePlanFields({ ...base, start: { year: PLAN_LIMITS.maxStartYear + 1, month: 1 } })).toThrow(RangeError);
  });
});

describe("validateOneTimeDepositDraft", () => {
  const deposit = { date: { year: 2030, month: 6 }, amount: 1_000_000, label: "Bonus" };

  it("accepts a valid deposit, including the largest amount", () => {
    expect(() => validateOneTimeDepositDraft(deposit)).not.toThrow();
    expect(() => validateOneTimeDepositDraft({ ...deposit, amount: PLAN_LIMITS.maxOneTimeDepositAmount })).not.toThrow();
  });

  it.each([
    ["zero", { amount: 0 }],
    ["more than the limit", { amount: PLAN_LIMITS.maxOneTimeDepositAmount + 1 }],
    ["a fraction of an öre", { amount: 1.5 }],
    ["an empty label", { label: "  " }],
    ["a too long label", { label: "x".repeat(PLAN_LIMITS.maxLabelLength + 1) }],
    ["a month of 13", { date: { year: 2030, month: 13 } }],
    ["a year after the event limit", { date: { year: PLAN_LIMITS.maxEventYear + 1, month: 1 } }],
  ])("rejects %s", (_name, patch) => {
    expect(() => validateOneTimeDepositDraft({ ...deposit, ...patch })).toThrow(RangeError);
  });

  it("is part of the whole-document check: too many one-time deposits", () => {
    const many = Array.from({ length: PLAN_LIMITS.maxOneTimeDeposits + 1 }, (_, i) => ({ ...deposit, id: i + 1 }));
    expect(() => validatePlanDocument({ ...createBlankPlan({ year: 2026, month: 1 }), oneTimeDeposits: many })).toThrow(RangeError);
  });
});

