import { project } from "./project";
import type { GoalInput, Ore, PlanInput, ProjectionPoint } from "./types";

function assertValidGoal(goal: GoalInput): void {
  if (!Number.isSafeInteger(goal.month) || goal.month < 0) {
    throw new RangeError(`The goal month must be a whole number, 0 or more, got ${goal.month}`);
  }
  if (!Number.isSafeInteger(goal.target) || goal.target < 0) {
    throw new RangeError(`The goal must be a whole number of öre, 0 or more, got ${goal.target}`);
  }
}

/** The balance at the end of `month`, whatever the plan's own `months` is. */
export function balanceAtMonth(plan: PlanInput, month: number): Ore {
  return project({ ...plan, months: month }).points[month]?.balance ?? 0;
}

/**
 * The smallest base monthly deposit, in whole öre, that makes the balance reach `goal.target` by `goal.month`, with
 * every planned event kept as it is: withdrawals, one-time deposits and deposit changes (a pause stays a pause, and
 * only the months without an active change use the base deposit). Returns 0 when the goal is reached without saving
 * anything, and null when even `maxDeposit` is not enough.
 *
 * The balance never falls when the base deposit rises (a larger balance can only cover a withdrawal better), so the
 * answer is found by bisection on whole öre: about 30 projections for the largest allowed deposit.
 */
export function requiredMonthlyDeposit(plan: PlanInput, goal: GoalInput, maxDeposit: Ore): Ore | null {
  assertValidGoal(goal);
  const reaches = (deposit: Ore): boolean => balanceAtMonth({ ...plan, monthlyDeposit: deposit }, goal.month) >= goal.target;
  if (reaches(0)) return 0;
  if (!reaches(maxDeposit)) return null;

  let low = 0; // does not reach the goal
  let high = maxDeposit; // reaches it
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (reaches(middle)) high = middle;
    else low = middle;
  }
  return high;
}

/** The first month whose balance is at least `target`, or null if no month in `points` is. */
export function firstMonthAtLeast(points: readonly ProjectionPoint[], target: Ore): number | null {
  return points.find((point) => point.balance >= target)?.month ?? null;
}
