import { openModal, renderModal } from "./components";
import { h } from "./dom";
import { messages } from "./i18n";

export type EventType = "withdrawal" | "deposit-change" | "one-time-deposit";

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
      h("span", { class: "choice__hint" }, props.full[type] ? messages.eventTypes.limitReached : hint),
    );

  const dialog = renderModal({
    title: messages.eventTypes.dialogTitle,
    body: h(
      "div",
      { class: "choices" },
      choice("withdrawal", messages.kinds.withdrawal, messages.eventTypes.withdrawalHint),
      choice("one-time-deposit", messages.kinds.oneTimeDeposit, messages.eventTypes.oneTimeDepositHint),
      choice("deposit-change", messages.eventTypes.depositChangeTitle, messages.eventTypes.depositChangeHint),
    ),
    secondaryLabel: messages.common.cancel,
  });
  openModal(dialog);
}
