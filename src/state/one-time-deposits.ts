import { appendEvent, removeEvent, replaceEvent } from "./event-list";
import type { EventNames } from "./event-list";
import { PLAN_LIMITS } from "./plan-document";
import type { OneTimeDepositDraft, OneTimeDepositEvent, PlanDocument } from "./plan-document";
import { validateOneTimeDepositDraft } from "./validate-plan";

const NAMES: EventNames = { kind: "one-time-deposit", one: "one-time deposit", many: "one-time deposits" };

const toEvent = (draft: OneTimeDepositDraft) => (id: number): OneTimeDepositEvent => ({
  id,
  date: draft.date,
  amount: draft.amount,
  label: draft.label.trim(),
});

/** Adds a one-time deposit. Its id is one above the highest one-time deposit id. Throws a RangeError if it is invalid. */
export function addOneTimeDeposit(plan: PlanDocument, draft: OneTimeDepositDraft): PlanDocument {
  validateOneTimeDepositDraft(draft);
  return { ...plan, oneTimeDeposits: appendEvent(plan.oneTimeDeposits, PLAN_LIMITS.maxOneTimeDeposits, NAMES, toEvent(draft)) };
}

/** Replaces a one-time deposit's fields. It keeps its id and its place in the list. */
export function updateOneTimeDeposit(plan: PlanDocument, id: number, draft: OneTimeDepositDraft): PlanDocument {
  validateOneTimeDepositDraft(draft);
  return { ...plan, oneTimeDeposits: replaceEvent(plan.oneTimeDeposits, id, NAMES, toEvent(draft)) };
}

/** Removes a one-time deposit. Does nothing if it is already gone. */
export function removeOneTimeDeposit(plan: PlanDocument, id: number): PlanDocument {
  return { ...plan, oneTimeDeposits: removeEvent(plan.oneTimeDeposits, id) };
}
