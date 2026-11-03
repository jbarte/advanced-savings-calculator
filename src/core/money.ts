import type { Ore } from "./types";
import { MONTHS_PER_YEAR } from "./year-month";

/**
 * Converts a yearly return in percent to the equivalent monthly rate, so that
 * twelve months of compounding give exactly the yearly return:
 * (1 + monthly)^12 = 1 + yearly. 7 % a year → about 0.565 % a month.
 */
export function monthlyRate(annualReturnPct: number): number {
  if (!Number.isFinite(annualReturnPct) || annualReturnPct < -100) {
    throw new RangeError(`Yearly return must be a finite number of at least -100 %, got ${annualReturnPct}`);
  }
  return (1 + annualReturnPct / 100) ** (1 / MONTHS_PER_YEAR) - 1;
}

/**
 * The single place where fractional money becomes whole öre. Rounds halves away
 * from zero, so deposits and withdrawals of the same size round symmetrically.
 */
export function roundToOre(value: number): Ore {
  const rounded = Math.sign(value) * Math.round(Math.abs(value));
  return rounded === 0 ? 0 : rounded;
}
