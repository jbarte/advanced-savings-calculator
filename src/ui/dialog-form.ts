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
