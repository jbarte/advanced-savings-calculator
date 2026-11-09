import { addMonths } from "../core/year-month";
import type { YearMonth } from "../core/year-month";
import type { Ore } from "../core/types";
import { renderTextField } from "./components";
import { DEFAULT_MONTHS_AHEAD, earliestMonth, inputIn, openFormDialog, showErrors } from "./dialog-form";
import { formatKronor } from "./format";
import { errorMessage, monthInputValue, parseLabel, parseMonthOnOrAfter } from "./parse-input";
import type { ParseResult } from "./parse-input";
import { messages } from "./i18n";

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
  /** Used for the label when the field is left empty. */
  readonly name: string;
  /** The dialog titles when adding and when editing. */
  readonly titles: { readonly add: string; readonly edit: string };
  readonly parseAmount: (text: string) => ParseResult<Ore>;
}

export interface AmountEventDialogProps {
  /** The plan's start month. A new event can't be earlier; an edited one may keep its own earlier date. */
  readonly start: YearMonth;
  /** The fields to start from when editing. Leave out to add a new event. */
  readonly initial?: AmountEventDraft;
  /** The month to start the date field on when adding (for example the one tapped on the chart). */
  readonly defaultDate?: YearMonth | undefined;
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
    label: messages.common.label,
    unit: "",
    value: initial?.label ?? "",
    dataKey: `${kind.key}-label`,
    placeholder: kind.name,
    validate: errorMessage((text) => parseLabel(text, kind.name)),
    onCommit: nothing,
  });
  const amount = renderTextField({
    id: `${kind.key}-amount`,
    label: messages.common.amount,
    unit: messages.units.currencyField,
    value: initial ? formatKronor(initial.amount) : "",
    dataKey: `${kind.key}-amount`,
    inputMode: "numeric",
    validate: errorMessage(kind.parseAmount),
    onCommit: nothing,
  });
  const month = renderTextField({
    id: `${kind.key}-month`,
    label: messages.common.month,
    unit: "",
    type: "month",
    value: monthInputValue(initial?.date ?? props.defaultDate ?? addMonths(props.start, DEFAULT_MONTHS_AHEAD)),
    dataKey: `${kind.key}-month`,
    placeholder: messages.common.yearMonthPlaceholder,
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

  openFormDialog({
    title: initial ? kind.titles.edit : kind.titles.add,
    primaryLabel: initial ? messages.common.save : messages.common.add,
    fields: [label, amount, month],
    save,
  });
}
