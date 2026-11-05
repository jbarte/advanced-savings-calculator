import type { GoalPlan, PlanDocument } from "./plan-document";
import { validateGoal } from "./validate-plan";

/** Sets the plan's savings goal, replacing any earlier one. Throws a RangeError if it is invalid. */
export function setGoal(plan: PlanDocument, goal: GoalPlan): PlanDocument {
  validateGoal(goal);
  return { ...plan, goal: { amount: goal.amount, date: goal.date } };
}

/** Removes the savings goal. Does nothing if there is none. */
export function clearGoal(plan: PlanDocument): PlanDocument {
  return plan.goal === null ? plan : { ...plan, goal: null };
}
