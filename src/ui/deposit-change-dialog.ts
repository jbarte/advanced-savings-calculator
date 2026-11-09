import { addMonths } from "../core/year-month";
import type { YearMonth } from "../core/year-month";
import type { DepositChangeDraft } from "../state/plan-document";
import { renderTextField } from "./components";
import { DEFAULT_MONTHS_AHEAD, earliestMonth, inputIn, openFormDialog, showErrors } from "./dialog-form";
import { formatKronor } from "./format";
import {
  errorMessage,
  monthInputValue,
  parseDepositAmount,
  parseLabel,
  parseMonthOnOrAfter,
  parseOptionalMonthNotBefore,
  parseYearMonth,
} from "./parse-input";
import { messages } from "./i18n";

export interface DepositChangeDialogProps {
  /** The plan's start month. A change can't start earlier. */
  readonly start: YearMonth;
  /** The fields to start from when editing. Leave out to add a new change. */
  readonly initial?: DepositChangeDraft;
  /** The month to start the From field on when adding (for example the one tapped on the chart). */
  readonly defaultDate?: YearMonth | undefined;
  readonly onSave: (draft: DepositChangeDraft) => void;
}

/**
 * A dialog to change the monthly deposit from a month onward, or only for a period. An amount of 0 pauses
 * saving. Like the withdrawal dialog, nothing reaches the plan until Save.
 */
export function openDepositChangeDialog(props: DepositChangeDialogProps): void {
  const { initial } = props;
  const earliest = earliestMonth(props.start, initial?.startDate);
  const nothing = (): void => undefined; // the dialog reads the inputs itself on Save

  const label = renderTextField({
    id: "deposit-label",
    label: messages.common.label,
    unit: "",
    value: initial?.label ?? "",
    dataKey: "deposit-label",
    placeholder: messages.kinds.depositChange,
    validate: errorMessage((text) => parseLabel(text, messages.kinds.depositChange)),
    onCommit: nothing,
  });
  const amount = renderTextField({
    id: "deposit-amount",
    label: messages.dialogs.depositChange.amount,
    unit: messages.units.perMonthField,
    value: initial ? formatKronor(initial.amount) : "",
    dataKey: "deposit-amount",
    inputMode: "numeric",
    validate: errorMessage(parseDepositAmount),
    onCommit: nothing,
  });
  const from = renderTextField({
    id: "deposit-from",
    label: messages.dialogs.depositChange.from,
    unit: "",
    type: "month",
    value: monthInputValue(initial?.startDate ?? props.defaultDate ?? addMonths(props.start, DEFAULT_MONTHS_AHEAD)),
    dataKey: "deposit-from",
    placeholder: messages.common.yearMonthPlaceholder,
    validate: errorMessage((text) => parseMonthOnOrAfter(text, earliest)),
    onCommit: nothing,
  });
  const fromInput = inputIn(from);

  /** The start month as typed, or null while it is empty or invalid. */
  const typedStart = (): YearMonth | null => {
    const result = parseYearMonth(fromInput.value);
    return result.ok ? result.value : null;
  };

  const until = renderTextField({
    id: "deposit-until",
    label: messages.dialogs.depositChange.until,
    unit: "",
    type: "month",
    value: initial?.endDate ? monthInputValue(initial.endDate) : "",
    dataKey: "deposit-until",
    placeholder: messages.common.yearMonthPlaceholder,
    validate: errorMessage((text) => parseOptionalMonthNotBefore(text, typedStart())),
    onCommit: nothing,
  });
  const untilInput = inputIn(until);
  // Moving the start can make the end invalid (or valid again), so check the end again.
  fromInput.addEventListener("input", () => untilInput.dispatchEvent(new Event("input")));

  const inputs = [inputIn(label), inputIn(amount), fromInput, untilInput];

  /** Returns true when the change was valid and has been handed over. */
  const save = (): boolean => {
    if (!showErrors(inputs)) return false;
    const parsedLabel = parseLabel(inputs[0]?.value ?? "", messages.kinds.depositChange);
    const parsedAmount = parseDepositAmount(inputs[1]?.value ?? "");
    const parsedFrom = parseMonthOnOrAfter(inputs[2]?.value ?? "", earliest);
    if (!parsedLabel.ok || !parsedAmount.ok || !parsedFrom.ok) return false;
    const parsedUntil = parseOptionalMonthNotBefore(inputs[3]?.value ?? "", parsedFrom.value);
    if (!parsedUntil.ok) return false;
    props.onSave({ label: parsedLabel.value, amount: parsedAmount.value, startDate: parsedFrom.value, endDate: parsedUntil.value });
    return true;
  };

  openFormDialog({
    title: initial ? messages.dialogs.depositChange.edit : messages.dialogs.depositChange.add,
    primaryLabel: initial ? messages.common.save : messages.common.add,
    fields: [label, amount, from, until],
    save,
  });
}
