import { describe, expect, it } from "vitest";
import { eventEffect, lostGrowthOf, totalEffect, withoutEvent } from "./event-effect";
import type { EventRef } from "./event-effect";
import { monthlyRate } from "./money";
import { project } from "./project";
import type { PlanInput } from "./types";

const base: PlanInput = {
  start: { year: 2026, month: 1 },
  startAmount: 5_000_000,
  monthlyDeposit: 300_000,
  annualReturnPct: 7,
  withdrawals: [{ month: 60, amount: 15_000_000, label: "Car" }],
  depositChanges: [],
  oneTimeDeposits: [],
  months: 360,
};

const CAR: EventRef = { list: "withdrawals", index: 0 };
const growthFactor = (months: number, pct = 7): number => (1 + monthlyRate(pct)) ** months;
const TOLERANCE_ORE = 2_000; // monthly rounding to whole öre in two projections

/** The effect with the balance-with taken from a full projection, as the view model does it. */
function effect(plan: PlanInput, ref: EventRef, horizon: number): number {
  return eventEffect(plan, ref, horizon, project(plan).points[horizon]?.balance ?? 0);
}

describe("withoutEvent", () => {
  it("leaves out exactly one event and keeps the rest", () => {
    const plan: PlanInput = {
      ...base,
      withdrawals: [base.withdrawals[0] ?? { month: 0, amount: 1, label: "x" }, { month: 90, amount: 1, label: "Boat" }],
      oneTimeDeposits: [{ month: 12, amount: 5, label: "Bonus" }],
    };
    expect(withoutEvent(plan, { list: "withdrawals", index: 0 }).withdrawals.map((w) => w.label)).toEqual(["Boat"]);
    expect(withoutEvent(plan, { list: "oneTimeDeposits", index: 0 }).oneTimeDeposits).toEqual([]);
    expect(withoutEvent(plan, { list: "oneTimeDeposits", index: 0 }).withdrawals).toHaveLength(2);
  });

  it("rejects a position that has no event", () => {
    expect(() => withoutEvent(base, { list: "withdrawals", index: 3 })).toThrow(RangeError);
    expect(() => withoutEvent(base, { list: "depositChanges", index: 0 })).toThrow(RangeError);
    expect(() => withoutEvent(base, { list: "withdrawals", index: -1 })).toThrow(RangeError);
  });
});

describe("eventEffect of a withdrawal", () => {
  it("is the amount plus the growth it would have earned, as a loss", () => {
    const expected = -15_000_000 * growthFactor(300);
    expect(Math.abs(effect(base, CAR, 360) - expected)).toBeLessThan(TOLERANCE_ORE);
  });

  it("depends on the horizon", () => {
    expect(Math.abs(effect(base, CAR, 120) - -15_000_000 * growthFactor(60))).toBeLessThan(TOLERANCE_ORE);
  });

  it("is 0 for a withdrawal after the horizon", () => {
    expect(effect(base, CAR, 48)).toBe(0);
  });

  it("is just the amount in the last month of the horizon, which has no time to grow", () => {
    expect(effect(base, CAR, 60)).toBe(-15_000_000);
  });

  it("counts only what was actually withdrawn when the withdrawal was capped", () => {
    const capped: PlanInput = { ...base, startAmount: 1_000_000, monthlyDeposit: 0, withdrawals: [{ month: 0, amount: 5_000_000, label: "Too big" }] };
    expect(Math.abs(effect(capped, CAR, 120) - -1_000_000 * growthFactor(120))).toBeLessThan(TOLERANCE_ORE);
  });

  it("is 0 at a 0 % return when nothing was withdrawn", () => {
    const empty: PlanInput = { ...base, startAmount: 0, monthlyDeposit: 0, annualReturnPct: 0 };
    expect(effect(empty, CAR, 360)).toBe(0);
  });
});

describe("eventEffect of deposits", () => {
  it("a one-time deposit adds the amount and its growth", () => {
    const plan: PlanInput = { ...base, oneTimeDeposits: [{ month: 24, amount: 10_000_000, label: "Bonus" }] };
    const expected = 10_000_000 * growthFactor(336);
    expect(Math.abs(effect(plan, { list: "oneTimeDeposits", index: 0 }, 360) - expected)).toBeLessThan(TOLERANCE_ORE);
  });

  it("a 12-month pause costs the missed deposits and their growth", () => {
    const plan: PlanInput = { ...base, withdrawals: [], depositChanges: [{ startMonth: 13, endMonth: 24, amount: 0, label: "Pause" }] };
    let missed = 0;
    for (let month = 13; month <= 24; month++) missed += 300_000 * growthFactor(360 - month);
    expect(Math.abs(effect(plan, { list: "depositChanges", index: 0 }, 360) - -missed)).toBeLessThan(TOLERANCE_ORE);
  });

  it("a raise is a gain, and a change after the horizon has no effect within it", () => {
    const plan: PlanInput = { ...base, withdrawals: [], depositChanges: [{ startMonth: 200, endMonth: null, amount: 500_000, label: "Raise" }] };
    expect(effect(plan, { list: "depositChanges", index: 0 }, 360)).toBeGreaterThan(0);
    expect(effect(plan, { list: "depositChanges", index: 0 }, 120)).toBe(0);
  });
});

describe("totalEffect", () => {
  it("is 0 without events", () => {
    const plan: PlanInput = { ...base, withdrawals: [] };
    expect(totalEffect(plan, 360, project(plan).points[360]?.balance ?? 0)).toBe(0);
  });

  it("compares with the same plan without any events", () => {
    const plan: PlanInput = { ...base, oneTimeDeposits: [{ month: 24, amount: 10_000_000, label: "Bonus" }] };
    const balanceWith = project(plan).points[360]?.balance ?? 0;
    const balanceWithout = project({ ...plan, withdrawals: [], oneTimeDeposits: [] }).points[360]?.balance ?? 0;
    expect(totalEffect(plan, 360, balanceWith)).toBe(balanceWith - balanceWithout);
  });
});

describe("lostGrowthOf", () => {
  it("is the loss beyond the amount withdrawn, never below 0", () => {
    expect(lostGrowthOf(-81_411_474, 15_000_000)).toBe(66_411_474);
    expect(lostGrowthOf(-15_000_000, 15_000_000)).toBe(0);
    expect(lostGrowthOf(-100, 600)).toBe(0); // a later withdrawal got capped differently
  });

  it("matches the closed form for the car", () => {
    const lost = lostGrowthOf(effect(base, CAR, 360), 15_000_000);
    expect(Math.abs(lost - 15_000_000 * (growthFactor(300) - 1))).toBeLessThan(TOLERANCE_ORE);
  });
});
