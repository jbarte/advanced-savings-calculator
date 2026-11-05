import type { PlanDocument } from "./plan-document";
import type { AppState } from "./types";

/**
 * Applies a change to the plan. A valid change replaces the plan and clears any notice. A shared plan stays shared. A change that
 * throws a RangeError (an invalid value) leaves the plan as it was and sets a notice saying why. Any
 * other error is a bug and is not hidden.
 */
export function withPlanChange(state: AppState, change: (plan: PlanDocument) => PlanDocument): AppState {
  try {
    return { ...state, plan: change(state.plan), planOrigin: state.planOrigin === "shared" ? "shared" : "own", notice: null };
  } catch (error) {
    if (error instanceof RangeError) return { ...state, notice: `That change was not applied. ${error.message}` };
    throw error;
  }
}
