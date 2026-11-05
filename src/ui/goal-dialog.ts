import { addMonths } from "../core/year-month";
import type { YearMonth } from "../core/year-month";
import type { GoalPlan } from "../state/plan-document";
import { renderTextField } from "./components";
import { earliestMonth, inputIn, openFormDialog, showErrors } from "./dialog-form";
import { formatKronor } from "./format";
import { errorMessage, monthInputValue, parseGoalAmount, parseMonthOnOrAfter } from "./parse-input";
import { messages } from "./i18n";

export interface GoalDialogProps {
  /** The plan's start month. A new goal can't be earlier; an edited one may keep its own earlier date. */
  readonly start: YearMonth;
  /** The month the goal starts at in a new dialog: the end of the plan's horizon. */
  readonly horizonEnd: YearMonth;
  /** The goal to start from when editing. Leave out to set a new goal. */
  readonly initial?: GoalPlan;
  readonly onSave: (goal: GoalPlan) => void;
}

/** A dialog to set or edit the savings goal. Nothing reaches the plan until Save. */
export function openGoalDialog(props: GoalDialogProps): void {
  const { initial } = props;
  const earliest = earliestMonth(props.start, initial?.date);
  const nothing = (): void => undefined; // the dialog reads the inputs itself on Save

  const amount = renderTextField({
    id: "goal-amount",
    label: messages.dialogs.goal.amount,
    unit: messages.units.currencyField,
    value: initial ? formatKronor(initial.amount) : "",
    dataKey: "goal-amount",
    inputMode: "numeric",
    validate: errorMessage(parseGoalAmount),
    onCommit: nothing,
  });
  const month = renderTextField({
    id: "goal-month",
    label: messages.dialogs.goal.by,
    unit: "",
    type: "month",
    value: monthInputValue(initial?.date ?? props.horizonEnd),
    dataKey: "goal-month",
    placeholder: messages.common.yearMonthPlaceholder,
    validate: errorMessage((text) => parseMonthOnOrAfter(text, earliest)),
    onCommit: nothing,
  });
  const [amountInput, monthInput] = [inputIn(amount), inputIn(month)];

  /** Returns true when the goal was valid and has been handed over. */
  const save = (): boolean => {
    if (!showErrors([amountInput, monthInput])) return false;
    const parsedAmount = parseGoalAmount(amountInput.value);
    const parsedMonth = parseMonthOnOrAfter(monthInput.value, earliest);
    if (!parsedAmount.ok || !parsedMonth.ok) return false;
    props.onSave({ amount: parsedAmount.value, date: parsedMonth.value });
    return true;
  };

  openFormDialog({
    title: initial ? messages.dialogs.goal.edit : messages.dialogs.goal.add,
    primaryLabel: initial ? messages.common.save : messages.dialogs.goal.addConfirm,
    fields: [amount, month],
    save,
  });
}

/** The first month a new goal is offered: the end of the plan's horizon. */
export function horizonEndOf(start: YearMonth, horizonMonths: number): YearMonth {
  return addMonths(start, horizonMonths);
}
