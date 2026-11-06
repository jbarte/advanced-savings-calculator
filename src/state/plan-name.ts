import { PLAN_LIMITS } from "./plan-document";
import type { PlanDocument } from "./plan-document";
import { cleanText } from "./plan-text";
import { validatePlanName } from "./validate-plan";

/** Cuts a text down to a name that fits (`maxNameLength`), with an ellipsis when something was cut off. */
export function fitPlanName(text: string): string {
  const cleaned = cleanText(text);
  if (cleaned.length <= PLAN_LIMITS.maxNameLength) return cleaned;
  return `${cleaned.slice(0, PLAN_LIMITS.maxNameLength - 1).trimEnd()}\u2026`;
}

/** Gives the plan a name, or removes it with empty text. Throws a PlanError if the name is too long. */
export function renamePlan(plan: PlanDocument, text: string): PlanDocument {
  const cleaned = cleanText(text);
  const name = cleaned === "" ? null : cleaned;
  validatePlanName(name);
  return name === plan.name ? plan : { ...plan, name };
}
