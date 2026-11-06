import type { PlanDocument } from "./plan-document";
import { problemOf } from "./plan-problem";
import { serializePlan } from "./read-plan";
import type { AppState } from "./types";
import { activeEntry, updateActivePlan } from "./workspace";

/**
 * Applies a change to the open plan. A valid change replaces the plan and clears any notice. A shared plan stays shared, and a change
 * that leaves the plan as it was keeps the same plan object. A change that
 * throws a RangeError (an invalid value) leaves the plan as it was and sets a notice saying why. Any
 * other error is a bug and is not hidden.
 */
export function withPlanChange(state: AppState, change: (plan: PlanDocument) => PlanDocument): AppState {
  try {
    const current = activeEntry(state).plan;
    const plan = change(current);
    // A change that changes nothing (retyping "3000" as "3 000") must not mark the example as the user's own.
    if (serializePlan(plan) === serializePlan(current)) return { ...state, notice: null };
    return { ...state, ...updateActivePlan(state, plan), notice: null };
  } catch (error) {
    if (error instanceof RangeError) return { ...state, notice: { kind: "change-rejected", problem: problemOf(error) } };
    throw error;
  }
}
