import { openAmountEventDialog } from "./amount-event-dialog";
import type { AmountEventDialogProps } from "./amount-event-dialog";
import { parseWithdrawalAmount } from "./parse-input";
import { messages } from "./i18n";

/** A dialog to add or edit a withdrawal. */
export function openWithdrawalDialog(props: AmountEventDialogProps): void {
  openAmountEventDialog({ key: "withdrawal", name: messages.kinds.withdrawal, titles: messages.dialogs.withdrawal, parseAmount: parseWithdrawalAmount }, props);
}
