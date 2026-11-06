import type { PlanDocument } from "./plan-document";
import { cleanText } from "./plan-text";
import { validatePlanName } from "./validate-plan";

/** Gives the plan a name, or removes it with empty text. Throws a PlanError if the name is too long. */
export function renamePlan(plan: PlanDocument, text: string): PlanDocument {
  const cleaned = cleanText(text);
  const name = cleaned === "" ? null : cleaned;
  validatePlanName(name);
  return name === plan.name ? plan : { ...plan, name };
}
