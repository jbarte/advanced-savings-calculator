import { addMonths } from "../core/year-month";
import type { YearMonth } from "../core/year-month";
import type { WithdrawalDraft } from "../state/plan-document";
import { openModal, renderModal, renderTextField } from "./components";
import { h } from "./dom";
import { formatKronor } from "./format";
import { monthInputValue, parseLabel, parseMonthOnOrAfter, parseWithdrawalAmount } from "./parse-input";
import type { ParseResult } from "./parse-input";

export interface WithdrawalDialogProps {
  /** The plan's start month. A withdrawal can't be earlier. */
  readonly start: YearMonth;
  /** The fields to start from when editing. Leave out to add a new withdrawal. */
  readonly initial?: WithdrawalDraft;
  readonly onSave: (draft: WithdrawalDraft) => void;
}

const messageOf =
  <T>(parse: (text: string) => ParseResult<T>) =>
  (text: string): string | null => {
    const result = parse(text);
    return result.ok ? null : result.message;
  };

function inputIn(field: HTMLElement): HTMLInputElement {
  const input = field.querySelector("input");
  if (!input) throw new Error("Text field has no input");
  return input;
}

/**
 * A dialog to add or edit a withdrawal. Nothing reaches the plan until Save, so typing never causes a
 * page re-render. The fields check themselves as the user types, and Save checks them all again.
 */
export function openWithdrawalDialog(props: WithdrawalDialogProps): void {
  const { initial } = props;
  const nothing = (): void => undefined; // the dialog reads the inputs itself on Save

  const label = renderTextField({
    id: "withdrawal-label",
    label: "Label",
    unit: "",
    value: initial?.label ?? "",
    dataKey: "withdrawal-label",
    placeholder: "Withdrawal",
    validate: messageOf(parseLabel),
    onCommit: nothing,
  });
  const amount = renderTextField({
    id: "withdrawal-amount",
    label: "Amount",
    unit: "KR",
    value: initial ? formatKronor(initial.amount) : "",
    dataKey: "withdrawal-amount",
    inputMode: "numeric",
    validate: messageOf(parseWithdrawalAmount),
    onCommit: nothing,
  });
  const month = renderTextField({
    id: "withdrawal-month",
    label: "Month",
    unit: "",
    type: "month",
    value: monthInputValue(initial?.date ?? addMonths(props.start, 12)),
    dataKey: "withdrawal-month",
    placeholder: "YYYY-MM",
    validate: messageOf((text) => parseMonthOnOrAfter(text, props.start)),
    onCommit: nothing,
  });

  const inputs = [inputIn(label), inputIn(amount), inputIn(month)];

  /** Returns true when the withdrawal was valid and has been handed over. */
  const save = (): boolean => {
    for (const input of inputs) input.dispatchEvent(new Event("input")); // show any error messages
    const firstInvalid = inputs.find((input) => input.getAttribute("aria-invalid") === "true");
    if (firstInvalid) {
      firstInvalid.focus();
      return false;
    }
    const parsedLabel = parseLabel(inputs[0]?.value ?? "");
    const parsedAmount = parseWithdrawalAmount(inputs[1]?.value ?? "");
    const parsedMonth = parseMonthOnOrAfter(inputs[2]?.value ?? "", props.start);
    if (!parsedLabel.ok || !parsedAmount.ok || !parsedMonth.ok) return false;
    props.onSave({ label: parsedLabel.value, amount: parsedAmount.value, date: parsedMonth.value });
    return true;
  };

  const body = h("div", { class: "modal__body" }, label, amount, month);
  const dialog = renderModal({
    title: initial ? "Edit withdrawal" : "Add withdrawal",
    body,
    primaryLabel: initial ? "Save" : "Add",
    secondaryLabel: "Cancel",
    onPrimary: save,
  });
  body.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (save()) dialog.close();
  });

  openModal(dialog);
}
