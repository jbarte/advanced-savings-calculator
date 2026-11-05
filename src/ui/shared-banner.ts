import type { Actions } from "./actions";
import { openModal, renderModal } from "./components";
import { h } from "./dom";
import { messages } from "./i18n";

function openKeepDialog(actions: Actions): void {
  openModal(
    renderModal({
      title: messages.sharedPlan.keepTitle,
      body: h("p", { class: "modal__text" }, messages.sharedPlan.keepBody),
      primaryLabel: messages.sharedPlan.keepConfirm,
      secondaryLabel: messages.common.cancel,
      onPrimary: () => actions.keepSharedPlan(),
    }),
  );
}

/** Shown while a plan from a share link is open. It is a copy: the user's own plan is untouched until they keep it. */
export function renderSharedBanner(actions: Actions): HTMLElement {
  return h(
    "div",
    { class: "notice notice--info", role: "status" },
    h("span", {}, messages.sharedPlan.banner),
    h(
      "div",
      { class: "notice__actions" },
      h("button", { class: "btn-text", type: "button", "data-key": "shared-keep", "data-focus-next": "hero-heading", onclick: () => openKeepDialog(actions) }, messages.sharedPlan.keep),
      h("button", { class: "btn-text", type: "button", "data-key": "shared-leave", "data-focus-next": "hero-heading", onclick: () => actions.leaveSharedPlan() }, messages.sharedPlan.leave),
    ),
  );
}
