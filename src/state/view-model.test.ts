import { describe, expect, it } from "vitest";
import { PLAN_LIMITS, createBlankPlan, createExamplePlan } from "./plan-document";
import type { PlanDocument } from "./plan-document";
import { PLAN_SCENARIO_ID, PROJECTION_MONTHS, buildScenarioView, toPlanInput } from "./view-model";

const plan: PlanDocument = {
  version: 1,
  start: { year: 2026, month: 1 },
  startAmount: 5_000_000,
  monthlyDeposit: 300_000,
  annualReturnPct: 7,
};

/** End balance in öre by closed form: S(1+m)^n + D((1+m)^n − 1)/m. Independent of project(). */
function expectedEndBalance(p: PlanDocument, months: number): number {
  const m = (1 + p.annualReturnPct / 100) ** (1 / 12) - 1;
  const growth = (1 + m) ** months;
  return p.startAmount * growth + (p.monthlyDeposit * (growth - 1)) / m;
}

describe("toPlanInput", () => {
  it("carries the plan fields over and projects the requested number of months", () => {
    expect(toPlanInput(plan, 120)).toEqual({
      start: { year: 2026, month: 1 },
      startAmount: 5_000_000,
      monthlyDeposit: 300_000,
      annualReturnPct: 7,
      withdrawals: [],
      months: 120,
    });
  });
});

describe("buildScenarioView", () => {
  it("covers 30 years with one point per month", () => {
    const view = buildScenarioView(plan, "My plan");
    expect(PROJECTION_MONTHS).toBe(360);
    expect(view.points).toHaveLength(361);
    expect(view.points[0]?.month).toBe(0);
  });

  it("describes the plan for the UI", () => {
    const view = buildScenarioView(plan, "My plan");
    expect(view).toMatchObject({
      id: PLAN_SCENARIO_ID,
      name: "My plan",
      start: { year: 2026, month: 1 },
      startAmount: 5_000_000,
      monthlyDeposit: 300_000,
      annualReturnPct: 7,
      withdrawals: [],
      goal: null,
    });
  });

  it("matches an independent closed-form calculation after 30 years (about 3 889 000 kr)", () => {
    const end = buildScenarioView(plan, "My plan").points[360]?.balance ?? 0;
    expect(Math.abs(end - expectedEndBalance(plan, 360))).toBeLessThan(2_000);
    expect(end / 100).toBeCloseTo(3_888_970, -2);
  });

  it("works for the example and the blank plan", () => {
    const today = { year: 2026, month: 11 };
    expect(buildScenarioView(createExamplePlan(today), "Example").points[360]?.balance).toBeGreaterThan(0);
    const blank = buildScenarioView(createBlankPlan(today), "Blank");
    expect(blank.points.every((p) => p.balance === 0)).toBe(true);
  });

  it("stays exact at the largest allowed plan", () => {
    const largest: PlanDocument = {
      ...plan,
      startAmount: PLAN_LIMITS.maxStartAmount,
      monthlyDeposit: PLAN_LIMITS.maxMonthlyDeposit,
      annualReturnPct: PLAN_LIMITS.maxReturnPct,
    };
    const end = buildScenarioView(largest, "Largest").points[360]?.balance ?? 0;
    expect(Number.isSafeInteger(end)).toBe(true);
  });

  it("stays valid at the lowest allowed return", () => {
    const view = buildScenarioView({ ...plan, annualReturnPct: PLAN_LIMITS.minReturnPct }, "Wipeout");
    expect(view.points[360]?.balance).toBe(300_000);
  });
});
