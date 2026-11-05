import type { Actions } from "./actions";
import { renderButton } from "./components";
import { h } from "./dom";
import { messages } from "./i18n";

/** A dismissible notice, already put into words (`noticeText`). */
export function renderNotice(message: string, actions: Actions): HTMLElement {
  return h(
    "div",
    // Not a live region itself: the page is rebuilt on every change, so `announce` reads the message out once.
    { class: "notice" },
    h("span", {}, message),
    h(
      "button",
      { class: "btn-text", type: "button", "data-key": "notice-dismiss", "data-focus-next": "hero-heading", onclick: () => actions.dismissNotice() },
      messages.common.dismiss,
    ),
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
        h("h1", {}, messages.errorState.title),
        h("p", { class: "card__meta" }, message),
        renderButton({ label: messages.plan.startFromScratch, onClick: () => actions.startFromScratch() }),
      ),
    ),
  );
}
