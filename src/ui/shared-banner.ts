import type { Actions } from "./actions";
import { h } from "./dom";
import { messages } from "./i18n";

/**
 * Shown while a plan from a share link is open. It is a copy: the user's own plans are untouched until they keep it
 * as one of them, which needs room for another plan.
 */
export function renderSharedBanner(canKeep: boolean, actions: Actions): HTMLElement {
  return h(
    "div",
    { class: "notice notice--info", role: "status" },
    h("span", {}, messages.sharedPlan.banner, canKeep ? null : h("span", { id: "shared-keep-hint", class: "notice__hint" }, ` ${messages.sharedPlan.keepFull}.`)),
    h(
      "div",
      { class: "notice__actions" },
      h(
        "button",
        {
          class: "btn-text",
          type: "button",
          "data-key": "shared-keep",
          "data-focus-next": "hero-heading",
          disabled: !canKeep,
          title: canKeep ? undefined : messages.sharedPlan.keepFull,
          "aria-describedby": canKeep ? undefined : "shared-keep-hint",
          onclick: () => actions.keepSharedPlan(),
        },
        messages.sharedPlan.keep,
      ),
      h("button", { class: "btn-text", type: "button", "data-key": "shared-leave", "data-focus-next": "hero-heading", onclick: () => actions.leaveSharedPlan() }, messages.sharedPlan.leave),
    ),
  );
}
