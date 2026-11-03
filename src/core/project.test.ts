import { describe, expect, it } from "vitest";
import { project } from "./project";
import type { PlanInput } from "./types";

const base: PlanInput = {
  start: { year: 2026, month: 1 },
  startAmount: 10_000_000,
  monthlyDeposit: 0,
  annualReturnPct: 0,
  withdrawals: [],
  months: 12,
};

const plan = (overrides: Partial<PlanInput>): PlanInput => ({ ...base, ...overrides });

describe("project", () => {
  it("returns one point per month, from month 0 to the last month", () => {
    const { points } = project(plan({ months: 360 }));
    expect(points).toHaveLength(361);
    expect(points[0]?.month).toBe(0);
    expect(points[360]?.month).toBe(360);
  });

  it("month 0 holds only the start amount", () => {
    const first = project(plan({ monthlyDeposit: 300_000, annualReturnPct: 7 })).points[0];
    expect(first).toEqual({ month: 0, balance: 10_000_000, deposited: 10_000_000, withdrawn: 0, growth: 0 });
  });

  it("grows linearly with deposits when the return is zero", () => {
    const { points } = project(plan({ monthlyDeposit: 300_000 }));
    expect(points[1]?.balance).toBe(10_300_000);
    expect(points[12]?.balance).toBe(10_000_000 + 12 * 300_000);
    expect(points[12]?.growth).toBe(0);
  });

  it("adds the deposit after growth in the same month", () => {
    const rate = (1.07) ** (1 / 12) - 1;
    const month1 = project(plan({ monthlyDeposit: 300_000, annualReturnPct: 7 })).points[1];
    expect(month1?.balance).toBe(Math.round(10_000_000 * (1 + rate)) + 300_000);
  });

  it("compounds to the yearly return over 12 months", () => {
    const end = project(plan({ annualReturnPct: 7 })).points[12];
    expect(Math.abs((end?.balance ?? 0) - 10_700_000)).toBeLessThanOrEqual(6);
  });

  it("handles a -100 % return: growth wipes the balance, deposits remain", () => {
    const { points } = project(plan({ annualReturnPct: -100, monthlyDeposit: 100_000 }));
    expect(points[1]?.balance).toBe(100_000);
    expect(points[2]?.balance).toBe(100_000);
  });

  describe("withdrawals", () => {
    it("takes a withdrawal out after growth and deposit in its month", () => {
      const { points, withdrawals } = project(
        plan({ monthlyDeposit: 100_000, withdrawals: [{ month: 3, amount: 2_000_000, label: "Car" }] }),
      );
      expect(points[2]?.balance).toBe(10_200_000);
      expect(points[3]?.balance).toBe(10_300_000 - 2_000_000);
      expect(points[3]?.withdrawn).toBe(2_000_000);
      expect(withdrawals).toEqual([{ month: 3, requested: 2_000_000, applied: 2_000_000, shortfall: 0 }]);
    });

    it("allows a withdrawal in month 0", () => {
      const { points } = project(plan({ withdrawals: [{ month: 0, amount: 1_000_000, label: "Now" }] }));
      expect(points[0]?.balance).toBe(9_000_000);
      expect(points[0]?.withdrawn).toBe(1_000_000);
    });

    it("caps a withdrawal at the balance and reports the shortfall", () => {
      const { points, withdrawals } = project(plan({ withdrawals: [{ month: 2, amount: 15_000_000, label: "Too big" }] }));
      expect(points[2]?.balance).toBe(0);
      expect(points[2]?.withdrawn).toBe(10_000_000);
      expect(withdrawals).toEqual([{ month: 2, requested: 15_000_000, applied: 10_000_000, shortfall: 5_000_000 }]);
    });

    it("applies several withdrawals in one month in order, each capped by what is left", () => {
      const { withdrawals } = project(
        plan({
          withdrawals: [
            { month: 1, amount: 7_000_000, label: "A" },
            { month: 1, amount: 7_000_000, label: "B" },
          ],
        }),
      );
      expect(withdrawals.map((w) => [w.applied, w.shortfall])).toEqual([
        [7_000_000, 0],
        [3_000_000, 4_000_000],
      ]);
    });

    it("ignores a withdrawal after the last month", () => {
      const { points, withdrawals } = project(plan({ withdrawals: [{ month: 13, amount: 1_000_000, label: "Later" }] }));
      expect(points[12]?.withdrawn).toBe(0);
      expect(withdrawals).toEqual([]);
    });

    it("keeps growing after a withdrawal on the smaller balance", () => {
      const without = project(plan({ annualReturnPct: 7 })).points[12]?.balance ?? 0;
      const withWd = project(
        plan({ annualReturnPct: 7, withdrawals: [{ month: 1, amount: 5_000_000, label: "Half" }] }),
      ).points[12]?.balance ?? 0;
      expect(withWd).toBeLessThan(without - 5_000_000);
    });
  });

  it("keeps balance = deposited - withdrawn + growth, in whole öre, on every point", () => {
    const { points } = project(
      plan({
        months: 360,
        startAmount: 5_000_000,
        monthlyDeposit: 300_000,
        annualReturnPct: 7,
        withdrawals: [
          { month: 63, amount: 30_000_000, label: "House" },
          { month: 153, amount: 15_000_000, label: "Car" },
        ],
      }),
    );
    for (const p of points) {
      expect(Number.isInteger(p.balance)).toBe(true);
      expect(p.balance).toBe(p.deposited - p.withdrawn + p.growth);
    }
  });

  describe("invalid input", () => {
    it("rejects a withdrawal before the start", () => {
      expect(() => project(plan({ withdrawals: [{ month: -1, amount: 1, label: "Past" }] }))).toThrow(RangeError);
    });

    it.each([
      ["start amount", { startAmount: -1 }],
      ["start amount fraction", { startAmount: 10.5 }],
      ["monthly deposit", { monthlyDeposit: -1 }],
      ["months", { months: -1 }],
      ["months fraction", { months: 1.5 }],
      ["withdrawal amount", { withdrawals: [{ month: 1, amount: -5, label: "Neg" }] }],
    ])("rejects a bad %s", (_name, overrides) => {
      expect(() => project(plan(overrides))).toThrow(RangeError);
    });

    it("rejects a return below -100 %", () => {
      expect(() => project(plan({ annualReturnPct: -101 }))).toThrow(RangeError);
    });

    it("throws instead of losing precision when the balance gets too large", () => {
      expect(() =>
        project(plan({ startAmount: 1_000_000_000_000_000, annualReturnPct: 50, months: 360 })),
      ).toThrow(RangeError);
    });
  });
});
