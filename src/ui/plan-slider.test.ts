import { describe, expect, it } from "vitest";
import { PLAN_LIMITS } from "../state/plan-document";
import { ORE_PER_KRONA, SLIDER_RANGES } from "./plan-slider";

/** Every value a slider can give, from its range and step. */
function stops({ min, max, step }: { readonly min: number; readonly max: number; readonly step: number }): number[] {
  return Array.from({ length: Math.round((max - min) / step) + 1 }, (_, i) => min + i * step);
}

describe("the Plan card sliders", () => {
  it("only give values the plan accepts, so a preview never needs a notice", () => {
    expect(SLIDER_RANGES.startAmount.max * ORE_PER_KRONA).toBeLessThanOrEqual(PLAN_LIMITS.maxStartAmount);
    expect(SLIDER_RANGES.monthlyDeposit.max * ORE_PER_KRONA).toBeLessThanOrEqual(PLAN_LIMITS.maxMonthlyDeposit);
    expect(SLIDER_RANGES.annualReturn.min).toBeGreaterThanOrEqual(PLAN_LIMITS.minReturnPct);
    expect(SLIDER_RANGES.annualReturn.max).toBeLessThanOrEqual(PLAN_LIMITS.maxReturnPct);
    expect(SLIDER_RANGES.inflation.min).toBeGreaterThanOrEqual(PLAN_LIMITS.minInflationPct);
    expect(SLIDER_RANGES.inflation.max).toBeLessThanOrEqual(PLAN_LIMITS.maxInflationPct);
    expect(SLIDER_RANGES.startYear.min).toBeGreaterThanOrEqual(PLAN_LIMITS.minStartYear);
    expect(SLIDER_RANGES.startYear.max).toBeLessThanOrEqual(PLAN_LIMITS.maxStartYear);
    expect(Number.isInteger(SLIDER_RANGES.startYear.step)).toBe(true);
  });

  it("land on whole kronor and on round steps, with the end of the range as a stop", () => {
    for (const range of [SLIDER_RANGES.startAmount, SLIDER_RANGES.monthlyDeposit]) {
      const values = stops(range);
      expect(values.every((value) => Number.isInteger(value * ORE_PER_KRONA))).toBe(true);
      expect(values.at(-1)).toBe(range.max);
    }
    expect(stops(SLIDER_RANGES.annualReturn)).toContain(7);
    expect(stops(SLIDER_RANGES.annualReturn).at(-1)).toBe(SLIDER_RANGES.annualReturn.max);
  });
});
