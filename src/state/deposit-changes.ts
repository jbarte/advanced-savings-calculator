import { appendEvent, removeEvent, replaceEvent } from "./event-list";
import { PLAN_LIMITS } from "./plan-document";
import type { DepositChangeDraft, DepositChangeEvent, PlanDocument } from "./plan-document";
import { validateDepositChangeDraft } from "./validate-plan";

const NAMES = { one: "deposit change", many: "deposit changes" };

const toEvent = (draft: DepositChangeDraft) => (id: number): DepositChangeEvent => ({
  id,
  startDate: draft.startDate,
  endDate: draft.endDate,
  amount: draft.amount,
  label: draft.label.trim(),
});

/** Adds a deposit change. Its id is one above the highest deposit change id. Throws a RangeError if it is invalid. */
export function addDepositChange(plan: PlanDocument, draft: DepositChangeDraft): PlanDocument {
  validateDepositChangeDraft(draft);
  return { ...plan, depositChanges: appendEvent(plan.depositChanges, PLAN_LIMITS.maxDepositChanges, NAMES, toEvent(draft)) };
}

/** Replaces a deposit change's fields. It keeps its id and its place in the list. */
export function updateDepositChange(plan: PlanDocument, id: number, draft: DepositChangeDraft): PlanDocument {
  validateDepositChangeDraft(draft);
  return { ...plan, depositChanges: replaceEvent(plan.depositChanges, id, NAMES, toEvent(draft)) };
}

/** Removes a deposit change. Does nothing if it is already gone. */
export function removeDepositChange(plan: PlanDocument, id: number): PlanDocument {
  return { ...plan, depositChanges: removeEvent(plan.depositChanges, id) };
}
