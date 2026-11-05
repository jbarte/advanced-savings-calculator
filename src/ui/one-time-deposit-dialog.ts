import { openAmountEventDialog } from "./amount-event-dialog";
import type { AmountEventDialogProps } from "./amount-event-dialog";
import { parseOneTimeDepositAmount } from "./parse-input";
import { messages } from "./i18n";

/** A dialog to add or edit a single extra deposit in one month. */
export function openOneTimeDepositDialog(props: AmountEventDialogProps): void {
  openAmountEventDialog({ key: "one-time", name: messages.kinds.oneTimeDeposit, titles: messages.dialogs.oneTimeDeposit, parseAmount: parseOneTimeDepositAmount }, props);
}
