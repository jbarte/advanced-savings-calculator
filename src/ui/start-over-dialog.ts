import { openModal, renderModal } from "./components";
import { h } from "./dom";

/** Asks before the saved plan is thrown away, since it can't be brought back. */
export function openStartOverDialog(onConfirm: () => void): void {
  openModal(
    renderModal({
      title: "Start over?",
      body: h(
        "p",
        { class: "modal__text" },
        "This removes your saved plan from this browser and shows the example plan again. It can't be undone.",
      ),
      primaryLabel: "Start over",
      secondaryLabel: "Keep my plan",
      onPrimary: onConfirm,
    }),
  );
}
