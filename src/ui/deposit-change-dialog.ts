import { addMonths } from "../core/year-month";
import type { YearMonth } from "../core/year-month";
import type { DepositChangeDraft } from "../state/plan-document";
import { renderTextField } from "./components";
import { DEFAULT_MONTHS_AHEAD, inputIn, openFormDialog, showErrors } from "./dialog-form";
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

export interface DepositChangeDialogProps {
  /** The plan's start month. A change can't start earlier. */
  readonly start: YearMonth;
  /** The fields to start from when editing. Leave out to add a new change. */
  readonly initial?: DepositChangeDraft;
  readonly onSave: (draft: DepositChangeDraft) => void;
}

const DEFAULT_LABEL = "Deposit change";

/**
 * A dialog to change the monthly deposit from a month onward, or only for a period. An amount of 0 pauses
 * saving. Like the withdrawal dialog, nothing reaches the plan until Save.
 */
export function openDepositChangeDialog(props: DepositChangeDialogProps): void {
  const { initial } = props;
  const nothing = (): void => undefined; // the dialog reads the inputs itself on Save

  const label = renderTextField({
    id: "deposit-label",
    label: "Label",
    unit: "",
    value: initial?.label ?? "",
    dataKey: "deposit-label",
    placeholder: DEFAULT_LABEL,
    validate: errorMessage((text) => parseLabel(text, DEFAULT_LABEL)),
    onCommit: nothing,
  });
  const amount = renderTextField({
    id: "deposit-amount",
    label: "New monthly deposit (0 pauses saving)",
    unit: "KR/MO",
    value: initial ? formatKronor(initial.amount) : "",
    dataKey: "deposit-amount",
    inputMode: "numeric",
    validate: errorMessage(parseDepositAmount),
    onCommit: nothing,
  });
  const from = renderTextField({
    id: "deposit-from",
    label: "From month",
    unit: "",
    type: "month",
    value: monthInputValue(initial?.startDate ?? addMonths(props.start, DEFAULT_MONTHS_AHEAD)),
    dataKey: "deposit-from",
    placeholder: "YYYY-MM",
    validate: errorMessage((text) => parseMonthOnOrAfter(text, props.start)),
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
    label: "Until month (optional, leave empty for no end)",
    unit: "",
    type: "month",
    value: initial?.endDate ? monthInputValue(initial.endDate) : "",
    dataKey: "deposit-until",
    placeholder: "YYYY-MM",
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
    const parsedLabel = parseLabel(inputs[0]?.value ?? "", DEFAULT_LABEL);
    const parsedAmount = parseDepositAmount(inputs[1]?.value ?? "");
    const parsedFrom = parseMonthOnOrAfter(inputs[2]?.value ?? "", props.start);
    if (!parsedLabel.ok || !parsedAmount.ok || !parsedFrom.ok) return false;
    const parsedUntil = parseOptionalMonthNotBefore(inputs[3]?.value ?? "", parsedFrom.value);
    if (!parsedUntil.ok) return false;
    props.onSave({ label: parsedLabel.value, amount: parsedAmount.value, startDate: parsedFrom.value, endDate: parsedUntil.value });
    return true;
  };

  openFormDialog({
    title: initial ? "Edit deposit change" : "Change monthly deposit",
    primaryLabel: initial ? "Save" : "Add",
    fields: [label, amount, from, until],
    save,
  });
}
