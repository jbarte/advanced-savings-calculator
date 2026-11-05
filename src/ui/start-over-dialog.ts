import { openModal, renderModal } from "./components";
import { h } from "./dom";
import { messages } from "./i18n";

/** Asks before the saved plan is thrown away, since it can't be brought back. */
export function openStartOverDialog(onConfirm: () => void): void {
  openModal(
    renderModal({
      title: messages.startOver.title,
      body: h("p", { class: "modal__text" }, messages.startOver.body),
      primaryLabel: messages.startOver.confirm,
      secondaryLabel: messages.startOver.keep,
      onPrimary: onConfirm,
    }),
  );
}
