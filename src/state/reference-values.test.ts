import { describe, expect, it } from "vitest";
import { createExamplePlan } from "./plan-document";
import type { PlanDocument } from "./plan-document";
import { buildScenarioView } from "./view-model";

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
