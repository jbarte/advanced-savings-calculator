import { roundToOre } from "./money";
import type { Ore, ProjectionPoint } from "./types";
import { MONTHS_PER_YEAR } from "./year-month";

/*
 * "Today's money": nominal amounts of a later month divided by how much prices have risen since the start. It is
 * a display conversion only: the engine, the plan and everything the user types stay in nominal kronor, and the
 * conversion never changes what is stored.
 */

/** How many times higher prices are after `months` than at the start, at `inflationPct` a year (effective). */
export function priceLevel(months: number, inflationPct: number): number {
  return (1 + inflationPct / 100) ** (months / MONTHS_PER_YEAR);
}

/** An amount that belongs to `months` after the start, in today's money, rounded to whole öre. */
export function inTodaysMoney(amount: Ore, months: number, inflationPct: number): Ore {
  return roundToOre(amount / priceLevel(months, inflationPct));
}

/**
 * The projection in today's money. Each month's balance is divided by that month's price level. Deposits and
 * withdrawals are added up month by month, each divided by the price level of the month it happened in (dividing
 * the running total by the last month's level would be wrong). Growth keeps the identity
 * growth = balance + withdrawn − deposited. Month 0 is unchanged.
 */
export function pointsInTodaysMoney(points: readonly ProjectionPoint[], inflationPct: number): ProjectionPoint[] {
  let deposited = 0;
  let withdrawn = 0;
  let previous: ProjectionPoint | undefined;
  return points.map((point) => {
    const level = priceLevel(point.month, inflationPct);
    deposited += (point.deposited - (previous?.deposited ?? 0)) / level;
    withdrawn += (point.withdrawn - (previous?.withdrawn ?? 0)) / level;
    previous = point;
    const balance = roundToOre(point.balance / level);
    const realDeposited = roundToOre(deposited);
    const realWithdrawn = roundToOre(withdrawn);
    return { month: point.month, balance, deposited: realDeposited, withdrawn: realWithdrawn, growth: balance + realWithdrawn - realDeposited };
  });
}
