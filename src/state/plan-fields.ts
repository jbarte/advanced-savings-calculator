import type { PlanDocument, PlanFields } from "./plan-document";
import { validatePlanFields } from "./validate-plan";

/** Changes the plan's single-value fields. Throws a RangeError, and returns nothing, if the result is invalid. */
export function updatePlanFields(plan: PlanDocument, patch: Partial<PlanFields>): PlanDocument {
  const updated = { ...plan, ...patch };
  validatePlanFields(updated);
  return updated;
}
