import { addMonths } from "../core/year-month";
import type { YearMonth } from "../core/year-month";
import type { Ore } from "../core/types";
import { renderTextField } from "./components";
import { DEFAULT_MONTHS_AHEAD, earliestMonth, inputIn, openFormDialog, showErrors } from "./dialog-form";
import { formatKronor } from "./format";
import { errorMessage, monthInputValue, parseLabel, parseMonthOnOrAfter } from "./parse-input";
import type { ParseResult } from "./parse-input";

/** An event made of a label, an amount and one month: a withdrawal or a one-time deposit. */
export interface AmountEventDraft {
  readonly label: string;
  readonly amount: Ore;
  readonly date: YearMonth;
}

/** What differs between the kinds that use this dialog. */
export interface AmountEventKind {
  /** Prefix for the field ids and focus keys, e.g. "withdrawal". */
  readonly key: string;
  /** Used for the label when the field is left empty, and in the titles ("Add withdrawal"). */
  readonly name: string;
  readonly parseAmount: (text: string) => ParseResult<Ore>;
}

export interface AmountEventDialogProps {
  /** The plan's start month. A new event can't be earlier; an edited one may keep its own earlier date. */
  readonly start: YearMonth;
  /** The fields to start from when editing. Leave out to add a new event. */
  readonly initial?: AmountEventDraft;
  readonly onSave: (draft: AmountEventDraft) => void;
}

/**
 * A dialog to add or edit an event with an amount in one month. Nothing reaches the plan until Save, so typing
 * never causes a page re-render. The fields check themselves as the user types, and Save checks them all again.
 */
export function openAmountEventDialog(kind: AmountEventKind, props: AmountEventDialogProps): void {
  const { initial } = props;
  const earliest = earliestMonth(props.start, initial?.date);
  const nothing = (): void => undefined; // the dialog reads the inputs itself on Save

  const label = renderTextField({
    id: `${kind.key}-label`,
    label: "Label",
    unit: "",
    value: initial?.label ?? "",
    dataKey: `${kind.key}-label`,
    placeholder: kind.name,
    validate: errorMessage((text) => parseLabel(text, kind.name)),
    onCommit: nothing,
  });
  const amount = renderTextField({
    id: `${kind.key}-amount`,
    label: "Amount",
    unit: "KR",
    value: initial ? formatKronor(initial.amount) : "",
    dataKey: `${kind.key}-amount`,
    inputMode: "numeric",
    validate: errorMessage(kind.parseAmount),
    onCommit: nothing,
  });
  const month = renderTextField({
    id: `${kind.key}-month`,
    label: "Month",
    unit: "",
    type: "month",
    value: monthInputValue(initial?.date ?? addMonths(props.start, DEFAULT_MONTHS_AHEAD)),
    dataKey: `${kind.key}-month`,
    placeholder: "YYYY-MM",
    validate: errorMessage((text) => parseMonthOnOrAfter(text, earliest)),
    onCommit: nothing,
  });

  const [labelInput, amountInput, monthInput] = [inputIn(label), inputIn(amount), inputIn(month)];

  /** Returns true when the event was valid and has been handed over. */
  const save = (): boolean => {
    if (!showErrors([labelInput, amountInput, monthInput])) return false;
    const parsedLabel = parseLabel(labelInput.value, kind.name);
    const parsedAmount = kind.parseAmount(amountInput.value);
    const parsedMonth = parseMonthOnOrAfter(monthInput.value, earliest);
    if (!parsedLabel.ok || !parsedAmount.ok || !parsedMonth.ok) return false;
    props.onSave({ label: parsedLabel.value, amount: parsedAmount.value, date: parsedMonth.value });
    return true;
  };

  const lowerName = kind.name.charAt(0).toLowerCase() + kind.name.slice(1);
  openFormDialog({
    title: initial ? `Edit ${lowerName}` : `Add ${lowerName}`,
    primaryLabel: initial ? "Save" : "Add",
    fields: [label, amount, month],
    save,
  });
}
