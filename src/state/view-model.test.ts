import { describe, expect, it } from "vitest";
import { addMonths } from "../core/year-month";
import { PLAN_LIMITS, createBlankPlan, createExamplePlan } from "./plan-document";
import type { PlanDocument } from "./plan-document";
import type { ScenarioView } from "./types";
import { PLAN_SCENARIO_ID, PROJECTION_MONTHS, buildScenarioView, toPlanInput } from "./view-model";

const plan: PlanDocument = {
  version: 1,
  start: { year: 2026, month: 1 },
  startAmount: 5_000_000,
  monthlyDeposit: 300_000,
  annualReturnPct: 7,
  withdrawals: [],
  depositChanges: [],
  oneTimeDeposits: [],
};

const HORIZON_30 = 360;

/** What was deposited in `month`, read from the running total of the projection. */
function depositIn(view: ScenarioView, month: number): number {
  return (view.points[month]?.deposited ?? 0) - (view.points[month - 1]?.deposited ?? 0);
}

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
      depositChanges: [],
      oneTimeDeposits: [],
      months: 120,
    });
  });
});

describe("buildScenarioView", () => {
  it("covers 30 years with one point per month", () => {
    const view = buildScenarioView(plan, "My plan", HORIZON_30);
    expect(PROJECTION_MONTHS).toBe(360);
    expect(view.points).toHaveLength(361);
    expect(view.points[0]?.month).toBe(0);
  });

  it("describes the plan for the UI", () => {
    const view = buildScenarioView(plan, "My plan", HORIZON_30);
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
    const end = buildScenarioView(plan, "My plan", HORIZON_30).points[360]?.balance ?? 0;
    expect(Math.abs(end - expectedEndBalance(plan, 360))).toBeLessThan(2_000);
    expect(end / 100).toBeCloseTo(3_888_970, -2);
  });

  it("works for the example and the blank plan", () => {
    const today = { year: 2026, month: 11 };
    expect(buildScenarioView(createExamplePlan(today), "Example", HORIZON_30).points[360]?.balance).toBeGreaterThan(0);
    const blank = buildScenarioView(createBlankPlan(today), "Blank", HORIZON_30);
    expect(blank.points.every((p) => p.balance === 0)).toBe(true);
  });

  it("stays exact at the largest allowed plan", () => {
    const largest: PlanDocument = {
      ...plan,
      startAmount: PLAN_LIMITS.maxStartAmount,
      monthlyDeposit: PLAN_LIMITS.maxMonthlyDeposit,
      annualReturnPct: PLAN_LIMITS.maxReturnPct,
    };
    const end = buildScenarioView(largest, "Largest", HORIZON_30).points[360]?.balance ?? 0;
    expect(Number.isSafeInteger(end)).toBe(true);
  });

  it("stays valid at the lowest allowed return", () => {
    const view = buildScenarioView({ ...plan, annualReturnPct: PLAN_LIMITS.minReturnPct }, "Wipeout", HORIZON_30);
    expect(view.points[360]?.balance).toBe(300_000);
  });
});

const car = { id: 1, date: { year: 2031, month: 1 }, amount: 15_000_000, label: "Car" }; // month 60

describe("withdrawals in toPlanInput", () => {
  it("turns each date into months after the start", () => {
    const withCar: PlanDocument = { ...plan, withdrawals: [{ ...car, date: { year: 2031, month: 4 } }] };
    expect(toPlanInput(withCar, 360).withdrawals).toEqual([{ month: 63, amount: 15_000_000, label: "Car" }]);
  });

  it("leaves out a withdrawal dated before the start", () => {
    const early: PlanDocument = { ...plan, withdrawals: [{ ...car, date: { year: 2025, month: 12 } }] };
    expect(toPlanInput(early, 360).withdrawals).toEqual([]);
  });

  it("keeps a withdrawal in the start month", () => {
    const first: PlanDocument = { ...plan, withdrawals: [{ ...car, date: plan.start }] };
    expect(toPlanInput(first, 360).withdrawals).toEqual([{ month: 0, amount: 15_000_000, label: "Car" }]);
  });
});

describe("buildScenarioView withdrawals", () => {
  const withCar: PlanDocument = { ...plan, withdrawals: [car] };

  it("describes a planned withdrawal and what it costs", () => {
    const [w] = buildScenarioView(withCar, "P", HORIZON_30).withdrawals;
    expect(w).toMatchObject({ id: 1, month: 60, amount: 15_000_000, applied: 15_000_000, shortfall: 0, status: "planned", label: "Car" });
    const m = (1.07) ** (1 / 12) - 1;
    const expected = 15_000_000 * ((1 + m) ** 300 - 1);
    expect(Math.abs((w?.lostGrowth ?? 0) - expected)).toBeLessThan(2_000);
  });

  it("takes the withdrawal out of the balance", () => {
    const without = buildScenarioView(plan, "P", HORIZON_30).points[360]?.balance ?? 0;
    const view = buildScenarioView(withCar, "P", HORIZON_30);
    const m = (1.07) ** (1 / 12) - 1;
    expect(Math.abs(without - (view.points[360]?.balance ?? 0) - 15_000_000 * (1 + m) ** 300)).toBeLessThan(2_000);
    expect(view.points[360]?.withdrawn).toBe(15_000_000);
  });

  it("measures lost growth to the chosen horizon", () => {
    const at10 = buildScenarioView(withCar, "P", 120).withdrawals[0]?.lostGrowth ?? 0;
    const at30 = buildScenarioView(withCar, "P", 360).withdrawals[0]?.lostGrowth ?? 0;
    expect(at10).toBeGreaterThan(0);
    expect(at30).toBeGreaterThan(at10);
  });

  it("marks a withdrawal after the chosen horizon, costs nothing within it, but keeps it in the projection", () => {
    const view = buildScenarioView(withCar, "P", 48);
    expect(view.withdrawals[0]).toMatchObject({ status: "after-horizon", lostGrowth: 0 });
    expect(view.points[360]?.withdrawn).toBe(15_000_000);
  });

  it("lists a withdrawal before the start but keeps it out of the projection", () => {
    const early: PlanDocument = { ...plan, withdrawals: [{ ...car, date: { year: 2025, month: 6 } }] };
    const view = buildScenarioView(early, "P", HORIZON_30);
    expect(view.withdrawals[0]).toMatchObject({ status: "before-start", lostGrowth: 0, applied: 0 });
    expect(view.withdrawals[0]?.month).toBeLessThan(0);
    expect(view.points[360]?.balance).toBe(buildScenarioView(plan, "P", HORIZON_30).points[360]?.balance);
  });

  it("reports the part of a withdrawal the balance could not cover", () => {
    const big: PlanDocument = { ...plan, startAmount: 1_000_000, monthlyDeposit: 0, withdrawals: [{ ...car, date: plan.start, amount: 5_000_000 }] };
    expect(buildScenarioView(big, "P", HORIZON_30).withdrawals[0]).toMatchObject({ applied: 1_000_000, shortfall: 4_000_000 });
  });

  it("sorts by date, then by id", () => {
    const messy: PlanDocument = {
      ...plan,
      withdrawals: [
        { id: 1, date: { year: 2035, month: 1 }, amount: 100, label: "Late" },
        { id: 2, date: { year: 2030, month: 1 }, amount: 100, label: "Early b" },
        { id: 3, date: { year: 2030, month: 1 }, amount: 100, label: "Early c" },
      ],
    };
    expect(buildScenarioView(messy, "P", HORIZON_30).withdrawals.map((w) => w.id)).toEqual([2, 3, 1]);
  });

  it("the example plan's car purchase is planned, in full, five years in", () => {
    const today = { year: 2026, month: 11 };
    const example = createExamplePlan(today);
    const [w] = buildScenarioView(example, "Example", HORIZON_30).withdrawals;
    expect(w).toMatchObject({ month: 60, label: "New car", applied: 15_000_000, shortfall: 0, status: "planned" });
    expect(example.withdrawals[0]?.date).toEqual(addMonths(today, 60));
  });
});

describe("deposit changes in the view model", () => {
  const exampleLike: PlanDocument = { ...plan, start: { year: 2026, month: 1 } };
  // A 12 month pause: February 2027 is month 13 and January 2028 is month 24.
  const pause = { id: 1, startDate: { year: 2027, month: 2 }, endDate: { year: 2028, month: 1 }, amount: 0, label: "Parental leave" };
  const withPause: PlanDocument = { ...exampleLike, depositChanges: [pause] };

  it("turns dates into months, and no end into null", () => {
    const open = { ...pause, endDate: null };
    expect(toPlanInput({ ...exampleLike, depositChanges: [pause, open] }, 360).depositChanges).toEqual([
      { startMonth: 13, endMonth: 24, amount: 0, label: "Parental leave" },
      { startMonth: 13, endMonth: null, amount: 0, label: "Parental leave" },
    ]);
  });

  it("lowers the end balance by the missed deposits and what they would have earned (about 246 944 kr)", () => {
    const without = buildScenarioView(exampleLike, "P", HORIZON_30).points[360]?.balance ?? 0;
    const paused = buildScenarioView(withPause, "P", HORIZON_30).points[360]?.balance ?? 0;
    const m = 1.07 ** (1 / 12) - 1;
    let missed = 0;
    for (let t = 13; t <= 24; t++) missed += 300_000 * (1 + m) ** (360 - t);
    expect(Math.abs(without - paused - missed)).toBeLessThan(2_000);
    expect(Math.round((without - paused) / 100)).toBeGreaterThan(246_900);
    expect(Math.round((without - paused) / 100)).toBeLessThan(247_000);
  });

  it("describes the change, with its status, for the UI", () => {
    const [c] = buildScenarioView(withPause, "P", HORIZON_30).depositChanges;
    expect(c).toMatchObject({ id: 1, label: "Parental leave", startMonth: 13, endMonth: 24, amount: 0, status: "planned" });
  });

  it("deposits nothing during the pause and the base amount again after it", () => {
    const view = buildScenarioView(withPause, "P", HORIZON_30);
    expect([12, 13, 24, 25].map((month) => depositIn(view, month))).toEqual([300_000, 0, 0, 300_000]);
  });

  it("marks a change that ends before the plan starts, and leaves it out of the projection", () => {
    const old = { ...pause, startDate: { year: 2024, month: 1 }, endDate: { year: 2025, month: 12 } };
    const view = buildScenarioView({ ...exampleLike, depositChanges: [old] }, "P", HORIZON_30);
    expect(view.depositChanges[0]).toMatchObject({ status: "before-start" });
    expect(depositIn(view, 1)).toBe(300_000);
    expect(view.points[360]?.balance).toBe(buildScenarioView(exampleLike, "P", HORIZON_30).points[360]?.balance);
  });

  it("still applies a change that began before the plan and has not ended", () => {
    const old = { ...pause, startDate: { year: 2024, month: 1 }, endDate: null, amount: 100_000 };
    const view = buildScenarioView({ ...exampleLike, startAmount: 0, depositChanges: [old] }, "P", HORIZON_30);
    expect(view.depositChanges[0]).toMatchObject({ status: "planned" });
    expect(view.depositChanges[0]?.startMonth).toBeLessThan(0);
    expect(depositIn(view, 1)).toBe(100_000);
  });

  it("marks a change after the chosen horizon, but keeps it in the projection", () => {
    const late = { ...pause, startDate: { year: 2040, month: 1 }, endDate: null };
    const view = buildScenarioView({ ...exampleLike, depositChanges: [late] }, "P", 120);
    expect(view.depositChanges[0]).toMatchObject({ status: "after-horizon" });
    expect(view.points[360]?.balance).toBeLessThan(buildScenarioView(exampleLike, "P", 120).points[360]?.balance ?? 0);
  });

  it("sorts by start, then by id", () => {
    const view = buildScenarioView(
      {
        ...exampleLike,
        depositChanges: [
          { ...pause, id: 1, startDate: { year: 2035, month: 1 } },
          { ...pause, id: 2, startDate: { year: 2030, month: 1 } },
          { ...pause, id: 3, startDate: { year: 2030, month: 1 } },
        ],
      },
      "P",
      HORIZON_30,
    );
    expect(view.depositChanges.map((c) => c.id)).toEqual([2, 3, 1]);
  });

  it("the example plan has no deposit changes", () => {
    const view = buildScenarioView(createExamplePlan({ year: 2026, month: 11 }), "Example", HORIZON_30);
    expect(view.depositChanges).toEqual([]);
  });

  it("stays exact for the largest allowed plan with the most changes at the largest amount", () => {
    const changes = Array.from({ length: PLAN_LIMITS.maxDepositChanges }, (_, i) => ({
      id: i + 1,
      startDate: { year: 2026, month: 1 },
      endDate: null,
      amount: PLAN_LIMITS.maxMonthlyDeposit,
      label: `c${i}`,
    }));
    const largest: PlanDocument = {
      ...exampleLike,
      startAmount: PLAN_LIMITS.maxStartAmount,
      monthlyDeposit: PLAN_LIMITS.maxMonthlyDeposit,
      annualReturnPct: PLAN_LIMITS.maxReturnPct,
      depositChanges: changes,
    };
    const end = buildScenarioView(largest, "Largest", HORIZON_30).points[360]?.balance ?? 0;
    expect(Number.isSafeInteger(end)).toBe(true);
  });
});

describe("one-time deposits", () => {
  const bonus = { id: 1, date: { year: 2027, month: 1 }, amount: 10_000_000, label: "Bonus" }; // month 12

  it("turns each date into months after the start and leaves out one before the start", () => {
    const withBonus: PlanDocument = { ...plan, oneTimeDeposits: [bonus, { ...bonus, id: 2, date: { year: 2025, month: 12 } }] };
    expect(toPlanInput(withBonus, 360).oneTimeDeposits).toEqual([{ month: 12, amount: 10_000_000, label: "Bonus" }]);
  });

  it("lists them in date order with a status, and raises the end balance as the closed form says", () => {
    const later = { ...bonus, id: 2, date: { year: 2060, month: 1 } };
    const view = buildScenarioView({ ...plan, oneTimeDeposits: [later, bonus, { ...bonus, id: 3, date: { year: 2025, month: 6 } }] }, "P", HORIZON_30);
    expect(view.oneTimeDeposits.map((d) => [d.id, d.status])).toEqual([[3, "before-start"], [1, "planned"], [2, "after-horizon"]]);

    const m = 1.07 ** (1 / 12) - 1;
    const base = buildScenarioView(plan, "P", HORIZON_30).points[360]?.balance ?? 0;
    const withBonus = buildScenarioView({ ...plan, oneTimeDeposits: [bonus] }, "P", HORIZON_30).points[360]?.balance ?? 0;
    expect(Math.abs(withBonus - base - 10_000_000 * (1 + m) ** 348)).toBeLessThanOrEqual(60);
  });

  it("stays exact for the largest allowed plan with the most one-time deposits at the largest amount in month 0", () => {
    const deposits = Array.from({ length: PLAN_LIMITS.maxOneTimeDeposits }, (_, i) => ({
      id: i + 1,
      date: plan.start,
      amount: PLAN_LIMITS.maxOneTimeDepositAmount,
      label: `d${i}`,
    }));
    const changes = Array.from({ length: PLAN_LIMITS.maxDepositChanges }, (_, i) => ({
      id: i + 1,
      startDate: plan.start,
      endDate: null,
      amount: PLAN_LIMITS.maxMonthlyDeposit,
      label: `c${i}`,
    }));
    const largest: PlanDocument = {
      ...plan,
      startAmount: PLAN_LIMITS.maxStartAmount,
      monthlyDeposit: PLAN_LIMITS.maxMonthlyDeposit,
      annualReturnPct: PLAN_LIMITS.maxReturnPct,
      depositChanges: changes,
      oneTimeDeposits: deposits,
    };
    const end = buildScenarioView(largest, "Largest", HORIZON_30).points[360]?.balance ?? 0;
    expect(Number.isSafeInteger(end)).toBe(true);
  });
});
