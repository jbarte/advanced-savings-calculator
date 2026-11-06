import { removeEvent } from "./event-list";
import type { PlanDocument } from "./plan-document";
import type { EventKey } from "./timeline";

/** A plan with one event left out, and the label of that event (for naming the copy). */
export interface WithoutEvent {
  readonly label: string;
  readonly plan: PlanDocument;
}

function idOf(key: EventKey, prefix: string): number | null {
  if (!key.startsWith(prefix)) return null;
  const id = Number(key.slice(prefix.length));
  return Number.isSafeInteger(id) ? id : null;
}

/**
 * The plan as it would be without the event `key` names (`withdrawal-<id>`, `deposit-change-<id>` or
 * `one-time-deposit-<id>`), for trying "what if I skipped this?". Null when there is no such event.
 */
export function planWithoutEvent(plan: PlanDocument, key: EventKey): WithoutEvent | null {
  const withdrawal = idOf(key, "withdrawal-");
  const found = withdrawal === null ? undefined : plan.withdrawals.find((event) => event.id === withdrawal);
  if (found) return { label: found.label, plan: { ...plan, withdrawals: removeEvent(plan.withdrawals, found.id) } };

  const change = idOf(key, "deposit-change-");
  const foundChange = change === null ? undefined : plan.depositChanges.find((event) => event.id === change);
  if (foundChange) return { label: foundChange.label, plan: { ...plan, depositChanges: removeEvent(plan.depositChanges, foundChange.id) } };

  const deposit = idOf(key, "one-time-deposit-");
  const foundDeposit = deposit === null ? undefined : plan.oneTimeDeposits.find((event) => event.id === deposit);
  if (foundDeposit) return { label: foundDeposit.label, plan: { ...plan, oneTimeDeposits: removeEvent(plan.oneTimeDeposits, foundDeposit.id) } };
  return null;
}
