import type { Language } from "../state/language";
import type { Actions } from "./actions";
import { openModal, renderButton, renderModal } from "./components";
import { h, s } from "./dom";
import { GUIDE_ART } from "./guide-art";
import { language, messages } from "./i18n";

/** The guide's steps in order: the texts, and the illustration at the same index in `GUIDE_ART`. */
const STEPS = [
  messages.guide.steps.intro,
  messages.guide.steps.plan,
  messages.guide.steps.chart,
  messages.guide.steps.events,
  messages.guide.steps.goal,
  messages.guide.steps.share,
] as const;

/** A sideways swipe at least this long (px), and clearly more sideways than up or down, turns the page on a touch screen. */
const SWIPE_MIN = 48;

const closeIcon = (): SVGSVGElement => s("svg", { class: "icon", viewBox: "0 0 24 24", "aria-hidden": "true" }, s("path", { d: "M6 6l12 12M18 6L6 18" }));

/**
 * A short walk through the app, one step at a time, opening at `startAt` (from 0). Its state (which step) lives in the
 * dialog, like the other dialogs.
 */
export function openGuideDialog(actions: Actions, startAt = 0): void {
  const lastIndex = STEPS.length - 1;
  let index = Math.min(Math.max(Math.trunc(startAt) || 0, 0), lastIndex);

  const art = h("div", { class: "guide__art" });
  // Every step's heading and text sit in the same place, one on top of the other, with only the open one shown: the
  // dialog is as tall as the longest step in any language, so the buttons never move when the page turns.
  const headings = STEPS.map((step) => h("h3", { class: "guide__heading" }, step.title));
  const texts = STEPS.map((step) => h("p", { class: "modal__text guide__text" }, step.text));
  const copy = h("div", { class: "guide__copy" }, h("div", { class: "guide__stack" }, ...headings), h("div", { class: "guide__stack" }, ...texts));
  // Read out when the page turns: where you are, then the step itself.
  const status = h("p", { class: "visually-hidden", role: "status" });

  const dots = STEPS.map((step, i) =>
    h("button", { class: "guide__dot", type: "button", "aria-label": messages.guide.goTo(i + 1, step.title), title: step.title, onclick: () => show(i) }),
  );
  const back = renderButton({ label: messages.guide.back, variant: "secondary", onClick: () => show(index - 1) });
  const next = renderButton({ label: messages.guide.next, onClick: () => (index === lastIndex ? dialog.close() : show(index + 1)) });
  const nav = h("div", { class: "guide__nav" }, back, h("div", { class: "guide__dots", role: "group", "aria-label": messages.guide.stepsLabel }, ...dots), next);

  // The guide may open by itself in a language the person doesn't read, so it carries its own switch. The page reloads
  // in the new language and the guide opens again at the same step.
  const other: Language = language === "en" ? "sv" : "en";
  const languageButton = h(
    "button",
    {
      class: "btn-round btn-round--text",
      type: "button",
      "data-key": "guide-language",
      "aria-label": messages.language.switchTo,
      title: messages.language.switchTo,
      lang: other,
      onclick: () => actions.setLanguage(other, index),
    },
    messages.language.switchCode,
  );
  const closeButton = h(
    "button",
    { class: "btn-round", type: "button", "data-key": "guide-close", "aria-label": messages.common.close, title: messages.common.close, onclick: () => dialog.close() },
    closeIcon(),
  );
  const tools = h("div", { class: "guide__tools" }, languageButton, closeButton);
  const body = h("div", { class: "modal__body guide" }, tools, art, copy, status, nav);

  // No button row of its own: the close button is in the corner, and Back and Next are in the body.
  const dialog = renderModal({ title: messages.guide.title, body });
  dialog.classList.add("modal--guide");

  /** Replays the step's entrance, sliding in from the side it was reached from. The CSS skips it for reduced motion. */
  const animate = (direction: "forward" | "back"): void => {
    body.dataset.direction = direction;
    for (const part of [art, copy]) {
      part.classList.remove("guide__enter");
      void part.offsetWidth;
      part.classList.add("guide__enter");
    }
  };

  const show = (target: number): void => {
    if (target < 0 || target > lastIndex) return;
    if (target !== index) animate(target > index ? "forward" : "back");
    index = target;
    const step = STEPS[index];
    const drawing = GUIDE_ART[index];
    if (step === undefined || drawing === undefined) return;
    art.replaceChildren(drawing());
    [headings, texts].forEach((stack) => stack.forEach((element, i) => element.setAttribute("aria-hidden", String(i !== index))));
    dots.forEach((dot, i) => dot.setAttribute("aria-current", i === index ? "step" : "false"));
    status.textContent = `${messages.guide.progress(index + 1, STEPS.length)}. ${step.title}. ${step.text}`;
    back.disabled = index === 0;
    next.textContent = index === lastIndex ? messages.guide.done : messages.guide.next;
    // Back disappears on the first step; focus must not be left on a control that is gone.
    if (document.activeElement === back && back.disabled) next.focus();
  };

  // Left and right arrows page through the steps, like Back and Next, and do nothing past either end.
  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    show(index + (event.key === "ArrowRight" ? 1 : -1));
  });

  // On a touch screen a sideways swipe turns the page.
  let swipeFrom: { readonly x: number; readonly y: number } | null = null;
  body.addEventListener("pointerdown", (event) => {
    swipeFrom = event.pointerType === "touch" ? { x: event.clientX, y: event.clientY } : null;
  });
  body.addEventListener("pointerup", (event) => {
    if (swipeFrom === null) return;
    const dx = event.clientX - swipeFrom.x;
    const dy = event.clientY - swipeFrom.y;
    swipeFrom = null;
    if (Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) > 2 * Math.abs(dy)) show(index + (dx < 0 ? 1 : -1));
  });
  body.addEventListener("pointercancel", () => (swipeFrom = null));

  show(index);
  openModal(dialog);
  // The dialog focuses its first control (the language switch); the person came for Next.
  next.focus();
}
