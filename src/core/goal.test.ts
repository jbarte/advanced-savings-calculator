import { describe, expect, it } from "vitest";
import { balanceAtMonth, firstMonthAtLeast, requiredMonthlyDeposit } from "./goal";
import { project } from "./project";
import type { PlanInput } from "./types";

/** The example plan: 50 000 kr start, 3 000 kr a month, 7 %, a 150 000 kr car after five years. */
const example: PlanInput = {
  start: { year: 2026, month: 1 },
  startAmount: 5_000_000,
  monthlyDeposit: 300_000,
  annualReturnPct: 7,
  withdrawals: [{ month: 60, amount: 15_000_000, label: "Car" }],
  depositChanges: [],
  oneTimeDeposits: [],
  months: 360,
};

const MAX_DEPOSIT = 1_000_000_000;
const need = (plan: PlanInput, target: number, month: number, max = MAX_DEPOSIT): number | null =>
  requiredMonthlyDeposit(plan, { target, month }, max);

describe("requiredMonthlyDeposit", () => {
  it("finds the smallest whole-öre deposit that reaches the goal (values from an independent script)", () => {
    expect(need(example, 400_000_000, 360)).toBe(379_110); // 4 000 000 kr in 30 years: 3 791,10 kr a month
    expect(need(example, 100_000_000, 120)).toBe(650_111);
    expect(need(example, 200_000_000, 360)).toBe(208_089);
  });

  it("is exactly the smallest: one öre less falls short", () => {
    for (const [target, month] of [[400_000_000, 360], [100_000_000, 120], [123_456_789, 200]] as const) {
      const deposit = need(example, target, month) ?? -1;
      expect(balanceAtMonth({ ...example, monthlyDeposit: deposit }, month)).toBeGreaterThanOrEqual(target);
      expect(balanceAtMonth({ ...example, monthlyDeposit: deposit - 1 }, month)).toBeLessThan(target);
    }
  });

  it("is 0 when the start amount alone already reaches the goal, and for a goal of 0", () => {
    const rich: PlanInput = { ...example, startAmount: 90_000_000, withdrawals: [] };
    expect(need(rich, 100_000_000, 360)).toBe(0);
    expect(need(example, 0, 360)).toBe(0);
  });

  it("is null when even the largest allowed deposit is not enough", () => {
    expect(need(example, 400_000_000, 360, 1_000)).toBeNull();
  });

  it("keeps the planned events: a withdrawal raises the deposit needed", () => {
    const withoutCar: PlanInput = { ...example, withdrawals: [] };
    expect(need(example, 400_000_000, 360) ?? 0).toBeGreaterThan(need(withoutCar, 400_000_000, 360) ?? Infinity);
  });

  it("keeps deposit changes as they are: a pause stays a pause, and an endless pause leaves nothing to solve", () => {
    const paused: PlanInput = { ...example, withdrawals: [], depositChanges: [{ startMonth: 1, endMonth: null, amount: 0, label: "Pause" }] };
    expect(need(paused, 400_000_000, 360)).toBeNull();
    expect(need(paused, 5_000_000, 360)).toBe(0);
    const shortPause: PlanInput = { ...example, depositChanges: [{ startMonth: 13, endMonth: 24, amount: 0, label: "Pause" }] };
    expect(need(shortPause, 400_000_000, 360) ?? 0).toBeGreaterThan(need(example, 400_000_000, 360) ?? Infinity);
  });

  it("works for a goal month beyond the plan's own length, and in month 0", () => {
    expect(need({ ...example, months: 12 }, 400_000_000, 360)).toBe(379_110);
    expect(need(example, 5_000_000, 0)).toBe(0);
    expect(need(example, 5_000_001, 0)).toBeNull();
  });

  it("rejects a negative or fractional month, and a target that is not a whole number of öre", () => {
    expect(() => need(example, 1_000, -1)).toThrow(RangeError);
    expect(() => need(example, 1_000, 1.5)).toThrow(RangeError);
    expect(() => need(example, -5, 12)).toThrow(RangeError);
    expect(() => need(example, 1.5, 12)).toThrow(RangeError);
  });
});

describe("balanceAtMonth", () => {
  it("is the projection's balance in that month, whatever the plan's own length", () => {
    expect(balanceAtMonth(example, 120)).toBe(project(example).points[120]?.balance);
    expect(balanceAtMonth({ ...example, months: 12 }, 120)).toBe(project(example).points[120]?.balance);
  });
});

describe("firstMonthAtLeast", () => {
  const points = project(example).points;

  it("finds the first month the balance reaches the target (209 for 1 000 000 kr, from the independent script)", () => {
    expect(firstMonthAtLeast(points, 100_000_000)).toBe(209);
  });

  it("is month 0 when the start amount is enough, and null when it is never reached", () => {
    expect(firstMonthAtLeast(points, 5_000_000)).toBe(0);
    expect(firstMonthAtLeast(points, 9_000_000_000)).toBeNull();
  });

  it("counts a balance exactly on the target", () => {
    const month = firstMonthAtLeast(points, 100_000_000) ?? -1;
    expect(points[month]?.balance).toBeGreaterThanOrEqual(100_000_000);
    expect(points[month - 1]?.balance).toBeLessThan(100_000_000);
  });
});
