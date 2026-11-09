import { openModal, renderButton, renderModal } from "./components";
import { h } from "./dom";
import { GUIDE_ART } from "./guide-art";
import { messages } from "./i18n";

/** The guide's steps in order: the texts, and the illustration at the same index in `GUIDE_ART`. */
const STEPS = [
  messages.guide.steps.intro,
  messages.guide.steps.plan,
  messages.guide.steps.chart,
  messages.guide.steps.events,
  messages.guide.steps.goal,
  messages.guide.steps.share,
] as const;

/** A short walk through the app, one step at a time. Its state (which step) lives in the dialog, like the other dialogs. */
export function openGuideDialog(): void {
  let index = 0;
  const art = h("div", { class: "guide__art" });
  const title = h("h3", { class: "guide__heading" });
  const text = h("p", { class: "modal__text guide__text" });
  const progress = h("p", { class: "guide__progress", role: "status" });
  const dots = h("div", { class: "guide__dots", "aria-hidden": "true" }, ...STEPS.map(() => h("span", { class: "guide__dot" })));
  const nav = h("div", { class: "guide__nav" });
  const body = h("div", { class: "modal__body guide" }, art, title, text, dots, progress, nav);

  const dialog = renderModal({ title: messages.guide.title, body, secondaryLabel: messages.common.close });

  /** Replays the step's entrance, sliding in from the side it was reached from. The CSS skips it for reduced motion. */
  const animate = (direction: "forward" | "back"): void => {
    body.dataset.direction = direction;
    for (const part of [art, title, text]) {
      part.classList.remove("guide__enter");
      void part.offsetWidth;
      part.classList.add("guide__enter");
    }
  };

  const show = (next: number): void => {
    const target = Math.min(Math.max(next, 0), STEPS.length - 1);
    if (target !== index) animate(target > index ? "forward" : "back");
    index = target;
    const step = STEPS[index];
    const drawing = GUIDE_ART[index];
    if (step === undefined || drawing === undefined) return;
    const last = index === STEPS.length - 1;
    art.replaceChildren(drawing());
    title.textContent = step.title;
    text.textContent = step.text;
    progress.textContent = messages.guide.progress(index + 1, STEPS.length);
    dots.querySelectorAll(".guide__dot").forEach((dot, i) => dot.toggleAttribute("data-on", i === index));
    nav.replaceChildren(
      renderButton({ label: messages.guide.back, variant: "secondary", disabled: index === 0, onClick: () => show(index - 1) }),
      renderButton({ label: last ? messages.guide.done : messages.guide.next, onClick: () => (last ? dialog.close() : show(index + 1)) }),
    );
    nav.querySelector<HTMLButtonElement>("button:last-child")?.focus();
  };

  // Left and right arrows page through the steps, like Back and Next.
  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    // Like the Back button on the first step, the keys do nothing past either end.
    const next = index + (event.key === "ArrowRight" ? 1 : -1);
    if (next >= 0 && next < STEPS.length) show(next);
  });
  show(0);
  openModal(dialog);
}
