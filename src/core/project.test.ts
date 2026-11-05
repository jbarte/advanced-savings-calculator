import { describe, expect, it } from "vitest";
import { project } from "./project";
import type { PlanInput } from "./types";

const base: PlanInput = {
  start: { year: 2026, month: 1 },
  startAmount: 10_000_000,
  monthlyDeposit: 0,
  annualReturnPct: 0,
  withdrawals: [],
  depositChanges: [],
  oneTimeDeposits: [],
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
      expect(withdrawals).toEqual([{ index: 0, month: 3, requested: 2_000_000, applied: 2_000_000, shortfall: 0 }]);
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
      expect(withdrawals).toEqual([{ index: 0, month: 2, requested: 15_000_000, applied: 10_000_000, shortfall: 5_000_000 }]);
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

    it("reports the position of each withdrawal in the input, even when the list is not in date order", () => {
      const { withdrawals } = project(
        plan({
          withdrawals: [
            { month: 5, amount: 1_000_000, label: "Later" },
            { month: 2, amount: 1_000_000, label: "Earlier" },
          ],
        }),
      );
      expect(withdrawals.map((w) => [w.index, w.month])).toEqual([
        [1, 2],
        [0, 5],
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

  describe("deposit changes", () => {
    const longPlan = (overrides: Partial<PlanInput>): PlanInput => plan({ months: 360, ...overrides });
    const endOf = (p: PlanInput): number => project(p).points[p.months]?.balance ?? Number.NaN;

    it("a 12 month pause lowers the end balance by exactly the missed deposits (0 % return)", () => {
      const common = { startAmount: 10_000_000, monthlyDeposit: 300_000 };
      expect(endOf(longPlan(common))).toBe(118_000_000); // 100 000 + 360 × 3 000 kr
      const paused = longPlan({ ...common, depositChanges: [{ startMonth: 13, endMonth: 24, amount: 0, label: "Pause" }] });
      expect(endOf(paused)).toBe(114_400_000); // 36 000 kr less
      expect(project(paused).points[360]?.deposited).toBe(114_400_000);
    });

    it("a 12 month pause costs the missed deposits plus what they would have earned (7 % return)", () => {
      const common = { startAmount: 5_000_000, monthlyDeposit: 300_000, annualReturnPct: 7 };
      const paused = longPlan({ ...common, depositChanges: [{ startMonth: 13, endMonth: 24, amount: 0, label: "Pause" }] });
      const m = 1.07 ** (1 / 12) - 1;
      let missed = 0;
      for (let t = 13; t <= 24; t++) missed += 300_000 * (1 + m) ** (360 - t); // computed without the engine
      expect(Math.abs(endOf(longPlan(common)) - endOf(paused) - missed)).toBeLessThan(2_000);
      expect(Math.round(missed / 100)).toBe(246_944);
    });

    it("goes back to an open-ended change when a period inside it ends (0 % return)", () => {
      const p = longPlan({
        startAmount: 0,
        monthlyDeposit: 300_000,
        depositChanges: [
          { startMonth: 12, endMonth: null, amount: 500_000, label: "Raise" },
          { startMonth: 24, endMonth: 35, amount: 0, label: "Pause" },
        ],
      });
      const { points } = project(p);
      expect(points[35]?.balance).toBe(9_300_000); // 11 × 3 000 + 12 × 5 000 kr
      expect(points[36]?.balance).toBe(9_800_000); // back to 5 000 kr
      expect(points[360]?.balance).toBe(171_800_000);
    });

    it("lets the later change win when two start in the same month, and follows the list order", () => {
      const a = { startMonth: 6, endMonth: null, amount: 200_000, label: "A" };
      const b = { startMonth: 6, endMonth: null, amount: 300_000, label: "B" };
      const common = { startAmount: 0, monthlyDeposit: 100_000, months: 6 };
      expect(project(plan({ ...common, depositChanges: [a, b] })).points[6]?.balance).toBe(5 * 100_000 + 300_000);
      expect(project(plan({ ...common, depositChanges: [b, a] })).points[6]?.balance).toBe(5 * 100_000 + 200_000);
    });

    it("a change in month 0 first takes effect in month 1", () => {
      const p = plan({
        startAmount: 100_000,
        monthlyDeposit: 100_000,
        months: 3,
        depositChanges: [{ startMonth: 0, endMonth: null, amount: 50_000, label: "Lower" }],
      });
      const { points } = project(p);
      expect(points[0]?.balance).toBe(100_000);
      expect(points[3]?.balance).toBe(100_000 + 3 * 50_000);
    });

    it("applies a change that started before the plan from the first month", () => {
      const p = plan({ startAmount: 0, monthlyDeposit: 100_000, months: 2, depositChanges: [{ startMonth: -5, endMonth: null, amount: 200_000, label: "Old" }] });
      expect(project(p).points[1]?.balance).toBe(200_000);
    });

    it("ignores a change that ends before it starts", () => {
      const withBad = plan({ months: 24, monthlyDeposit: 100_000, depositChanges: [{ startMonth: 10, endMonth: 5, amount: 0, label: "Backwards" }] });
      expect(project(withBad).points).toEqual(project(plan({ months: 24, monthlyDeposit: 100_000 })).points);
    });

    it("ignores a change that starts after the last month", () => {
      const late = plan({ months: 12, monthlyDeposit: 100_000, depositChanges: [{ startMonth: 40, endMonth: null, amount: 0, label: "Late" }] });
      expect(project(late).points).toEqual(project(plan({ months: 12, monthlyDeposit: 100_000 })).points);
    });

    it("rejects an invalid change", () => {
      const withChange = (c: Partial<PlanInput["depositChanges"][number]>): PlanInput =>
        plan({ depositChanges: [{ startMonth: 1, endMonth: null, amount: 0, label: "x", ...c }] });
      expect(() => project(withChange({ amount: -1 }))).toThrow(RangeError);
      expect(() => project(withChange({ amount: 1.5 }))).toThrow(RangeError);
      expect(() => project(withChange({ startMonth: 1.5 }))).toThrow(RangeError);
      expect(() => project(withChange({ endMonth: 2.5 }))).toThrow(RangeError);
    });

    it("keeps balance = deposited - withdrawn + growth with changes and withdrawals together", () => {
      const p = longPlan({
        startAmount: 5_000_000,
        monthlyDeposit: 300_000,
        annualReturnPct: 7,
        withdrawals: [{ month: 60, amount: 15_000_000, label: "Car" }],
        depositChanges: [
          { startMonth: 13, endMonth: 24, amount: 0, label: "Pause" },
          { startMonth: 100, endMonth: null, amount: 450_000, label: "Raise" },
        ],
      });
      for (const point of project(p).points) expect(point.balance).toBe(point.deposited - point.withdrawn + point.growth);
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

describe("project: one-time deposits", () => {
  it("adds the amount in its month and counts it as deposited", () => {
    const { points } = project(plan({ oneTimeDeposits: [{ month: 3, amount: 500_000, label: "Bonus" }] }));
    expect(points[2]?.balance).toBe(10_000_000);
    expect(points[3]).toMatchObject({ balance: 10_500_000, deposited: 10_500_000, growth: 0 });
    expect(points[12]?.balance).toBe(10_500_000);
  });

  it("is added after growth and the monthly deposit, so it earns nothing in its own month", () => {
    const rate = 1.07 ** (1 / 12) - 1;
    const month1 = project(
      plan({ monthlyDeposit: 300_000, annualReturnPct: 7, oneTimeDeposits: [{ month: 1, amount: 500_000, label: "Bonus" }] }),
    ).points[1];
    expect(month1?.balance).toBe(Math.round(10_000_000 * (1 + rate)) + 300_000 + 500_000);
  });

  it("matches the closed form: the deposit grows for the months after its own", () => {
    const m = 1.07 ** (1 / 12) - 1;
    const end = project(plan({ startAmount: 0, annualReturnPct: 7, months: 60, oneTimeDeposits: [{ month: 24, amount: 10_000_000, label: "Gift" }] }))
      .points[60];
    const expected = 10_000_000 * (1 + m) ** 36;
    expect(Math.abs((end?.balance ?? 0) - expected)).toBeLessThanOrEqual(40);
  });

  it("works in month 0 and is available to a withdrawal in the same month", () => {
    const { points, withdrawals } = project(
      plan({
        startAmount: 0,
        oneTimeDeposits: [{ month: 0, amount: 1_000_000, label: "Inheritance" }],
        withdrawals: [{ month: 0, amount: 1_500_000, label: "Car" }],
      }),
    );
    expect(points[0]).toMatchObject({ balance: 0, deposited: 1_000_000, withdrawn: 1_000_000 });
    expect(withdrawals[0]).toMatchObject({ applied: 1_000_000, shortfall: 500_000 });
  });

  it("adds two deposits in the same month", () => {
    const { points } = project(
      plan({ oneTimeDeposits: [{ month: 2, amount: 100, label: "A" }, { month: 2, amount: 250, label: "B" }] }),
    );
    expect(points[2]?.balance).toBe(10_000_350);
  });

  it("has no effect when dated after the projection", () => {
    const withIt = project(plan({ oneTimeDeposits: [{ month: 99, amount: 500_000, label: "Late" }] }));
    expect(withIt.points).toEqual(project(plan({})).points);
  });

  it("rejects a negative amount, a fractional amount and a negative month", () => {
    expect(() => project(plan({ oneTimeDeposits: [{ month: 1, amount: -1, label: "x" }] }))).toThrow(RangeError);
    expect(() => project(plan({ oneTimeDeposits: [{ month: 1, amount: 1.5, label: "x" }] }))).toThrow(RangeError);
    expect(() => project(plan({ oneTimeDeposits: [{ month: -1, amount: 1, label: "x" }] }))).toThrow(RangeError);
  });
});

