import type { Actions } from "./actions";
import { openModal, renderModal } from "./components";
import { h } from "./dom";

const PRIVACY_NOTE =
  "Anyone with this link can see your plan: the amounts, dates and labels. The plan is inside the link itself, " +
  "and this app has no server, so nothing is stored anywhere else.";

/** Runs `action` and returns false, which keeps the dialog open so the result of the action can be read. */
function keepOpenAfter(action: () => Promise<void>): () => boolean {
  return () => {
    void action();
    return false;
  };
}

/** Shows the link that opens the current plan, with a button to copy it. The link can also be selected by hand. */
export async function openShareDialog(actions: Actions): Promise<void> {
  let link: string | null = null;
  try {
    link = await actions.createShareLink();
  } catch (error) {
    console.error(error);
  }

  const status = h("p", { class: "share__status", role: "status" });
  const field =
    link === null
      ? null
      : h("input", {
          class: "share__link",
          type: "text",
          readonly: true,
          value: link,
          "data-key": "share-link",
          "aria-label": "Share link",
          onfocus: (event: Event) => (event.target as HTMLInputElement).select(),
        });

  const copy = async (): Promise<void> => {
    if (link === null) return;
    const copied = await actions.copyToClipboard(link);
    status.textContent = copied ? "Link copied" : "Could not copy. Select the link and copy it yourself.";
    field?.focus();
  };

  openModal(
    renderModal({
      title: "Share this plan",
      body: h(
        "div",
        { class: "modal__body" },
        h("p", { class: "modal__text share__note" }, link === null ? "The link could not be created." : PRIVACY_NOTE),
        field,
        status,
      ),
      ...(link === null ? {} : { primaryLabel: "Copy link", onPrimary: keepOpenAfter(copy) }),
      secondaryLabel: "Close",
    }),
  );
}
