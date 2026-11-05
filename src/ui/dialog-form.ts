import { MONTHS_PER_YEAR, earlierOf } from "../core/year-month";
import type { YearMonth } from "../core/year-month";
import { openModal, renderModal } from "./components";
import { h } from "./dom";

/** A new event starts one year after the plan start in its dialog. It is a starting point, not a rule. */
export const DEFAULT_MONTHS_AHEAD = MONTHS_PER_YEAR;

/**
 * The earliest month a dialog accepts: the plan start, or an event's own earlier date when editing it, so an
 * event that started before the plan (allowed by the rules) can be edited without being moved.
 */
export function earliestMonth(start: YearMonth, current?: YearMonth): YearMonth {
  return current === undefined ? start : earlierOf(start, current);
}

/** The <input> inside a text field made by `renderTextField`. */
export function inputIn(field: HTMLElement): HTMLInputElement {
  const input = field.querySelector("input");
  if (!input) throw new Error("Text field has no input");
  return input;
}

/**
 * Shows the error message of every field. Returns true when all are valid. Otherwise it puts focus on
 * the first invalid field and returns false.
 */
export function showErrors(inputs: readonly HTMLInputElement[]): boolean {
  for (const input of inputs) input.dispatchEvent(new Event("input")); // each field checks itself on input
  const firstInvalid = inputs.find((input) => input.getAttribute("aria-invalid") === "true");
  if (!firstInvalid) return true;
  firstInvalid.focus();
  return false;
}

export interface FormDialogProps {
  readonly title: string;
  readonly primaryLabel: string;
  /** The form fields. */
  readonly fields: readonly HTMLElement[];
  /** Checks the fields and hands the values over. Returns true when they were valid. */
  readonly save: () => boolean;
}

/**
 * Opens a dialog around form fields. The primary button and Enter in a field both call `save`, and the dialog
 * closes only when it returns true. Nothing reaches the plan until then, so typing never causes a re-render.
 */
export function openFormDialog(props: FormDialogProps): void {
  const body = h("div", { class: "modal__body" }, ...props.fields);
  const dialog = renderModal({
    title: props.title,
    body,
    primaryLabel: props.primaryLabel,
    secondaryLabel: "Cancel",
    onPrimary: props.save,
  });
  body.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (props.save()) dialog.close();
  });
  openModal(dialog);
}
