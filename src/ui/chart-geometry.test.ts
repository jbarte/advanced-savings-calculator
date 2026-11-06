import { describe, expect, it } from "vitest";
import {
  areaPath,
  calendarPoints,
  axisMonths,
  assignLanes,
  axisTicks,
  cursorAfterKey,
  bandExtent,
  chartGoalLine,
  isAllZero,
  interpolatePath,
  linePath,
  monthToPercent,
  nearestIndex,
  niceScale,
  toPoints,
  valueToPercent,
  zeroLine,
} from "./chart-geometry";

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

describe("calendarPoints", () => {
  const scale = { min: 0, max: 100, step: 25 };

  it("spans the whole width for a line that covers the whole calendar span", () => {
    expect(calendarPoints([0, 100], 10, 10, 11, scale)).toEqual([[0, 100], [100, 0]]);
  });

  it("starts a line that begins later part of the way in, and ends one that stops early", () => {
    expect(calendarPoints([50, 50], 12, 10, 14, scale)).toEqual([[50, 50], [75, 50]]);
  });

  it("does not divide by zero when everything is one month", () => {
    expect(calendarPoints([100], 5, 5, 5, scale)).toEqual([[0, 0]]);
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

describe("monthToPercent", () => {
  it("maps months onto 0–100 and clamps outside the range", () => {
    expect(monthToPercent(0, 120)).toBe(0);
    expect(monthToPercent(60, 120)).toBe(50);
    expect(monthToPercent(120, 120)).toBe(100);
    expect(monthToPercent(-5, 120)).toBe(0);
    expect(monthToPercent(500, 120)).toBe(100);
  });
});

describe("bandExtent", () => {
  it("gives the left edge and width of a period inside the horizon", () => {
    expect(bandExtent(12, 24, 120)).toEqual({ left: 10, width: 10 });
  });

  it("clips a period that starts before the plan or ends after the horizon", () => {
    expect(bandExtent(-6, 12, 120)).toEqual({ left: 0, width: 10 });
    expect(bandExtent(108, 300, 120)).toEqual({ left: 90, width: 10 });
  });

  it("is null when the period is entirely outside the horizon", () => {
    expect(bandExtent(-10, -1, 120)).toBeNull();
    expect(bandExtent(121, 130, 120)).toBeNull();
  });
});

describe("assignLanes", () => {
  it("keeps well-spaced items in the first lane", () => {
    expect(assignLanes([5, 30, 70], 6, 4)).toEqual([0, 0, 0]);
  });

  it("moves an item that is too close to the previous one into the next lane", () => {
    expect(assignLanes([10, 12], 6, 4)).toEqual([0, 1]);
    expect(assignLanes([10, 16], 6, 4)).toEqual([0, 0]);
  });

  it("reuses a lane once there is room again", () => {
    expect(assignLanes([10, 11, 12, 40], 6, 4)).toEqual([0, 1, 2, 0]);
  });

  it("returns lanes in the order of the input, whatever its order", () => {
    expect(assignLanes([12, 10, 11], 6, 4)).toEqual([2, 0, 1]);
  });

  it("never uses more lanes than allowed, even when everything overlaps", () => {
    const lanes = assignLanes([10, 10, 10, 10, 10, 10], 6, 3);
    expect(Math.max(...lanes)).toBe(2);
    expect(lanes).toHaveLength(6);
  });

  it("handles no items", () => {
    expect(assignLanes([], 6, 4)).toEqual([]);
  });
});

describe("cursorAfterKey", () => {
  it("moves a month with the arrows and a year with Page Up and Page Down", () => {
    expect(cursorAfterKey("ArrowRight", 10, 360, 12)).toBe(11);
    expect(cursorAfterKey("ArrowLeft", 10, 360, 12)).toBe(9);
    expect(cursorAfterKey("PageUp", 10, 360, 12)).toBe(22);
    expect(cursorAfterKey("PageDown", 20, 360, 12)).toBe(8);
  });

  it("goes to the ends with Home and End, and never past them", () => {
    expect(cursorAfterKey("Home", 50, 360, 12)).toBe(0);
    expect(cursorAfterKey("End", 50, 360, 12)).toBe(360);
    expect(cursorAfterKey("PageDown", 5, 360, 12)).toBe(0);
    expect(cursorAfterKey("ArrowRight", 360, 360, 12)).toBe(360);
  });

  it("ignores other keys, so they keep their normal use", () => {
    expect(cursorAfterKey("Tab", 5, 360, 12)).toBeNull();
    expect(cursorAfterKey("a", 5, 360, 12)).toBeNull();
  });
});

describe("axisMonths", () => {
  it("spreads five gaps over a long horizon", () => {
    expect(axisMonths(360)).toEqual([0, 72, 144, 216, 288, 360]);
    expect(axisMonths(480)).toEqual([0, 96, 192, 288, 384, 480]);
  });

  it("uses one gap per year for short horizons", () => {
    expect(axisMonths(12)).toEqual([0, 12]);
    expect(axisMonths(36)).toEqual([0, 12, 24, 36]);
  });

  it("rounds to whole months when the years don't divide evenly", () => {
    expect(axisMonths(84)).toEqual([0, 17, 34, 50, 67, 84]);
  });
});

describe("chartGoalLine", () => {
  it("draws the goal when it is within three times the highest balance, and not otherwise", () => {
    expect(chartGoalLine(4_000_000, 3_000_000)).toBe(4_000_000);
    expect(chartGoalLine(9_000_000, 3_000_000)).toBe(9_000_000);
    expect(chartGoalLine(9_000_001, 3_000_000)).toBeNull();
  });

  it("draws nothing without a goal, or for a goal of 0", () => {
    expect(chartGoalLine(null, 3_000_000)).toBeNull();
    expect(chartGoalLine(0, 3_000_000)).toBeNull();
  });
});

describe("valueToPercent", () => {
  it("puts the top of the scale at 0 and the bottom at 100, like toPoints", () => {
    const scale = { min: 0, max: 100, step: 25 };
    expect(valueToPercent(100, scale)).toBe(0);
    expect(valueToPercent(0, scale)).toBe(100);
    expect(valueToPercent(25, scale)).toBe(75);
    expect(valueToPercent(40, scale)).toBeCloseTo(toPoints([40, 0], scale)[0]?.[1] ?? NaN);
  });

  it("works for a scale that reaches below zero", () => {
    expect(valueToPercent(0, { min: -3, max: 1, step: 1 })).toBe(25);
  });
});


describe("interpolatePath", () => {
  const from = linePath([[0, 100], [50, 80], [100, 60]]);
  const to = linePath([[0, 100], [50, 40], [100, 0]]);

  it("is the first path at 0 and the second at 1", () => {
    expect(interpolatePath(from, to, 0)).toBe(from);
    expect(interpolatePath(from, to, 1)).toBe(to);
  });

  it("moves every number part of the way in between", () => {
    expect(interpolatePath(from, to, 0.5)).toBe("M0.00 100.00 L50.00 60.00 L100.00 30.00");
  });

  it("works for an area, whose last points are the baseline", () => {
    const a = areaPath([[0, 90], [100, 50]], 100);
    const b = areaPath([[0, 70], [100, 10]], 100);
    expect(interpolatePath(a, b, 0.5)).toBe("M0.00 80.00 L100.00 30.00 L100.00 100.00 L0.00 100.00 Z");
  });

  it("gives nothing for paths of different shapes, such as a different number of points", () => {
    expect(interpolatePath(from, linePath([[0, 100], [100, 0]]), 0.5)).toBeNull();
    expect(interpolatePath("", to, 0.5)).toBeNull();
  });
});
