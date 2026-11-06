import { PLAN_LIMITS } from "../state/plan-document";
import { MONTHS_PER_YEAR } from "../core/year-month";
import { h, s } from "./dom";
import { messages } from "./i18n";
import { monthInputValue } from "./parse-input";

const monthNames = (): string[] => {
  const format = new Intl.DateTimeFormat(messages.locale.dates, { month: "short", timeZone: "UTC" });
  return Array.from({ length: MONTHS_PER_YEAR }, (_, index) => format.format(new Date(Date.UTC(2000, index, 1))));
};

const calendarIcon = (): SVGSVGElement =>
  s(
    "svg",
    { class: "icon", viewBox: "0 0 24 24", "aria-hidden": "true" },
    s("path", { d: "M5 5h14v15H5zM5 10h14M9 3v4M15 3v4" }),
  );

/** The year and month the field holds, or the given fallback when its text is not "YYYY-MM". */
function readValue(input: HTMLInputElement, fallback: { year: number; month: number }): { year: number; month: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(input.value.trim());
  const year = Number(match?.[1]);
  const month = Number(match?.[2]);
  return match && month >= 1 && month <= MONTHS_PER_YEAR ? { year, month } : fallback;
}

/**
 * A button and a small calendar (a year and twelve months) for a "YYYY-MM" text field. The native month input has
 * no picker in every browser, so this one works the same everywhere. Choosing a month writes it into the field and
 * fires the field's own `input` and `change`, so validation and commit behave as if it had been typed.
 */
export function renderMonthPicker(input: HTMLInputElement, today: { year: number; month: number }): { button: HTMLElement; panel: HTMLElement } {
  const names = monthNames();
  const first = PLAN_LIMITS.minStartYear;
  const last = PLAN_LIMITS.maxEventYear;
  let year = today.year;

  const yearLabel = h("strong", { class: "month-picker__year", "aria-live": "polite" });
  const previous = h("button", { class: "btn-round month-picker__step", type: "button", "aria-label": messages.monthPicker.previousYear, onclick: () => go(year - 1) }, "‹");
  const next = h("button", { class: "btn-round month-picker__step", type: "button", "aria-label": messages.monthPicker.nextYear, onclick: () => go(year + 1) }, "›");
  const grid = h("div", { class: "month-picker__grid" });
  const panel = h(
    "div",
    { class: "month-picker", hidden: true, role: "group", "aria-label": messages.monthPicker.label },
    h("div", { class: "month-picker__head" }, previous, yearLabel, next),
    grid,
  );

  const close = (): void => {
    panel.hidden = true;
    button.setAttribute("aria-expanded", "false");
    document.removeEventListener("pointerdown", outside, true);
  };
  const outside = (event: Event): void => {
    if (!(event.target instanceof Node) || panel.contains(event.target) || button.contains(event.target)) return;
    close();
  };

  const choose = (month: number): void => {
    input.value = monthInputValue({ year, month });
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    close();
    input.focus();
  };

  const draw = (selected: { year: number; month: number }): void => {
    yearLabel.textContent = String(year);
    previous.toggleAttribute("disabled", year <= first);
    next.toggleAttribute("disabled", year >= last);
    grid.replaceChildren(
      ...names.map((name, index) =>
        h(
          "button",
          {
            class: "btn-secondary month-picker__month",
            type: "button",
            "aria-pressed": String(selected.year === year && selected.month === index + 1),
            "aria-label": `${name} ${year}`,
            onclick: () => choose(index + 1),
          },
          name,
        ),
      ),
    );
  };

  function go(target: number): void {
    year = Math.min(last, Math.max(first, target));
    draw(readValue(input, today));
  }

  const button = h(
    "button",
    {
      class: "field__picker",
      type: "button",
      "aria-label": messages.monthPicker.open,
      "aria-expanded": "false",
      onclick: () => {
        if (!panel.hidden) {
          close();
          return;
        }
        const current = readValue(input, today);
        year = Math.min(last, Math.max(first, current.year));
        draw(current);
        panel.hidden = false;
        button.setAttribute("aria-expanded", "true");
        document.addEventListener("pointerdown", outside, true);
      },
    },
    calendarIcon(),
  );
  panel.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    close();
    button.focus();
  });
  return { button, panel };
}
