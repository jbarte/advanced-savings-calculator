import { openAmountEventDialog } from "./amount-event-dialog";
import type { AmountEventDialogProps } from "./amount-event-dialog";
import { parseOneTimeDepositAmount } from "./parse-input";

/** A dialog to add or edit a single extra deposit in one month. */
export function openOneTimeDepositDialog(props: AmountEventDialogProps): void {
  openAmountEventDialog({ key: "one-time", name: "One-time deposit", parseAmount: parseOneTimeDepositAmount }, props);
}
