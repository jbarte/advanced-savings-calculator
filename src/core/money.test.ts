import { describe, expect, it } from "vitest";
import { monthlyRate, roundToOre } from "./money";

describe("monthlyRate", () => {
  it("returns 0 for a 0 % yearly return", () => {
    expect(monthlyRate(0)).toBe(0);
  });

  it("compounds back to the yearly return over 12 months", () => {
    for (const pct of [7, 3.5, 12, -20]) {
      expect((1 + monthlyRate(pct)) ** 12).toBeCloseTo(1 + pct / 100, 12);
    }
  });

  it("is lower than the simple rate / 12 for positive returns", () => {
    expect(monthlyRate(7)).toBeLessThan(0.07 / 12);
  });

  it("returns -1 for a -100 % yearly return", () => {
    expect(monthlyRate(-100)).toBe(-1);
  });

  it("rejects returns below -100 % and non-finite values", () => {
    expect(() => monthlyRate(-101)).toThrow(RangeError);
    expect(() => monthlyRate(Number.NaN)).toThrow(RangeError);
    expect(() => monthlyRate(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe("roundToOre", () => {
  it("leaves whole öre unchanged", () => {
    expect(roundToOre(12_345)).toBe(12_345);
  });

  it("rounds to the nearest öre", () => {
    expect(roundToOre(100.4)).toBe(100);
    expect(roundToOre(100.6)).toBe(101);
  });

  it("rounds halves away from zero", () => {
    expect(roundToOre(2.5)).toBe(3);
    expect(roundToOre(-2.5)).toBe(-3);
  });

  it("never returns negative zero", () => {
    expect(Object.is(roundToOre(-0.4), 0)).toBe(true);
  });
});
