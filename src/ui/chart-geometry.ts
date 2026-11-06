import { MONTHS_PER_YEAR } from "../core/year-month";

/*
 * Pure helpers that turn values into chart coordinates. Coordinates are in a
 * 0–100 box (x left→right, y top→bottom) so the SVG can stretch to any size.
 */

export type Point = readonly [x: number, y: number];

export interface Scale {
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

/**
 * Picks a round axis step (1, 2, 2.5 or 5 × 10ⁿ) giving 3–5 intervals, with ~15 % headroom beyond the
 * values. The scale always contains zero. With nothing above zero it still reaches one step above, so the
 * zero line sits inside the drawing area. E.g. 0…1.82M → 0…3M by 1M, and −2.5M…0 → −3M…1M by 1M.
 */
export function niceScale(min: number, max: number, targetIntervals = 4): Scale {
  const lo = Math.min(0, min);
  const hi = Math.max(0, max);
  if (lo === 0 && hi === 0) return { min: 0, max: 1, step: 0.25 };

  const rough = ((hi - lo) * 1.15) / targetIntervals;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((v) => v >= rough) ?? magnitude * 10;
  return {
    min: lo < 0 ? Math.floor((lo * 1.15) / step) * step : 0,
    max: hi > 0 ? Math.ceil((hi * 1.15) / step) * step : step,
    step,
  };
}

/** Axis values from max down to min. */
export function axisTicks({ min, max, step }: Scale): number[] {
  const count = Math.round((max - min) / step);
  return Array.from({ length: count + 1 }, (_, i) => max - i * step);
}

/** Places values evenly along x and scales them to the scale on y. */
export function toPoints(values: readonly number[], { min, max }: Scale): Point[] {
  const n = values.length;
  return values.map((v, i) => [n === 1 ? 50 : (i / (n - 1)) * 100, ((max - v) / (max - min)) * 100]);
}

/**
 * Places a line that starts `firstMonth` and has one value per month on a shared calendar axis that runs from
 * `spanFirst` to `spanLast` (all as month counts), so plans that start at different months line up by date.
 */
export function calendarPoints(values: readonly number[], firstMonth: number, spanFirst: number, spanLast: number, { min, max }: Scale): Point[] {
  const width = Math.max(1, spanLast - spanFirst);
  return values.map((v, i) => [((firstMonth + i - spanFirst) / width) * 100, ((max - v) / (max - min)) * 100]);
}

/** Where zero is on the y axis (0 = top, 100 = bottom). */
export function zeroLine({ min, max }: Scale): number {
  return (max / (max - min)) * 100;
}

/** True when there is nothing to draw: every value is zero (or there are none). */
export function isAllZero(values: readonly number[]): boolean {
  return values.every((value) => value === 0);
}

export function linePath(points: readonly Point[]): string {
  return points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
}

/** The filled area under the line, closed along `baseline` (the y of the zero line). */
export function areaPath(points: readonly Point[], baseline = 100): string {
  const y = Number(baseline.toFixed(2));
  return points.length ? `${linePath(points)} L100 ${y} L0 ${y} Z` : "";
}

const NUMBER = /-?\d+(?:\.\d+)?/g;

/**
 * The path between two drawn paths of the same shape, `t` of the way (0 = `from`, 1 = `to`). Both must have the same
 * commands with the same number of numbers, as `linePath` and `areaPath` make for the same number of points; for any
 * other pair there is no in-between and this gives null.
 */
export function interpolatePath(from: string, to: string, t: number): string | null {
  const skeleton = (path: string): string => path.replace(NUMBER, "#");
  if (skeleton(from) !== skeleton(to)) return null;
  const start = from.match(NUMBER) ?? [];
  const end = to.match(NUMBER) ?? [];
  let index = 0;
  return to.replace(NUMBER, () => {
    const a = Number(start[index] ?? 0);
    const b = Number(end[index] ?? 0);
    index += 1;
    return (a + (b - a) * t).toFixed(2);
  });
}

/** Index of the point closest to a horizontal position given as a 0–1 fraction. */
export function nearestIndex(fraction: number, count: number): number {
  if (count <= 1) return 0;
  const clamped = Math.min(1, Math.max(0, fraction));
  return Math.round(clamped * (count - 1));
}

/** Where a month falls along the x axis, as 0–100. Months outside the horizon are clamped to the edges. */
export function monthToPercent(month: number, totalMonths: number): number {
  return Math.min(100, Math.max(0, (month / totalMonths) * 100));
}

export interface Band {
  readonly left: number;
  readonly width: number;
}

/** The part of a period (both months included) that lies inside the horizon, or null when none of it does. */
export function bandExtent(startMonth: number, endMonth: number, totalMonths: number): Band | null {
  if (endMonth < 0 || startMonth > totalMonths) return null;
  const left = monthToPercent(startMonth, totalMonths);
  return { left, width: monthToPercent(endMonth, totalMonths) - left };
}

/**
 * Gives each badge a lane (a row, counted from 0) so that badges closer than `minGap` (in percent of the
 * width) do not sit on top of each other. First fit from the left; when every allowed lane is taken, the one
 * whose last badge is furthest away is shared. Lanes come back in the order of the input.
 */
export function assignLanes(positions: readonly number[], minGap: number, maxLanes: number): number[] {
  const lastInLane: number[] = [];
  const lanes: number[] = new Array<number>(positions.length).fill(0);
  const order = positions.map((_, index) => index).sort((a, b) => (positions[a] ?? 0) - (positions[b] ?? 0) || a - b);

  for (const index of order) {
    const x = positions[index] ?? 0;
    let lane = lastInLane.findIndex((last) => x - last >= minGap);
    if (lane === -1) {
      if (lastInLane.length < maxLanes) lane = lastInLane.length;
      else lane = lastInLane.indexOf(Math.min(...lastInLane));
    }
    lastInLane[lane] = x;
    lanes[index] = lane;
  }
  return lanes;
}

/**
 * Where the chart cursor goes for a key, as a point index from 0 to `last`, or null for a key the chart doesn't
 * use. Follows the slider pattern: arrows move one month, Page Up and Page Down one year, Home and End to the ends.
 */
export function cursorAfterKey(key: string, current: number, last: number, monthsPerStep: number): number | null {
  const clamp = (index: number): number => Math.min(last, Math.max(0, index));
  switch (key) {
    case "ArrowRight":
    case "ArrowUp":
      return clamp(current + 1);
    case "ArrowLeft":
    case "ArrowDown":
      return clamp(current - 1);
    case "PageUp":
      return clamp(current + monthsPerStep);
    case "PageDown":
      return clamp(current - monthsPerStep);
    case "Home":
      return 0;
    case "End":
      return last;
    default:
      return null;
  }
}

/**
 * The months that get a label on the x axis: evenly spread from 0 to `totalMonths`, at most `maxIntervals` gaps
 * and no more gaps than whole years, so a 2-year chart doesn't repeat a year five times.
 */
export function axisMonths(totalMonths: number, maxIntervals = 5): number[] {
  const intervals = Math.max(1, Math.min(maxIntervals, Math.floor(totalMonths / MONTHS_PER_YEAR)));
  return Array.from({ length: intervals + 1 }, (_, i) => Math.round((i * totalMonths) / intervals));
}

/** A goal this many times above the highest balance would squash the curve flat, so no goal line is drawn for it. */
export const GOAL_LINE_MAX_FACTOR = 3;

/**
 * The value to draw the goal line at, or null when there is none to draw: no goal, or a goal so far above the
 * balance that including it would flatten the curve. `maxValue` is the highest value on the chart.
 */
export function chartGoalLine(goal: number | null, maxValue: number): number | null {
  if (goal === null || goal <= 0) return null;
  return goal <= maxValue * GOAL_LINE_MAX_FACTOR ? goal : null;
}

/** Where a value falls on the y axis of a scale, as 0–100 (0 = top, 100 = bottom). The same rule as `toPoints`. */
export function valueToPercent(value: number, { min, max }: Scale): number {
  return ((max - value) / (max - min)) * 100;
}
