import { describe, expect, it } from "vitest";
import { lostGrowth } from "./lost-growth";
import { monthlyRate } from "./money";
import type { PlanInput } from "./types";

const base: PlanInput = {
  start: { year: 2026, month: 1 },
  startAmount: 5_000_000,
  monthlyDeposit: 300_000,
  annualReturnPct: 7,
  withdrawals: [{ month: 60, amount: 15_000_000, label: "Car" }],
  depositChanges: [],
  months: 360,
};

/** What the withdrawn money would have earned if it had stayed in, by closed form. */
function expectedLostGrowth(amount: number, withdrawalMonth: number, horizonMonths: number, pct = 7): number {
  return amount * ((1 + monthlyRate(pct)) ** (horizonMonths - withdrawalMonth) - 1);
}

const TOLERANCE_ORE = 2_000; // monthly rounding to whole öre in two projections

describe("lostGrowth", () => {
  it("is 0 when the return is 0", () => {
    expect(lostGrowth({ ...base, annualReturnPct: 0 }, 0, 360)).toBe(0);
  });

  it("matches the growth the withdrawn money would have earned", () => {
    const lost = lostGrowth(base, 0, 360);
    expect(Math.abs(lost - expectedLostGrowth(15_000_000, 60, 360))).toBeLessThan(TOLERANCE_ORE);
    expect(lost / 100).toBeGreaterThan(660_000); // about 664 000 kr
  });

  it("depends on the horizon", () => {
    const at10 = lostGrowth(base, 0, 120);
    const at20 = lostGrowth(base, 0, 240);
    expect(Math.abs(at10 - expectedLostGrowth(15_000_000, 60, 120))).toBeLessThan(TOLERANCE_ORE);
    expect(at20).toBeGreaterThan(at10);
  });

  it("is 0 for a withdrawal after the horizon", () => {
    expect(lostGrowth(base, 0, 48)).toBe(0);
  });

  it("is 0 for a withdrawal in the last month of the horizon, which has no time to grow", () => {
    expect(lostGrowth(base, 0, 60)).toBe(0);
  });

  it("uses the amount actually withdrawn when the withdrawal is capped", () => {
    const capped: PlanInput = {
      ...base,
      startAmount: 1_000_000,
      monthlyDeposit: 0,
      withdrawals: [{ month: 0, amount: 5_000_000, label: "Too big" }],
    };
    expect(Math.abs(lostGrowth(capped, 0, 120) - expectedLostGrowth(1_000_000, 0, 120))).toBeLessThan(TOLERANCE_ORE);
  });

  it("reports each withdrawal separately", () => {
    const two: PlanInput = {
      ...base,
      withdrawals: [
        { month: 60, amount: 15_000_000, label: "Car" },
        { month: 150, amount: 20_000_000, label: "Boat" },
      ],
    };
    expect(Math.abs(lostGrowth(two, 0, 360) - expectedLostGrowth(15_000_000, 60, 360))).toBeLessThan(TOLERANCE_ORE);
    expect(Math.abs(lostGrowth(two, 1, 360) - expectedLostGrowth(20_000_000, 150, 360))).toBeLessThan(TOLERANCE_ORE);
  });

  it("never goes below 0, even when removing a withdrawal changes how a later one is capped", () => {
    const squeezed: PlanInput = {
      ...base,
      startAmount: 1_000_000,
      monthlyDeposit: 0,
      annualReturnPct: 0,
      withdrawals: [
        { month: 1, amount: 600_000, label: "A" },
        { month: 2, amount: 600_000, label: "B" },
      ],
    };
    expect(lostGrowth(squeezed, 0, 12)).toBe(0);
  });

  it("is not affected by deposit changes, which do not depend on the withdrawal", () => {
    const paused: PlanInput = { ...base, depositChanges: [{ startMonth: 13, endMonth: 24, amount: 0, label: "Pause" }] };
    expect(Math.abs(lostGrowth(paused, 0, 360) - expectedLostGrowth(15_000_000, 60, 360))).toBeLessThan(TOLERANCE_ORE);
  });

  it("rejects a position that has no withdrawal", () => {
    expect(() => lostGrowth(base, 3, 360)).toThrow(RangeError);
    expect(() => lostGrowth(base, -1, 360)).toThrow(RangeError);
  });
});
