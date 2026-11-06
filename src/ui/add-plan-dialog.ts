import { openModal, renderModal } from "./components";
import { h } from "./dom";
import { messages } from "./i18n";

export interface AddPlanDialogProps {
  /** What the open plan is called, for the "copy" choice. */
  readonly currentName: string;
  readonly onBlank: () => void;
  readonly onCopy: () => void;
}

/** Asks how to add a plan: empty, or a copy of the open one. Choosing closes the dialog and hands the choice on. */
export function openAddPlanDialog(props: AddPlanDialogProps): void {
  const choice = (key: string, title: string, hint: string, onChoose: () => void): HTMLElement =>
    h(
      "button",
      {
        class: "choice",
        type: "button",
        "data-key": key,
        onclick: () => {
          dialog.close();
          onChoose();
        },
      },
      h("strong", {}, title),
      h("span", { class: "choice__hint" }, hint),
    );

  const dialog = renderModal({
    title: messages.dialogs.addPlan.title,
    body: h(
      "div",
      { class: "choices" },
      choice("plan-add-copy", messages.dialogs.addPlan.copy(props.currentName), messages.dialogs.addPlan.copyHint, props.onCopy),
      choice("plan-add-blank", messages.dialogs.addPlan.blank, messages.dialogs.addPlan.blankHint, props.onBlank),
    ),
    secondaryLabel: messages.common.cancel,
  });
  openModal(dialog);
}
