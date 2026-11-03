import { describe, expect, it } from "vitest";
import { areaPath, axisTicks, isAllZero, linePath, nearestIndex, niceScale, toPoints, zeroLine } from "./chart-geometry";

describe("niceScale", () => {
  it("picks a round step and a max with headroom for positive values", () => {
    expect(niceScale(0, 1_818_921)).toEqual({ min: 0, max: 3_000_000, step: 1_000_000 });
    expect(niceScale(0, 38)).toEqual({ min: 0, max: 60, step: 20 });
  });

  it("falls back to a small scale when every value is zero", () => {
    const scale = niceScale(0, 0);
    expect(scale.min).toBe(0);
    expect(scale.max).toBeGreaterThan(0);
  });

  it("makes room below zero for negative values and one step above zero", () => {
    expect(niceScale(-2_500_000, 0)).toEqual({ min: -3_000_000, max: 1_000_000, step: 1_000_000 });
  });

  it("makes room on both sides for mixed values", () => {
    const scale = niceScale(-500, 1_500);
    expect(scale.min).toBeLessThan(-500);
    expect(scale.max).toBeGreaterThan(1_500);
  });

  it("always has min and max on whole steps and contains every value", () => {
    const samples: [number, number][] = [
      [0, 1],
      [0, 99],
      [0, 4_145_050],
      [-7, 0],
      [-98_765, 0],
      [-10_232_050, -1],
      [-1_000, 5_000],
      [3, 3],
    ];
    for (const [min, max] of samples) {
      const scale = niceScale(min, max);
      expect(scale.min).toBeLessThanOrEqual(Math.min(0, min));
      expect(scale.max).toBeGreaterThanOrEqual(Math.max(0, max));
      expect((scale.max - scale.min) / scale.step).toBeCloseTo(Math.round((scale.max - scale.min) / scale.step));
    }
  });
});

describe("axisTicks", () => {
  it("returns max down to zero for a positive scale", () => {
    expect(axisTicks({ min: 0, max: 100, step: 25 })).toEqual([100, 75, 50, 25, 0]);
    expect(axisTicks({ min: 0, max: 3, step: 1 })).toEqual([3, 2, 1, 0]);
  });

  it("goes down to min for a scale below zero", () => {
    expect(axisTicks({ min: -3, max: 1, step: 1 })).toEqual([1, 0, -1, -2, -3]);
  });
});

describe("toPoints", () => {
  it("spreads points across 0–100 and flips y", () => {
    const scale = { min: 0, max: 100, step: 25 };
    expect(toPoints([0, 50, 100], scale)).toEqual([
      [0, 100],
      [50, 50],
      [100, 0],
    ]);
  });

  it("centres a single point", () => {
    expect(toPoints([10], { min: 0, max: 20, step: 5 })).toEqual([[50, 50]]);
  });

  it("places negative values below the zero line", () => {
    const scale = niceScale(-2_500_000, 0);
    const [first, second, third] = toPoints([0, -1_000_000, -2_500_000], scale);
    expect(first?.[1]).toBeCloseTo(zeroLine(scale));
    expect(second?.[1]).toBeCloseTo(50);
    expect(third?.[1]).toBeCloseTo(87.5);
  });

  it("keeps every y inside the drawing area, whatever the values", () => {
    const sets = [
      [0, 0, 0],
      [5, 5, 5],
      [-5, -5, -5],
      [-10_232_050_300, -1, 0],
      [-1_000, 0, 5_000],
      [0, 3_888_970, 100],
      [-0.5, -0.25],
    ];
    for (const values of sets) {
      const scale = niceScale(Math.min(...values), Math.max(...values));
      for (const [, y] of toPoints(values, scale)) {
        expect(y).toBeGreaterThanOrEqual(-1e-9);
        expect(y).toBeLessThanOrEqual(100 + 1e-9);
      }
    }
  });
});

describe("zeroLine", () => {
  it("is at the bottom when nothing is negative", () => {
    expect(zeroLine({ min: 0, max: 3, step: 1 })).toBe(100);
  });

  it("is inside the area when there is room below zero", () => {
    expect(zeroLine({ min: -3, max: 1, step: 1 })).toBe(25);
  });
});

describe("paths", () => {
  it("builds a line path", () => {
    expect(linePath([[0, 100], [100, 0]])).toBe("M0.00 100.00 L100.00 0.00");
  });

  it("closes the area path along the bottom by default", () => {
    expect(areaPath([[0, 50], [100, 0]])).toBe("M0.00 50.00 L100.00 0.00 L100 100 L0 100 Z");
    expect(areaPath([])).toBe("");
  });

  it("closes the area path along the given baseline", () => {
    expect(areaPath([[0, 50], [100, 0]], 25)).toBe("M0.00 50.00 L100.00 0.00 L100 25 L0 25 Z");
  });
});

describe("isAllZero", () => {
  it("is true only when every value is zero", () => {
    expect(isAllZero([0, 0, 0])).toBe(true);
    expect(isAllZero([])).toBe(true);
    expect(isAllZero([0, 1])).toBe(false);
    expect(isAllZero([0, -1])).toBe(false);
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
