import type { YearMonth } from "../core/year-month";
import { PLAN_LIMITS } from "../state/plan-document";
import type { ScenarioView } from "../state/types";
import type { Actions } from "./actions";
import { openDepositChangeDialog } from "./deposit-change-dialog";
import { openEventTypeDialog } from "./event-type-dialog";
import type { EventType } from "./event-type-dialog";
import { openOneTimeDepositDialog } from "./one-time-deposit-dialog";
import { openWithdrawalDialog } from "./withdrawal-dialog";

/** Which kinds of event have reached their limit in the plan. */
export function fullEventKinds(scenario: ScenarioView): Record<EventType, boolean> {
  return {
    withdrawal: scenario.withdrawals.length >= PLAN_LIMITS.maxWithdrawals,
    "deposit-change": scenario.depositChanges.length >= PLAN_LIMITS.maxDepositChanges,
    "one-time-deposit": scenario.oneTimeDeposits.length >= PLAN_LIMITS.maxOneTimeDeposits,
  };
}

/**
 * The add-event flow: asks which kind, then opens that kind's dialog. With `date` (a month tapped on the chart) the
 * dialog starts with that month filled in. Does nothing when every kind is full.
 */
export function openAddEvent(scenario: ScenarioView, actions: Actions, date?: YearMonth): void {
  const full = fullEventKinds(scenario);
  if (Object.values(full).every(Boolean)) return;
  const { start } = scenario;
  const choose = (type: EventType): void => {
    if (type === "withdrawal") openWithdrawalDialog({ start, defaultDate: date, onSave: (draft) => actions.addWithdrawal(draft) });
    else if (type === "deposit-change") openDepositChangeDialog({ start, defaultDate: date, onSave: (draft) => actions.addDepositChange(draft) });
    else openOneTimeDepositDialog({ start, defaultDate: date, onSave: (draft) => actions.addOneTimeDeposit(draft) });
  };
  openEventTypeDialog({ full, onChoose: choose });
}
