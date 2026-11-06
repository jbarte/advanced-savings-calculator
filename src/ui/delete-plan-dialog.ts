import { openModal, renderModal } from "./components";
import { h } from "./dom";
import { messages } from "./i18n";

/** Asks before a plan is deleted, since it can't be brought back. The user's other plans stay. */
export function openDeletePlanDialog(name: string, onConfirm: () => void): void {
  openModal(
    renderModal({
      title: messages.dialogs.deletePlan.title(name),
      body: h("p", { class: "modal__text" }, messages.dialogs.deletePlan.body),
      primaryLabel: messages.dialogs.deletePlan.confirm,
      secondaryLabel: messages.dialogs.deletePlan.keep,
      onPrimary: onConfirm,
    }),
  );
}
