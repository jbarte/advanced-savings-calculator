import { describe, expect, it } from "vitest";
import { createExamplePlan } from "./plan-document";
import type { PlanDocument } from "./plan-document";
import { applyInflationAdjustment, buildScenarioView } from "./view-model";

/*
 * Results checked by hand and by an independent script (the same monthly steps written separately in Python),
 * pinned to the öre so any change in the engine's results is noticed. The example plan: 50 000 kr start,
 * 3 000 kr a month, 7 % a year, a 150 000 kr car after five years. The start month doesn't change the numbers.
 */

const example = createExamplePlan({ year: 2026, month: 1 });
const withoutCar: PlanDocument = { ...example, withdrawals: [] };

describe("reference values", () => {
  it("base plan: 3 888 970 kr after 30 years", () => {
    expect(buildScenarioView(withoutCar, "Base", 360).points[360]?.balance).toBe(388_897_047);
  });

  it("example plan with the car: 3 074 856 kr after 30 years", () => {
    expect(buildScenarioView(example, "Example", 360).points[360]?.balance).toBe(307_485_573);
  });

  it.each([
    [120, 6_038_276],
    [240, 26_385_463],
    [360, 66_411_474],
  ])("the car's lost growth by month %i is %i öre", (horizon, expected) => {
    expect(buildScenarioView(example, "Example", horizon).withdrawals[0]?.lostGrowth).toBe(expected);
  });

  it("a 100 000 kr one-time deposit in the car's month adds 542 743 kr by year 30", () => {
    const bonus: PlanDocument = {
      ...example,
      oneTimeDeposits: [{ id: 1, date: { year: 2031, month: 1 }, amount: 10_000_000, label: "Bonus" }],
    };
    const gain = (buildScenarioView(bonus, "B", 360).points[360]?.balance ?? 0) - 307_485_573;
    expect(gain).toBe(54_274_305);
  });
});

describe("reference values: the effect of each event (end balance with it minus without it)", () => {
  const full: PlanDocument = {
    ...example,
    depositChanges: [{ id: 1, startDate: { year: 2027, month: 2 }, endDate: { year: 2028, month: 1 }, amount: 0, label: "Pause" }],
    oneTimeDeposits: [{ id: 1, date: { year: 2031, month: 1 }, amount: 10_000_000, label: "Bonus" }],
  };

  it("the car alone costs 814 115 kr by year 30: 150 000 kr plus 664 115 kr of growth", () => {
    const view = buildScenarioView(example, "Example", 360);
    expect(view.withdrawals[0]?.effect).toBe(-81_411_474);
    expect(view.totalEffect).toBe(-81_411_474);
  });

  it("the car costs 210 383 kr by year 10", () => {
    expect(buildScenarioView({ ...full, depositChanges: [], oneTimeDeposits: [] }, "E", 120).withdrawals[0]?.effect).toBe(
      -21_038_276,
    );
  });

  it("with a car, a bonus and a 12-month pause, each effect and the total", () => {
    const view = buildScenarioView(full, "Full", 360);
    expect(view.points[360]?.balance).toBe(337_065_516);
    expect(view.withdrawals[0]?.effect).toBe(-81_411_508);
    expect(view.oneTimeDeposits[0]?.effect).toBe(54_274_329);
    expect(view.depositChanges[0]?.effect).toBe(-24_694_362);
    expect(view.totalEffect).toBe(-51_831_531);
  });
});

describe("reference values: inflation adjusted at 2 % inflation, 30 years", () => {
  const real = applyInflationAdjustment(buildScenarioView(example, "Example", 360), 2);

  it("the example plan's end balance is 1 697 538 kr inflation adjusted", () => {
    expect(real.points[360]?.balance).toBe(169_753_834);
  });

  it("each deposit and the car are divided by their own month's prices", () => {
    expect(real.points[360]?.deposited).toBe(86_363_680);
    expect(real.points[360]?.withdrawn).toBe(13_585_962);
    expect(real.points[360]?.growth).toBe(96_976_116);
  });

  it("the car's effect is −449 449 kr inflation adjusted (−814 115 kr in 2056 kronor)", () => {
    expect(real.withdrawals[0]?.effect).toBe(-44_944_905);
    expect(real.totalEffect).toBe(-44_944_905);
  });
});

