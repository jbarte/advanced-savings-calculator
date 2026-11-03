import type { Actions } from "./actions";
import { renderButton } from "./components";
import { h } from "./dom";

/** A dismissible message about a change that was not applied. */
export function renderNotice(message: string, actions: Actions): HTMLElement {
  return h(
    "div",
    { class: "notice", role: "alert" },
    h("span", {}, message),
    h("button", { class: "btn-text", type: "button", "data-key": "notice-dismiss", onclick: () => actions.dismissNotice() }, "Dismiss"),
  );
}

/** Shown instead of the page when drawing it fails, so a bug never leaves a blank screen. */
export function renderErrorState(root: HTMLElement, error: unknown, actions: Actions): void {
  const message = error instanceof Error ? error.message : String(error);
  root.replaceChildren(
    h(
      "main",
      { class: "canvas" },
      h(
        "section",
        { class: "card error-state", role: "alert" },
        h("h1", {}, "Something went wrong"),
        h("p", { class: "card__meta" }, message),
        renderButton({ label: "Start from scratch", onClick: () => actions.startFromScratch() }),
      ),
    ),
  );
}
