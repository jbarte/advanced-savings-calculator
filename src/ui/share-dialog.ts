import type { Actions } from "./actions";
import { openModal, renderModal } from "./components";
import { h } from "./dom";
import { messages } from "./i18n";

/** Runs `action` and returns false, which keeps the dialog open so the result of the action can be read. */
function keepOpenAfter(action: () => Promise<void>): () => boolean {
  return () => {
    void action();
    return false;
  };
}

/** Shows the link that opens the current plan, with a button to copy it. The link can also be selected by hand. */
export async function openShareDialog(actions: Actions, planName: string | null): Promise<void> {
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
          "aria-label": messages.share.linkLabel,
          onfocus: (event: Event) => (event.target as HTMLInputElement).select(),
        });

  const copy = async (): Promise<void> => {
    if (link === null) return;
    const copied = await actions.copyToClipboard(link);
    status.textContent = copied ? messages.share.copied : messages.share.copyFailed;
    field?.focus();
  };

  openModal(
    renderModal({
      title: planName === null ? messages.share.title : messages.share.titleNamed(planName),
      body: h(
        "div",
        { class: "modal__body" },
        h("p", { class: "modal__text share__note" }, link === null ? messages.share.couldNotCreate : messages.share.privacyNote),
        field,
        status,
      ),
      ...(link === null ? {} : { primaryLabel: messages.share.copyLink, onPrimary: keepOpenAfter(copy) }),
      secondaryLabel: messages.common.close,
    }),
  );
}
