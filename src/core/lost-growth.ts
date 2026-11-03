import { project } from "./project";
import type { Ore, PlanInput, Projection } from "./types";

function endBalance(projection: Projection): Ore {
  return projection.points[projection.points.length - 1]?.balance ?? 0;
}

/**
 * The growth a withdrawal costs by the end of the horizon: the balance you would have had without
 * it, minus the balance you have with it, minus the amount actually withdrawn. Found by running the
 * projection twice. Never below 0, which only matters when removing the withdrawal would change how
 * a later one gets capped. A withdrawal dated after the horizon costs nothing within it.
 */
export function lostGrowth(plan: PlanInput, index: number, horizonMonths: number): Ore {
  if (!Number.isInteger(index) || index < 0 || index >= plan.withdrawals.length) {
    throw new RangeError(`There is no withdrawal at position ${index}`);
  }
  const withinHorizon: PlanInput = { ...plan, months: horizonMonths };
  const withIt = project(withinHorizon);
  const applied = withIt.withdrawals.find((withdrawal) => withdrawal.index === index);
  if (!applied) return 0;

  const without = project({ ...withinHorizon, withdrawals: plan.withdrawals.filter((_, i) => i !== index) });
  return Math.max(0, endBalance(without) - endBalance(withIt) - applied.applied);
}
