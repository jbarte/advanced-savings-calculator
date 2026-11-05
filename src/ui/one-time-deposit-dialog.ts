import { addMonths } from "../core/year-month";
import type { YearMonth } from "../core/year-month";
import type { OneTimeDepositDraft } from "../state/plan-document";
import { renderTextField } from "./components";
import { DEFAULT_MONTHS_AHEAD, earliestMonth, inputIn, openFormDialog, showErrors } from "./dialog-form";
import { formatKronor } from "./format";
import { errorMessage, monthInputValue, parseLabel, parseMonthOnOrAfter, parseOneTimeDepositAmount } from "./parse-input";

export interface OneTimeDepositDialogProps {
  /** The plan's start month. A deposit can't be earlier. */
  readonly start: YearMonth;
  /** The fields to start from when editing. Leave out to add a new deposit. */
  readonly initial?: OneTimeDepositDraft;
  readonly onSave: (draft: OneTimeDepositDraft) => void;
}

const DEFAULT_LABEL = "One-time deposit";

/** A dialog to add or edit a single extra deposit in one month. Nothing reaches the plan until Save. */
export function openOneTimeDepositDialog(props: OneTimeDepositDialogProps): void {
  const { initial } = props;
  const earliest = earliestMonth(props.start, initial?.date);
  const nothing = (): void => undefined; // the dialog reads the inputs itself on Save

  const label = renderTextField({
    id: "one-time-label",
    label: "Label",
    unit: "",
    value: initial?.label ?? "",
    dataKey: "one-time-label",
    placeholder: DEFAULT_LABEL,
    validate: errorMessage((text) => parseLabel(text, DEFAULT_LABEL)),
    onCommit: nothing,
  });
  const amount = renderTextField({
    id: "one-time-amount",
    label: "Amount",
    unit: "KR",
    value: initial ? formatKronor(initial.amount) : "",
    dataKey: "one-time-amount",
    inputMode: "numeric",
    validate: errorMessage(parseOneTimeDepositAmount),
    onCommit: nothing,
  });
  const month = renderTextField({
    id: "one-time-month",
    label: "Month",
    unit: "",
    type: "month",
    value: monthInputValue(initial?.date ?? addMonths(props.start, DEFAULT_MONTHS_AHEAD)),
    dataKey: "one-time-month",
    placeholder: "YYYY-MM",
    validate: errorMessage((text) => parseMonthOnOrAfter(text, earliest)),
    onCommit: nothing,
  });

  const inputs = [inputIn(label), inputIn(amount), inputIn(month)];

  /** Returns true when the deposit was valid and has been handed over. */
  const save = (): boolean => {
    if (!showErrors(inputs)) return false;
    const parsedLabel = parseLabel(inputs[0]?.value ?? "", DEFAULT_LABEL);
    const parsedAmount = parseOneTimeDepositAmount(inputs[1]?.value ?? "");
    const parsedMonth = parseMonthOnOrAfter(inputs[2]?.value ?? "", earliest);
    if (!parsedLabel.ok || !parsedAmount.ok || !parsedMonth.ok) return false;
    props.onSave({ label: parsedLabel.value, amount: parsedAmount.value, date: parsedMonth.value });
    return true;
  };

  openFormDialog({
    title: initial ? "Edit one-time deposit" : "Add one-time deposit",
    primaryLabel: initial ? "Save" : "Add",
    fields: [label, amount, month],
    save,
  });
}
