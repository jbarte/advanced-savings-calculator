import { openModal, renderModal } from "./components";
import { h } from "./dom";

export type EventType = "withdrawal" | "deposit-change";

export interface EventTypeDialogProps {
  /** Which kinds have reached their limit and can't take another event. */
  readonly full: Readonly<Record<EventType, boolean>>;
  readonly onChoose: (type: EventType) => void;
}

/** Asks what kind of event to add. Choosing one closes this dialog and hands the choice on. */
export function openEventTypeDialog(props: EventTypeDialogProps): void {
  const choice = (type: EventType, title: string, hint: string): HTMLElement =>
    h(
      "button",
      {
        class: "choice",
        type: "button",
        "data-key": `event-type-${type}`,
        disabled: props.full[type],
        onclick: () => {
          dialog.close();
          props.onChoose(type);
        },
      },
      h("strong", {}, title),
      h("span", { class: "choice__hint" }, props.full[type] ? "Limit reached" : hint),
    );

  const dialog = renderModal({
    title: "Add event",
    body: h(
      "div",
      { class: "choices" },
      choice("withdrawal", "Withdrawal", "Take money out in a month"),
      choice("deposit-change", "Change monthly deposit", "Raise, lower or pause saving"),
    ),
    secondaryLabel: "Cancel",
  });
  openModal(dialog);
}
