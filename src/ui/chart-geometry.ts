/*
 * Pure helpers that turn values into chart coordinates. Coordinates are in a
 * 0–100 box (x left→right, y top→bottom) so the SVG can stretch to any size.
 */

export type Point = readonly [x: number, y: number];

export interface Scale {
  readonly max: number;
  readonly step: number;
}

/**
 * Picks a round axis step (1, 2, 2.5 or 5 × 10ⁿ) giving 3–5 intervals, and a
 * max with ~15 % headroom above `top`. E.g. 1.82M → max 3M, step 1M.
 */
export function niceScale(top: number, targetIntervals = 4): Scale {
  if (top <= 0) return { max: 1, step: 0.25 };
  const padded = top * 1.15;
  const rough = padded / targetIntervals;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((v) => v >= rough) ?? magnitude * 10;
  return { max: Math.ceil(padded / step) * step, step };
}

/** Axis values from max down to 0. */
export function axisTicks({ max, step }: Scale): number[] {
  const count = Math.round(max / step);
  return Array.from({ length: count + 1 }, (_, i) => (count - i) * step);
}

/** Places values evenly along x and scales them against `max` on y. */
export function toPoints(values: readonly number[], max: number): Point[] {
  const n = values.length;
  return values.map((v, i) => [n === 1 ? 50 : (i / (n - 1)) * 100, 100 - (v / max) * 100]);
}

export function linePath(points: readonly Point[]): string {
  return points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
}

export function areaPath(points: readonly Point[]): string {
  return points.length ? `${linePath(points)} L100 100 L0 100 Z` : "";
}

/** Index of the point closest to a horizontal position given as a 0–1 fraction. */
export function nearestIndex(fraction: number, count: number): number {
  if (count <= 1) return 0;
  const clamped = Math.min(1, Math.max(0, fraction));
  return Math.round(clamped * (count - 1));
}
