import { openAmountEventDialog } from "./amount-event-dialog";
import type { AmountEventDialogProps } from "./amount-event-dialog";
import { parseWithdrawalAmount } from "./parse-input";

/** A dialog to add or edit a withdrawal. */
export function openWithdrawalDialog(props: AmountEventDialogProps): void {
  openAmountEventDialog({ key: "withdrawal", name: "Withdrawal", parseAmount: parseWithdrawalAmount }, props);
}
