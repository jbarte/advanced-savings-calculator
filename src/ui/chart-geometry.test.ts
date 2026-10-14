import { describe, expect, it } from "vitest";
import { areaPath, axisTicks, linePath, nearestIndex, niceScale, toPoints } from "./chart-geometry";

describe("niceScale", () => {
  it("picks a round step and a max with headroom", () => {
    expect(niceScale(1_818_921)).toEqual({ max: 3_000_000, step: 1_000_000 });
    expect(niceScale(38)).toEqual({ max: 60, step: 20 });
  });

  it("never returns a zero max", () => {
    expect(niceScale(0).max).toBeGreaterThan(0);
  });

  it("always has a max above the input and whole intervals", () => {
    for (const v of [1, 7, 99, 1234, 98_765, 4_145_050]) {
      const { max, step } = niceScale(v);
      expect(max).toBeGreaterThan(v);
      expect(max / step).toBeCloseTo(Math.round(max / step));
    }
  });
});

describe("axisTicks", () => {
  it("returns max down to zero in steps", () => {
    expect(axisTicks({ max: 100, step: 25 })).toEqual([100, 75, 50, 25, 0]);
    expect(axisTicks({ max: 3, step: 1 })).toEqual([3, 2, 1, 0]);
  });
});

describe("toPoints", () => {
  it("spreads points across 0–100 and flips y", () => {
    expect(toPoints([0, 50, 100], 100)).toEqual([
      [0, 100],
      [50, 50],
      [100, 0],
    ]);
  });

  it("centres a single point", () => {
    expect(toPoints([10], 20)).toEqual([[50, 50]]);
  });
});

describe("paths", () => {
  it("builds a line path", () => {
    expect(linePath([[0, 100], [100, 0]])).toBe("M0.00 100.00 L100.00 0.00");
  });

  it("closes the area path along the bottom", () => {
    expect(areaPath([[0, 50], [100, 0]])).toBe("M0.00 50.00 L100.00 0.00 L100 100 L0 100 Z");
    expect(areaPath([])).toBe("");
  });
});

describe("nearestIndex", () => {
  it("maps fractions to the closest index and clamps", () => {
    expect(nearestIndex(0, 5)).toBe(0);
    expect(nearestIndex(0.49, 5)).toBe(2);
    expect(nearestIndex(1.4, 5)).toBe(4);
    expect(nearestIndex(-1, 5)).toBe(0);
    expect(nearestIndex(0.5, 1)).toBe(0);
  });
});
