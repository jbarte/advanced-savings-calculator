import { describe, expect, it } from "vitest";
import { toInflationAdjusted, inflationAdjustedPoints, priceLevel } from "./inflation-adjusted";
import { project } from "./project";
import type { PlanInput } from "./types";

const plan: PlanInput = {
  start: { year: 2026, month: 1 },
  startAmount: 5_000_000,
  monthlyDeposit: 300_000,
  annualReturnPct: 7,
  withdrawals: [{ month: 60, amount: 15_000_000, label: "Car" }],
  depositChanges: [],
  oneTimeDeposits: [],
  months: 360,
};

describe("priceLevel", () => {
  it("is 1 at month 0 and grows by the effective yearly rate, not rate / 12", () => {
    expect(priceLevel(0, 2)).toBe(1);
    expect(priceLevel(12, 2)).toBeCloseTo(1.02, 12);
    expect(priceLevel(360, 2)).toBeCloseTo(1.02 ** 30, 9);
  });

  it("is 1 with no inflation, and falls with deflation", () => {
    expect(priceLevel(240, 0)).toBe(1);
    expect(priceLevel(12, -5)).toBeCloseTo(0.95, 12);
  });
});

describe("toInflationAdjusted", () => {
  it("divides by the price level and rounds to whole öre", () => {
    expect(toInflationAdjusted(102_000, 12, 2)).toBe(100_000);
    expect(toInflationAdjusted(100_000, 0, 2)).toBe(100_000);
    expect(toInflationAdjusted(-102_000, 12, 2)).toBe(-100_000);
  });
});

describe("inflationAdjustedPoints", () => {
  const points = project(plan).points;

  it("changes nothing when inflation is 0", () => {
    expect(inflationAdjustedPoints(points, 0)).toEqual(points);
  });

  it("leaves month 0 as it is", () => {
    expect(inflationAdjustedPoints(points, 2)[0]).toEqual(points[0]);
  });

  it("deflates each month's balance by that month's price level", () => {
    const real = inflationAdjustedPoints(points, 2);
    for (const month of [1, 60, 181, 360]) {
      expect(real[month]?.balance).toBe(toInflationAdjusted(points[month]?.balance ?? 0, month, 2));
    }
  });

  it("deflates every deposit and withdrawal by its own month, not the total by the last month", () => {
    const end = inflationAdjustedPoints(points, 2)[360];
    // 50 000 kr at month 0, then 3 000 kr a month for 360 months, each divided by its own month's price level.
    let deposited = 5_000_000;
    for (let month = 1; month <= 360; month++) deposited += 300_000 / 1.02 ** (month / 12);
    expect(Math.abs((end?.deposited ?? 0) - deposited)).toBeLessThanOrEqual(1);
    // The car is capped at the balance, so what was taken out is read from the projection; it happened in month 60.
    expect(end?.withdrawn).toBe(toInflationAdjusted(points[60]?.withdrawn ?? 0, 60, 2));
    expect(end?.withdrawn).toBeLessThan(points[360]?.withdrawn ?? 0);
  });

  it("keeps growth = balance + withdrawn - deposited in every month", () => {
    for (const point of inflationAdjustedPoints(points, 2)) {
      expect(point.growth).toBe(point.balance + point.withdrawn - point.deposited);
    }
  });

  it("is independent of the plan: no events means deposited stays the start amount plus deflated deposits", () => {
    const flat = project({ ...plan, withdrawals: [], annualReturnPct: 0, monthlyDeposit: 0 }).points;
    const real = inflationAdjustedPoints(flat, 3);
    expect(real[360]?.deposited).toBe(5_000_000);
    expect(real[360]?.balance).toBe(toInflationAdjusted(5_000_000, 360, 3));
  });
});
