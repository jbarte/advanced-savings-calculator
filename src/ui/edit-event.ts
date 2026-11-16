import type { TimelineEntry } from "../state/timeline";
import type { ScenarioView } from "../state/types";
import type { Actions } from "./actions";
import { openDepositChangeDialog } from "./deposit-change-dialog";
import { openOneTimeDepositDialog } from "./one-time-deposit-dialog";
import { openWithdrawalDialog } from "./withdrawal-dialog";

/** The name the user gave an event. */
export function eventTitle(entry: TimelineEntry): string {
  switch (entry.kind) {
    case "withdrawal":
      return entry.withdrawal.label;
    case "deposit-change":
      return entry.change.label;
    case "one-time-deposit":
      return entry.deposit.label;
  }
}

/** Opens the dialog to edit an event, filled in with what it is now. The list's Edit button and the chart's both come here. */
export function openEditEvent(scenario: ScenarioView, entry: TimelineEntry, actions: Actions): void {
  const { start } = scenario;
  switch (entry.kind) {
    case "withdrawal": {
      const { withdrawal } = entry;
      openWithdrawalDialog({
        start,
        initial: { label: withdrawal.label, amount: withdrawal.amount, date: withdrawal.date },
        onSave: (draft) => actions.updateWithdrawal(withdrawal.id, draft),
      });
      return;
    }
    case "deposit-change": {
      const { change } = entry;
      openDepositChangeDialog({
        start,
        initial: { label: change.label, amount: change.amount, startDate: change.startDate, endDate: change.endDate },
        onSave: (draft) => actions.updateDepositChange(change.id, draft),
      });
      return;
    }
    case "one-time-deposit": {
      const { deposit } = entry;
      openOneTimeDepositDialog({
        start,
        initial: { label: deposit.label, amount: deposit.amount, date: deposit.date },
        onSave: (draft) => actions.updateOneTimeDeposit(deposit.id, draft),
      });
      return;
    }
  }
}
