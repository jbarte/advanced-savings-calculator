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

/** Index of the point closest to a horizontal position given as a 0–1 fraction. */
export function nearestIndex(fraction: number, count: number): number {
  if (count <= 1) return 0;
  const clamped = Math.min(1, Math.max(0, fraction));
  return Math.round(clamped * (count - 1));
}
