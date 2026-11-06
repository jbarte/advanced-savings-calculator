import { announce } from "./announcer";
import { renderToast } from "./components";
import { h } from "./dom";
import { messages } from "./i18n";
import type { Undo } from "./actions";

export const UNDO_TOAST_MS = 8000;

/** One shelf for toasts, added to the body so a page re-render can't remove a toast that is showing. */
function toastShelf(): HTMLElement {
  const existing = document.getElementById("toasts");
  if (existing) return existing;
  const shelf = h("div", { id: "toasts", class: "toasts" });
  document.body.append(shelf);
  return shelf;
}

/**
 * Says that something was removed and offers to take it back for a few seconds. A new toast replaces the one before
 * it, so the Undo button always belongs to the latest removal.
 */
export function showUndoToast(message: string, undo: Undo): void {
  const shelf = toastShelf();
  shelf.replaceChildren();
  const timer = window.setTimeout(() => toast.remove(), UNDO_TOAST_MS);
  const toast = renderToast(message, () => window.clearTimeout(timer), {
    label: messages.undo.action,
    onClick: () => {
      window.clearTimeout(timer);
      undo();
    },
  });
  shelf.append(toast);
  announce(message);
}
