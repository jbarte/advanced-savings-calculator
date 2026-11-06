import { describe, expect, it } from "vitest";
import { createBlankPlan, createExamplePlan } from "./plan-document";
import type { PlanDocument } from "./plan-document";
import { buildComparison, monthIndex, valueAtMonth, yearMonthOf } from "./comparison";
import { applyInflationAdjustment, buildScenarioView } from "./view-model";

const start = { year: 2026, month: 1 };
const base: PlanDocument = { ...createExamplePlan(start), withdrawals: [], horizonYears: 10 };
const more: PlanDocument = { ...base, monthlyDeposit: base.monthlyDeposit * 2 };
const later: PlanDocument = { ...base, start: { year: 2028, month: 7 }, horizonYears: 5 };

const view = (plan: PlanDocument, id: string) => buildScenarioView(plan, `Plan ${id}`, plan.horizonYears * 12, id);

describe("monthIndex and yearMonthOf", () => {
  it("count months from the year 0 and go back again", () => {
    expect(monthIndex({ year: 2026, month: 1 })).toBe(2026 * 12);
    expect(monthIndex({ year: 2026, month: 12 }) - monthIndex({ year: 2026, month: 1 })).toBe(11);
    expect(yearMonthOf(monthIndex({ year: 2031, month: 4 }))).toEqual({ year: 2031, month: 4 });
  });
});

describe("buildComparison", () => {
  const views = [view(base, "1"), view(more, "2")];
  const comparison = buildComparison(views, "1", "balance");

  it("makes one line per plan, from the plan's start through its horizon, for the metric", () => {
    expect(comparison.lines.map((line) => line.id)).toEqual(["1", "2"]);
    const first = comparison.lines[0];
    expect(first?.values).toHaveLength(121);
    expect(first?.firstMonth).toBe(monthIndex(start));
    expect(first?.values[120]).toBe(views[0]?.points[120]?.balance);
    expect(buildComparison(views, "1", "deposited").lines[0]?.values[120]).toBe(views[0]?.points[120]?.deposited);
  });

  it("gives each plan's end figures, with the difference measured from the open plan", () => {
    const [open, other] = comparison.rows;
    const baseEnd = views[0]?.points[120];
    const moreEnd = views[1]?.points[120];
    expect(open).toMatchObject({ id: "1", open: true, endDate: { year: 2036, month: 1 }, balance: baseEnd?.balance, difference: 0 });
    expect(other).toMatchObject({ id: "2", open: false, balance: moreEnd?.balance });
    expect(other?.difference).toBe((moreEnd?.balance ?? 0) - (baseEnd?.balance ?? 0));
    expect(other?.difference).toBeGreaterThan(0);
  });

  it("measures from another plan when that one is open", () => {
    const flipped = buildComparison(views, "2", "balance");
    expect(flipped.rows[0]?.difference).toBe((views[0]?.points[120]?.balance ?? 0) - (views[1]?.points[120]?.balance ?? 0));
    expect(flipped.rows[1]?.difference).toBe(0);
    expect(flipped.rows[1]?.open).toBe(true);
  });

  it("puts plans with different starts and horizons on one calendar axis, each compared at its own end", () => {
    const mixed = buildComparison([view(base, "1"), view(later, "2")], "1", "balance");
    expect(mixed.firstMonth).toBe(monthIndex(start));
    expect(mixed.lastMonth).toBe(monthIndex({ year: 2036, month: 1 }));
    expect(mixed.rows[1]?.endDate).toEqual({ year: 2033, month: 7 });
    const line = mixed.lines[1];
    expect(line && valueAtMonth(line, monthIndex({ year: 2027, month: 1 }))).toBeNull();
    expect(line && valueAtMonth(line, monthIndex({ year: 2028, month: 7 }))).toBe(line?.values[0]);
    expect(line && valueAtMonth(line, monthIndex({ year: 2034, month: 1 }))).toBeNull();
  });

  it("uses the values of the views it is given, so inflation adjusted views compare adjusted", () => {
    const adjusted = views.map((v) => applyInflationAdjustment(v, 2));
    const result = buildComparison(adjusted, "1", "balance");
    expect(result.rows[0]?.balance).toBe(adjusted[0]?.points[120]?.balance);
    expect(result.rows[0]?.balance).toBeLessThan(views[0]?.points[120]?.balance ?? 0);
  });

  it("works for a single plan and for plans with nothing in them", () => {
    const blank = buildComparison([view(createBlankPlan(start), "1")], "1", "balance");
    expect(blank.rows[0]).toMatchObject({ balance: 0, difference: 0 });
    expect(blank.lines[0]?.values.every((value) => value === 0)).toBe(true);
  });
});

describe("valueAtMonth", () => {
  it("is null before the line starts and after it ends", () => {
    const line = { id: "1", name: "P", firstMonth: 100, values: [5, 6, 7] };
    expect(valueAtMonth(line, 99)).toBeNull();
    expect(valueAtMonth(line, 100)).toBe(5);
    expect(valueAtMonth(line, 102)).toBe(7);
    expect(valueAtMonth(line, 103)).toBeNull();
  });
});
