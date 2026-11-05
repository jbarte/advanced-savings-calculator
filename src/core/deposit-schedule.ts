import type { DepositChangeInput, Ore } from "./types";

function isActive(change: DepositChangeInput, month: number): boolean {
  return change.startMonth <= month && (change.endMonth === null || month <= change.endMonth);
}

/**
 * The monthly deposit in `month`: the amount of the active change with the latest start month, or the base
 * deposit when none is active. When two active changes start in the same month, the one later in the list
 * wins. A change that ends before it starts is never active.
 */
export function depositInMonth(base: Ore, changes: readonly DepositChangeInput[], month: number): Ore {
  let chosen: DepositChangeInput | undefined;
  for (const change of changes) {
    if (!isActive(change, month)) continue;
    if (chosen === undefined || change.startMonth >= chosen.startMonth) chosen = change;
  }
  return chosen === undefined ? base : chosen.amount;
}
