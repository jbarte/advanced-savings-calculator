import type { Actions } from "./actions";
import { openModal, renderModal } from "./components";
import { h } from "./dom";

function openKeepDialog(actions: Actions): void {
  openModal(
    renderModal({
      title: "Keep this plan?",
      body: h("p", { class: "modal__text" }, "It replaces the plan saved in this browser, if there is one. It can't be undone."),
      primaryLabel: "Keep this plan",
      secondaryLabel: "Cancel",
      onPrimary: () => actions.keepSharedPlan(),
    }),
  );
}

/** Shown while a plan from a share link is open. It is a copy: the user's own plan is untouched until they keep it. */
export function renderSharedBanner(actions: Actions): HTMLElement {
  return h(
    "div",
    { class: "notice notice--info", role: "status" },
    h("span", {}, "You are looking at a shared plan. Your own plan is untouched, and changes you make here are not saved."),
    h(
      "div",
      { class: "notice__actions" },
      h("button", { class: "btn-text", type: "button", "data-key": "shared-keep", "data-focus-next": "hero-heading", onclick: () => openKeepDialog(actions) }, "Keep as my plan"),
      h("button", { class: "btn-text", type: "button", "data-key": "shared-leave", "data-focus-next": "hero-heading", onclick: () => actions.leaveSharedPlan() }, "Back to my plan"),
    ),
  );
}
