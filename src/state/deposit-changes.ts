import { PLAN_LIMITS } from "./plan-document";
import type { DepositChangeDraft, PlanDocument } from "./plan-document";
import { validateDepositChangeDraft } from "./validate-plan";

function toEvent(id: number, draft: DepositChangeDraft): PlanDocument["depositChanges"][number] {
  return { id, startDate: draft.startDate, endDate: draft.endDate, amount: draft.amount, label: draft.label };
}

/** Adds a deposit change. Its id is one above the highest deposit change id. Throws a RangeError if it is invalid. */
export function addDepositChange(plan: PlanDocument, draft: DepositChangeDraft): PlanDocument {
  validateDepositChangeDraft(draft);
  if (plan.depositChanges.length >= PLAN_LIMITS.maxDepositChanges) {
    throw new RangeError(`A plan can have at most ${PLAN_LIMITS.maxDepositChanges} deposit changes`);
  }
  const id = Math.max(0, ...plan.depositChanges.map((change) => change.id)) + 1;
  return { ...plan, depositChanges: [...plan.depositChanges, toEvent(id, draft)] };
}

/** Replaces a deposit change's fields. It keeps its id and its place in the list. */
export function updateDepositChange(plan: PlanDocument, id: number, draft: DepositChangeDraft): PlanDocument {
  validateDepositChangeDraft(draft);
  if (!plan.depositChanges.some((change) => change.id === id)) {
    throw new RangeError(`There is no deposit change with id ${id}`);
  }
  return { ...plan, depositChanges: plan.depositChanges.map((change) => (change.id === id ? toEvent(id, draft) : change)) };
}

/** Removes a deposit change. Does nothing if it is already gone. */
export function removeDepositChange(plan: PlanDocument, id: number): PlanDocument {
  return { ...plan, depositChanges: plan.depositChanges.filter((change) => change.id !== id) };
}
