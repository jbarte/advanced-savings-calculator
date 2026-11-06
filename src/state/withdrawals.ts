import { appendEvent, removeEvent, replaceEvent } from "./event-list";
import type { EventNames } from "./event-list";
import { PLAN_LIMITS } from "./plan-document";
import type { PlanDocument, WithdrawalDraft, WithdrawalEvent } from "./plan-document";
import { cleanText } from "./plan-text";
import { validateWithdrawalDraft } from "./validate-plan";

const NAMES: EventNames = { kind: "withdrawal", one: "withdrawal", many: "withdrawals" };

const toEvent = (draft: WithdrawalDraft) => (id: number): WithdrawalEvent => ({
  id,
  date: draft.date,
  amount: draft.amount,
  label: cleanText(draft.label),
});

/** Adds a withdrawal. Its id is one above the highest id in the plan. Throws a RangeError if it is invalid. */
export function addWithdrawal(plan: PlanDocument, draft: WithdrawalDraft): PlanDocument {
  validateWithdrawalDraft(draft);
  return { ...plan, withdrawals: appendEvent(plan.withdrawals, PLAN_LIMITS.maxWithdrawals, NAMES, toEvent(draft)) };
}

/** Replaces a withdrawal's fields. It keeps its id and its place in the list. */
export function updateWithdrawal(plan: PlanDocument, id: number, draft: WithdrawalDraft): PlanDocument {
  validateWithdrawalDraft(draft);
  return { ...plan, withdrawals: replaceEvent(plan.withdrawals, id, NAMES, toEvent(draft)) };
}

/** Removes a withdrawal. Does nothing if it is already gone. */
export function removeWithdrawal(plan: PlanDocument, id: number): PlanDocument {
  return { ...plan, withdrawals: removeEvent(plan.withdrawals, id) };
}
