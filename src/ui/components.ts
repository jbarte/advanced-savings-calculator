import { h, s } from "./dom";
import { messages } from "./i18n";

export const checkIcon = (size?: string): SVGSVGElement =>
  s(
    "svg",
    {
      class: "icon",
      viewBox: "0 0 24 24",
      "aria-hidden": "true",
      style: size ? `width:${size};height:${size}` : undefined,
    },
    s("path", { d: "M5 12.5l4.5 4.5L19 7.5" }),
  );

const boxIcon = (): SVGSVGElement =>
  s(
    "svg",
    { class: "icon icon--large", viewBox: "0 0 24 24", "aria-hidden": "true" },
    s("path", { d: "M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 9l8-4.5M12 12v9M12 12L4 7.5" }),
  );

/* ---------- Button ---------- */

export interface ButtonProps {
  readonly label: string;
  readonly variant?: "solid" | "secondary";
  readonly loading?: boolean;
  readonly disabled?: boolean;
  readonly onClick?: () => void;
}

export function renderButton(props: ButtonProps): HTMLButtonElement {
  const loading = props.loading === true;
  return h(
    "button",
    {
      class: props.variant === "secondary" ? "btn-secondary" : "btn-solid",
      type: "button",
      disabled: props.disabled === true || loading,
      "aria-busy": loading ? "true" : undefined,
      onclick: props.onClick,
    },
    loading ? h("span", { class: "spinner", "aria-hidden": "true" }) : null,
    props.label,
  );
}

/* ---------- Toggle switch ---------- */

export interface ToggleProps {
  readonly label: string;
  readonly checked: boolean;
  readonly disabled?: boolean;
  readonly onChange: (checked: boolean) => void;
}

export function renderToggle(props: ToggleProps): HTMLElement {
  const control = h("button", {
    class: "switch",
    type: "button",
    role: "switch",
    "aria-checked": String(props.checked),
    "aria-label": props.label,
    disabled: props.disabled,
  });
  control.addEventListener("click", () => {
    const next = control.getAttribute("aria-checked") !== "true";
    control.setAttribute("aria-checked", String(next));
    props.onChange(next);
  });
  return h("div", { class: "switch-field" }, h("span", { "aria-hidden": "true" }, props.label), control);
}

/* ---------- Slider ---------- */

export interface SliderProps {
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly value: number;
  readonly format: (value: number) => string;
  readonly onChange: (value: number) => void;
}

/** Commits on `change` like every other input; the fill and readout follow the thumb while dragging. */
export function renderSlider(props: SliderProps): HTMLElement {
  const input = h("input", {
    class: "slider",
    type: "range",
    min: props.min,
    max: props.max,
    step: props.step,
    value: props.value,
    "aria-label": props.label,
  });
  const readout = h("output", {});
  const sync = (): void => {
    const value = Number(input.value);
    input.style.setProperty("--pct", `${((value - props.min) / (props.max - props.min)) * 100}%`);
    readout.textContent = props.format(value);
  };
  input.addEventListener("input", sync);
  input.addEventListener("change", () => props.onChange(Number(input.value)));
  sync();
  return h("div", { class: "slider-field" }, h("div", { class: "slider-field__head" }, h("span", {}, props.label), readout), input);
}

/* ---------- Select ---------- */

export interface SelectOption {
  readonly value: string;
  readonly label: string;
}

export interface SelectProps {
  readonly label: string;
  readonly options: readonly SelectOption[];
  readonly value: string;
  readonly onChange: (value: string) => void;
}

/** A native <select> keeps keyboard and screen-reader behaviour for free; only the closed control is themed. */
export function renderSelect(props: SelectProps): HTMLElement {
  const control = h(
    "select",
    { class: "select__control", "aria-label": props.label },
    ...props.options.map((option) => h("option", { value: option.value, selected: option.value === props.value }, option.label)),
  );
  control.addEventListener("change", () => props.onChange(control.value));
  return h("div", { class: "select" }, control);
}

/**
 * Shows a dialog on top of the page. It is added to <body>, not to the app root, so a page re-render
 * can't remove it, and it removes itself when it closes.
 */
export function openModal(dialog: HTMLDialogElement): void {
  dialog.addEventListener("close", () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
}

/**
 * An explanation for a control that is switched off, read out with it (`aria-describedby`). A disabled button can't
 * be focused, and a `title` is not read by most screen readers, so the reason also goes here, out of sight.
 */
export function renderHiddenHint(id: string, text: string): HTMLElement {
  return h("span", { id, class: "visually-hidden" }, text);
}

/* ---------- Step indicator ---------- */

/** `current` is the zero-based index of the active step; earlier steps are done. */
export function renderSteps(labels: readonly string[], current: number): HTMLElement {
  return h(
    "ol",
    { class: "steps", "aria-label": "Progress" },
    ...labels.map((label, index) => {
      const status = index < current ? "done" : index === current ? "current" : "todo";
      return h(
        "li",
        { class: "steps__item", "data-status": status, "aria-current": status === "current" ? "step" : undefined },
        h(
          "span",
          { class: "steps__marker" },
          status === "done" ? checkIcon("var(--icon-sm)") : null,
          h("span", { class: "visually-hidden" }, status === "done" ? `${label} (done)` : label),
        ),
        index < labels.length - 1 ? h("span", { class: "steps__line", "aria-hidden": "true" }) : null,
      );
    }),
  );
}

/* ---------- Toast ---------- */

export function renderToast(message: string, onDismiss?: () => void): HTMLElement {
  const toast = h(
    "div",
    { class: "toast", role: "status" },
    h("span", { class: "toast__icon" }, checkIcon()),
    h("span", { class: "toast__text" }, message),
    h(
      "button",
      {
        class: "toast__close",
        type: "button",
        "aria-label": messages.common.dismiss,
        onclick: () => {
          toast.remove();
          onDismiss?.();
        },
      },
      "×",
    ),
  );
  return toast;
}

/* ---------- Modal dialog ---------- */

export interface ModalProps {
  readonly title: string;
  /** Content between the title and the buttons, such as a form. */
  readonly body?: HTMLElement;
  /** Leave out for a dialog that only offers choices in its body and a way to cancel. */
  readonly primaryLabel?: string;
  readonly secondaryLabel: string;
  /** Return `false` to keep the dialog open, for example when the form is invalid. */
  readonly onPrimary?: () => boolean | void;
}

/**
 * Built on <dialog>: the browser handles focus trapping, Escape and the backdrop. Call showModal() after
 * appending, or use `openModal`.
 */
/** True when a pointer event happened on the backdrop, outside the dialog's own box (its padding counts as inside). */
function isOutside(dialog: HTMLDialogElement, event: Event): boolean {
  const { clientX, clientY } = event as MouseEvent;
  const box = dialog.getBoundingClientRect();
  return clientX < box.left || clientX > box.right || clientY < box.top || clientY > box.bottom;
}

export function renderModal(props: ModalProps): HTMLDialogElement {
  // Close on the backdrop only when the press also started there, so a click in the padding or a text
  // selection dragged out of a field never throws away what was typed.
  let pressedOutside = false;
  const dialog = h(
    "dialog",
    {
      class: "modal",
      // A name of its own: two dialogs can be in the page for a moment, so a shared heading id would clash.
      "aria-label": props.title,
      onpointerdown: (event: Event) => {
        pressedOutside = event.target === dialog && isOutside(dialog, event);
      },
      onclick: (event: Event) => {
        if (pressedOutside && event.target === dialog && isOutside(dialog, event)) dialog.close();
        pressedOutside = false;
      },
    },
    h("h2", { class: "modal__title" }, props.title),
    props.body ?? null,
    h(
      "div",
      { class: "modal__actions" },
      props.primaryLabel === undefined
        ? null
        : renderButton({
            label: props.primaryLabel,
            onClick: () => {
              if (props.onPrimary?.() !== false) dialog.close();
            },
          }),
      renderButton({ label: props.secondaryLabel, variant: "secondary", onClick: () => dialog.close() }),
    ),
  );
  return dialog;
}

/* ---------- Empty state ---------- */

export function renderEmptyState(title: string, hint: string): HTMLElement {
  return h(
    "div",
    { class: "empty" },
    boxIcon(),
    h("strong", { class: "empty__title" }, title),
    h("span", { class: "empty__hint" }, hint),
  );
}

/* ---------- Text field ---------- */

export interface TextFieldProps {
  readonly id: string;
  readonly label: string;
  /** Short unit shown inside the field, e.g. "KR". Empty for none. */
  readonly unit: string;
  readonly value: string;
  /** Keeps keyboard focus on this field when the page re-renders. */
  readonly dataKey: string;
  readonly type?: "text" | "month";
  readonly inputMode?: "numeric" | "decimal";
  readonly placeholder?: string;
  /** Returns an error message, or null when the text is valid. */
  readonly validate: (text: string) => string | null;
  /** Called with valid text when the user commits it (leaves the field or presses Enter). */
  readonly onCommit: (text: string) => void;
}

/**
 * A labelled input that checks the text as the user types but only commits on `change`. A commit
 * re-renders the page, which would otherwise rebuild the field mid-typing.
 */
export function renderTextField(props: TextFieldProps): HTMLElement {
  const errorId = `${props.id}-error`;
  // Polite and only updated when the message changes, so it isn't read out again on every keystroke.
  const error = h("p", { class: "field__error", id: errorId, "aria-live": "polite" });
  const input = h("input", {
    id: props.id,
    type: props.type ?? "text",
    value: props.value,
    inputmode: props.inputMode,
    placeholder: props.placeholder,
    autocomplete: "off",
    "data-key": props.dataKey,
    "aria-describedby": errorId,
  });

  const show = (message: string | null): void => {
    const text = message ?? "";
    if (error.textContent !== text) error.textContent = text;
    if (message === null) input.removeAttribute("aria-invalid");
    else input.setAttribute("aria-invalid", "true");
  };

  input.addEventListener("input", () => show(props.validate(input.value)));
  input.addEventListener("change", () => {
    const message = props.validate(input.value);
    show(message);
    if (message === null) props.onCommit(input.value);
  });
  input.addEventListener("focus", () => input.select());

  return h(
    "div",
    { class: "field" },
    h("label", { for: props.id }, props.label),
    h("div", { class: "field__control" }, input, props.unit ? h("span", { class: "field__unit" }, props.unit) : null),
    error,
  );
}
