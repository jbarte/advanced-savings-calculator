import { describe, expect, it } from "vitest";
import { addWithdrawal, updateWithdrawal } from "./withdrawals";
import { PLAN_LIMITS, createBlankPlan, createExamplePlan } from "./plan-document";
import type { PlanDocument } from "./plan-document";
import { PlanError, problemOf } from "./plan-problem";
import type { PlanProblem } from "./plan-problem";
import { readPlanDocument, readPlanText } from "./read-plan";
import { decodePlan } from "./share-link";
import { validateDepositChangeDraft, validatePlanFields } from "./validate-plan";

const plan = createBlankPlan({ year: 2026, month: 1 });

/** The problem a call throws, or a failure if it throws something else or nothing. */
function problemFrom(run: () => unknown): PlanProblem {
  try {
    run();
  } catch (error) {
    if (error instanceof PlanError) return error.problem;
    throw error;
  }
  throw new Error("Expected a PlanError");
}

async function problemFromAsync(run: () => Promise<unknown>): Promise<PlanProblem> {
  try {
    await run();
  } catch (error) {
    if (error instanceof PlanError) return error.problem;
    throw error;
  }
  throw new Error("Expected a PlanError");
}

describe("problem codes from the checks", () => {
  it("says which amount is out of range and its limits, in öre", () => {
    expect(problemFrom(() => validatePlanFields({ ...plan, monthlyDeposit: -1 }))).toEqual({
      code: "amount",
      field: "monthlyDeposit",
      min: 0,
      max: PLAN_LIMITS.maxMonthlyDeposit,
    });
  });

  it("says which date, percent or horizon is out of range", () => {
    expect(problemFrom(() => validatePlanFields({ ...plan, start: { year: 1999, month: 1 } }))).toMatchObject({ code: "date", field: "startDate" });
    expect(problemFrom(() => validatePlanFields({ ...plan, annualReturnPct: 31 }))).toMatchObject({ code: "percent", field: "annualReturn" });
    expect(problemFrom(() => validatePlanFields({ ...plan, inflationPct: 21 }))).toMatchObject({ code: "percent", field: "inflation" });
    expect(problemFrom(() => validatePlanFields({ ...plan, horizonYears: 41 }))).toEqual({ code: "horizon", min: 1, max: 40 });
  });

  it("names the kind of event for labels, full lists and an end before the start", () => {
    const draft = { label: "", amount: 100, date: { year: 2027, month: 1 } };
    expect(problemFrom(() => addWithdrawal(plan, draft))).toEqual({ code: "label", kind: "withdrawal", max: PLAN_LIMITS.maxLabelLength });
    const full: PlanDocument = {
      ...plan,
      withdrawals: Array.from({ length: PLAN_LIMITS.maxWithdrawals }, (_, i) => ({ id: i + 1, label: "x", amount: 1, date: plan.start })),
    };
    expect(problemFrom(() => addWithdrawal(full, { ...draft, label: "x" }))).toEqual({
      code: "too-many",
      kind: "withdrawal",
      max: PLAN_LIMITS.maxWithdrawals,
    });
    const change = { label: "x", amount: 0, startDate: { year: 2027, month: 5 }, endDate: { year: 2027, month: 1 } };
    expect(problemFrom(() => validateDepositChangeDraft(change))).toEqual({ code: "end-before-start" });
  });

  it("calls an edit of an event that is gone damaged, not a user mistake", () => {
    expect(problemFrom(() => updateWithdrawal(plan, 99, { label: "x", amount: 1, date: plan.start }))).toEqual({ code: "damaged" });
  });
});

describe("problem codes from saved and shared data", () => {
  it("calls text that is not a plan damaged, and a plan from a newer app newer", () => {
    expect(problemFrom(() => readPlanText("not json"))).toEqual({ code: "damaged" });
    expect(problemFrom(() => readPlanDocument({ version: 3 }))).toEqual({ code: "damaged" });
    expect(problemFrom(() => readPlanDocument({ ...createExamplePlan(plan.start), version: 99 }))).toEqual({ code: "newer-version" });
  });

  it("gives a link problem for a bad link", async () => {
    expect(await problemFromAsync(() => decodePlan("x.abc"))).toEqual({ code: "not-a-plan-link" });
    expect(await problemFromAsync(() => decodePlan("z.ab$d"))).toEqual({ code: "link-damaged" });
    expect(await problemFromAsync(() => decodePlan("z." + "A".repeat(40_000)))).toEqual({ code: "link-too-large" });
  });

  it("treats a RangeError that is not a PlanError as damaged data", () => {
    expect(problemOf(new RangeError("from the engine"))).toEqual({ code: "damaged" });
  });
});
