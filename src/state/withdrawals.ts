import { PLAN_LIMITS } from "./plan-document";
import type { PlanDocument, WithdrawalDraft } from "./plan-document";
import { validateWithdrawalDraft } from "./validate-plan";

/** Adds a withdrawal. Its id is one above the highest id in the plan. Throws a RangeError if it is invalid. */
export function addWithdrawal(plan: PlanDocument, draft: WithdrawalDraft): PlanDocument {
  validateWithdrawalDraft(draft);
  if (plan.withdrawals.length >= PLAN_LIMITS.maxWithdrawals) {
    throw new RangeError(`A plan can have at most ${PLAN_LIMITS.maxWithdrawals} withdrawals`);
  }
  const id = Math.max(0, ...plan.withdrawals.map((withdrawal) => withdrawal.id)) + 1;
  return { ...plan, withdrawals: [...plan.withdrawals, { id, date: draft.date, amount: draft.amount, label: draft.label }] };
}

/** Replaces a withdrawal's fields. It keeps its id and its place in the list. */
export function updateWithdrawal(plan: PlanDocument, id: number, draft: WithdrawalDraft): PlanDocument {
  validateWithdrawalDraft(draft);
  if (!plan.withdrawals.some((withdrawal) => withdrawal.id === id)) {
    throw new RangeError(`There is no withdrawal with id ${id}`);
  }
  return {
    ...plan,
    withdrawals: plan.withdrawals.map((withdrawal) =>
      withdrawal.id === id ? { id, date: draft.date, amount: draft.amount, label: draft.label } : withdrawal,
    ),
  };
}

/** Removes a withdrawal. Does nothing if it is already gone. */
export function removeWithdrawal(plan: PlanDocument, id: number): PlanDocument {
  return { ...plan, withdrawals: plan.withdrawals.filter((withdrawal) => withdrawal.id !== id) };
}
