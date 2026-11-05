import { project } from "./project";
import type { Ore, PlanInput } from "./types";

/** Which event of a plan: its list and its position in that list. */
export interface EventRef {
  readonly list: "withdrawals" | "depositChanges" | "oneTimeDeposits";
  readonly index: number;
}

/** The plan with one event left out. Throws a RangeError when there is no event at that position. */
export function withoutEvent(plan: PlanInput, ref: EventRef): PlanInput {
  const list: readonly unknown[] = plan[ref.list];
  if (!Number.isInteger(ref.index) || ref.index < 0 || ref.index >= list.length) {
    throw new RangeError(`There is no event at position ${ref.index} in ${ref.list}`);
  }
  return { ...plan, [ref.list]: list.filter((_, i) => i !== ref.index) };
}

function balanceAt(plan: PlanInput, months: number): Ore {
  return project({ ...plan, months }).points[months]?.balance ?? 0;
}

/**
 * How much one event changes the balance at the end of month `horizonMonths`: the balance with it minus the
 * balance without it. Negative for a loss (a withdrawal, a pause), positive for a gain. `balanceWith` is the
 * balance with every event at that month, taken from the projection that is already there, so only the run
 * without the event is needed. An event after the horizon has no effect within it.
 */
export function eventEffect(plan: PlanInput, ref: EventRef, horizonMonths: number, balanceWith: Ore): Ore {
  return balanceWith - balanceAt(withoutEvent(plan, ref), horizonMonths);
}

/** How much all events together change the balance at `horizonMonths`, compared with the plan without any. */
export function totalEffect(plan: PlanInput, horizonMonths: number, balanceWith: Ore): Ore {
  return balanceWith - balanceAt({ ...plan, withdrawals: [], depositChanges: [], oneTimeDeposits: [] }, horizonMonths);
}

/**
 * The growth a withdrawal costs beyond the money itself: the loss minus the amount actually withdrawn. Never below
 * 0, which only matters when removing the withdrawal changes how a later one gets capped.
 */
export function lostGrowthOf(effect: Ore, applied: Ore): Ore {
  return Math.max(0, -effect - applied);
}
