import { PLAN_LIMITS } from "./plan-document";
import type { OneTimeDepositDraft, PlanDocument } from "./plan-document";
import { validateOneTimeDepositDraft } from "./validate-plan";

function toEvent(id: number, draft: OneTimeDepositDraft): PlanDocument["oneTimeDeposits"][number] {
  return { id, date: draft.date, amount: draft.amount, label: draft.label.trim() };
}

/** Adds a one-time deposit. Its id is one above the highest one-time deposit id. Throws a RangeError if it is invalid. */
export function addOneTimeDeposit(plan: PlanDocument, draft: OneTimeDepositDraft): PlanDocument {
  validateOneTimeDepositDraft(draft);
  if (plan.oneTimeDeposits.length >= PLAN_LIMITS.maxOneTimeDeposits) {
    throw new RangeError(`A plan can have at most ${PLAN_LIMITS.maxOneTimeDeposits} one-time deposits`);
  }
  const id = Math.max(0, ...plan.oneTimeDeposits.map((deposit) => deposit.id)) + 1;
  return { ...plan, oneTimeDeposits: [...plan.oneTimeDeposits, toEvent(id, draft)] };
}

/** Replaces a one-time deposit's fields. It keeps its id and its place in the list. */
export function updateOneTimeDeposit(plan: PlanDocument, id: number, draft: OneTimeDepositDraft): PlanDocument {
  validateOneTimeDepositDraft(draft);
  if (!plan.oneTimeDeposits.some((deposit) => deposit.id === id)) {
    throw new RangeError(`There is no one-time deposit with id ${id}`);
  }
  return { ...plan, oneTimeDeposits: plan.oneTimeDeposits.map((deposit) => (deposit.id === id ? toEvent(id, draft) : deposit)) };
}

/** Removes a one-time deposit. Does nothing if it is already gone. */
export function removeOneTimeDeposit(plan: PlanDocument, id: number): PlanDocument {
  return { ...plan, oneTimeDeposits: plan.oneTimeDeposits.filter((deposit) => deposit.id !== id) };
}
