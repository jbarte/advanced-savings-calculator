import { describe, expect, it } from "vitest";
import { addMonths } from "../core/year-month";
import { PLAN_LIMITS, createBlankPlan, createExamplePlan } from "./plan-document";
import type { PlanDocument } from "./plan-document";
import type { ScenarioView } from "./types";
import { PLAN_SCENARIO_ID, PROJECTION_MONTHS, applyInflationAdjustment, buildScenarioView, createScenarioViewCache, toPlanInput } from "./view-model";

const plan: PlanDocument = {
  version: 4,
  name: null,
  start: { year: 2026, month: 1 },
  startAmount: 5_000_000,
  monthlyDeposit: 300_000,
  annualReturnPct: 7,
  horizonYears: 30,
  inflationPct: 2,
  withdrawals: [],
  depositChanges: [],
  oneTimeDeposits: [],
  goal: null,
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
  it("projects 40 years with one point per month, the longest horizon", () => {
    const view = buildScenarioView(plan, "My plan", HORIZON_30);
    expect(PROJECTION_MONTHS).toBe(480);
    expect(view.points).toHaveLength(481);
    expect(view.points[0]?.month).toBe(0);
  });

  it("carries the plan's own name next to the shown name", () => {
    expect(buildScenarioView(plan, "My plan", HORIZON_30).planName).toBeNull();
    expect(buildScenarioView({ ...plan, name: "House 2031" }, "House 2031", HORIZON_30).planName).toBe("House 2031");
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
    const view = buildScenarioView({ ...largest, horizonYears: PLAN_LIMITS.maxHorizonYears }, "Largest");
    const end = view.points[PROJECTION_MONTHS]?.balance ?? 0;
    expect(view.horizonMonths).toBe(PROJECTION_MONTHS);
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
    const view = buildScenarioView({ ...largest, horizonYears: PLAN_LIMITS.maxHorizonYears }, "Largest");
    const end = view.points[PROJECTION_MONTHS]?.balance ?? 0;
    expect(view.horizonMonths).toBe(PROJECTION_MONTHS);
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
    const view = buildScenarioView({ ...largest, horizonYears: PLAN_LIMITS.maxHorizonYears }, "Largest");
    const end = view.points[PROJECTION_MONTHS]?.balance ?? 0;
    expect(view.horizonMonths).toBe(PROJECTION_MONTHS);
    expect(Number.isSafeInteger(end)).toBe(true);
  });
});

describe("createScenarioViewCache", () => {
  it("returns the same view while the plan, name and horizon stay the same", () => {
    const view = createScenarioViewCache();
    const first = view(1, plan, "P", HORIZON_30);
    expect(view(1, plan, "P", HORIZON_30)).toBe(first);
  });

  it("builds a new view when any of them changes", () => {
    const view = createScenarioViewCache();
    const first = view(1, plan, "P", HORIZON_30);
    expect(view(1, { ...plan }, "P", HORIZON_30)).not.toBe(first);
    expect(view(1, plan, "Q", HORIZON_30)).not.toBe(first);
    expect(view(1, plan, "P", 120)).not.toBe(first);
  });

  it("remembers each plan on its own, so another plan does not push it out", () => {
    const view = createScenarioViewCache();
    const first = view(1, plan, "P", HORIZON_30);
    view(2, { ...plan, monthlyDeposit: 1 }, "Q", HORIZON_30);
    expect(view(1, plan, "P", HORIZON_30)).toBe(first);
    expect(first.id).toBe("1");
  });

  it("gives the same numbers as building the view directly", () => {
    expect(createScenarioViewCache()(7, plan, "P", 120)).toEqual(buildScenarioView(plan, "P", 120, "7"));
  });
});

describe("the horizon in the plan", () => {
  it("is used when no horizon is given, and cuts the effects there", () => {
    const withCar: PlanDocument = { ...plan, withdrawals: [{ id: 1, date: { year: 2031, month: 1 }, amount: 15_000_000, label: "Car" }] };
    const at10 = buildScenarioView({ ...withCar, horizonYears: 10 }, "P");
    expect(at10.horizonMonths).toBe(120);
    expect(at10.withdrawals[0]?.effect).toBe(buildScenarioView(withCar, "P", 120).withdrawals[0]?.effect);
  });

  it("goes up to 40 years", () => {
    const view = buildScenarioView({ ...plan, horizonYears: 40 }, "P");
    expect(view.horizonMonths).toBe(480);
    expect(view.points[480]?.balance).toBeGreaterThan(view.points[360]?.balance ?? 0);
  });
});

describe("applyInflationAdjustment", () => {
  const withEvents: PlanDocument = {
    ...plan,
    withdrawals: [{ id: 1, date: { year: 2031, month: 1 }, amount: 15_000_000, label: "Car" }],
    oneTimeDeposits: [{ id: 1, date: { year: 2031, month: 1 }, amount: 10_000_000, label: "Bonus" }],
  };
  const nominal = buildScenarioView(withEvents, "P");
  const real = applyInflationAdjustment(nominal, 2);

  it("flags the view, and leaves the original alone", () => {
    expect(real.inflationAdjusted).toBe(true);
    expect(nominal.inflationAdjusted).toBe(false);
    expect(nominal.points[360]?.balance).toBeGreaterThan(real.points[360]?.balance ?? 0);
  });

  it("keeps what the user entered in nominal kronor", () => {
    expect(real.startAmount).toBe(nominal.startAmount);
    expect(real.monthlyDeposit).toBe(nominal.monthlyDeposit);
    expect(real.withdrawals[0]?.amount).toBe(15_000_000);
    expect(real.oneTimeDeposits[0]?.amount).toBe(10_000_000);
  });

  it("divides each effect and the total by the price level of the horizon", () => {
    const level = 1.02 ** 30;
    expect(Math.abs((real.withdrawals[0]?.effect ?? 0) - (nominal.withdrawals[0]?.effect ?? 0) / level)).toBeLessThanOrEqual(1);
    expect(Math.abs((real.oneTimeDeposits[0]?.effect ?? 0) - (nominal.oneTimeDeposits[0]?.effect ?? 0) / level)).toBeLessThanOrEqual(1);
    expect(Math.abs(real.totalEffect - nominal.totalEffect / level)).toBeLessThanOrEqual(1);
  });

  it("gives the same signs as the nominal view", () => {
    expect(Math.sign(real.withdrawals[0]?.effect ?? 0)).toBe(-1);
    expect(Math.sign(real.oneTimeDeposits[0]?.effect ?? 0)).toBe(1);
  });

  it("changes nothing at 0 % inflation except the flag", () => {
    expect(applyInflationAdjustment(nominal, 0)).toEqual({ ...nominal, inflationAdjusted: true });
  });
});

describe("the goal in the view", () => {
  const example: PlanDocument = {
    ...plan,
    withdrawals: [{ id: 1, date: { year: 2031, month: 1 }, amount: 15_000_000, label: "Car" }],
  };
  const goalAt = (amount: number, year: number, month: number): PlanDocument => ({ ...example, goal: { amount, date: { year, month } } });

  it("is null without a goal", () => {
    expect(buildScenarioView(example, "P").goal).toBeNull();
  });

  it("describes a goal that is not reached: balance, shortfall, share, and the deposit needed (independent script)", () => {
    const goal = buildScenarioView(goalAt(400_000_000, 2056, 1), "P").goal;
    expect(goal).toMatchObject({
      status: "ok",
      month: 360,
      withinHorizon: true,
      balanceAtGoal: 307_485_573,
      shortfall: 92_514_427,
      percentReached: 76,
      requiredMonthly: 379_110,
      reachedMonth: 401,
    });
  });

  it("describes a goal that is reached: no shortfall, 100 %, and a deposit below today's", () => {
    const goal = buildScenarioView(goalAt(200_000_000, 2056, 1), "P").goal;
    expect(goal).toMatchObject({ shortfall: 0, percentReached: 100, requiredMonthly: 208_089, reachedMonth: 298 });
  });

  it("measures from the plan start and keeps the date after the horizon outside the chart", () => {
    const goal = buildScenarioView({ ...goalAt(100_000_000, 2036, 1), horizonYears: 5 }, "P").goal;
    expect(goal).toMatchObject({ status: "ok", month: 120, balanceAtGoal: 40_113_003, percentReached: 40, requiredMonthly: 650_111, withinHorizon: false });
  });

  it("has no numbers for a goal before the plan start or after the 40-year projection, only where it falls", () => {
    const before = buildScenarioView(goalAt(100_000_000, 2025, 6), "P").goal;
    expect(before).toMatchObject({ status: "before-start", month: -7, requiredMonthly: null, reachedMonth: null, balanceAtGoal: 0, withinHorizon: false });
    const after = buildScenarioView(goalAt(100_000_000, 2067, 1), "P").goal;
    expect(after).toMatchObject({ status: "after-projection", requiredMonthly: null, balanceAtGoal: 0 });
  });

  it("says when the goal can't be reached even with the largest deposit", () => {
    // 100 000 000 kr after one month: one deposit of at most 10 000 000 kr can never get there.
    const goal = buildScenarioView({ ...goalAt(PLAN_LIMITS.maxGoalAmount, 2026, 2), startAmount: 0 }, "P").goal;
    expect(goal).toMatchObject({ status: "ok", month: 1, requiredMonthly: null });
    expect(goal?.shortfall).toBeGreaterThan(0);
    // A year out it is reachable: about 8 077 350 kr a month (100 000 000 kr / the 7 % annuity factor of about 12,4).
    const reachable = buildScenarioView({ ...goalAt(PLAN_LIMITS.maxGoalAmount, 2027, 1), startAmount: 0, withdrawals: [] }, "P").goal;
    expect(reachable?.requiredMonthly).toBeGreaterThan(800_000_000);
    expect(reachable?.requiredMonthly).toBeLessThan(PLAN_LIMITS.maxMonthlyDeposit);
  });

  it("gives the goal amount divided by the price level at the goal date, and keeps it unchanged by the inflation switch", () => {
    const nominal = buildScenarioView(goalAt(400_000_000, 2056, 1), "P");
    expect(nominal.goal?.targetInflationAdjusted).toBe(220_828_356);
    expect(applyInflationAdjustment(nominal, 2).goal).toEqual(nominal.goal);
  });

  it("keeps working at the largest plan: the solver stays exact and finishes", () => {
    const big: PlanDocument = {
      ...plan,
      startAmount: PLAN_LIMITS.maxStartAmount,
      monthlyDeposit: PLAN_LIMITS.maxMonthlyDeposit,
      annualReturnPct: PLAN_LIMITS.maxReturnPct,
      horizonYears: PLAN_LIMITS.maxHorizonYears,
      goal: { amount: PLAN_LIMITS.maxGoalAmount, date: { year: 2066, month: 1 } },
    };
    const goal = buildScenarioView(big, "Big").goal;
    expect(goal?.status).toBe("ok");
    expect(goal?.requiredMonthly).toBe(0);
  });
});

