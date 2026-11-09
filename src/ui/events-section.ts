import type { TimelineEntry } from "../state/timeline";
import type { AppState, ScenarioView } from "../state/types";
import type { Actions } from "./actions";
import { fullEventKinds, openAddEvent } from "./add-event";
import { renderEmptyState, renderSteadyText } from "./components";
import { h } from "./dom";
import { formatSignedMoney } from "./format";
import { monthLabel } from "./view-helpers";
import { renderTimelineList } from "./timeline-list";
import { messages } from "./i18n";

/** Everything that happens in the plan besides the monthly saving: withdrawals, deposit changes and one-time deposits. */
export function renderEventsSection(
  scenario: ScenarioView,
  timeline: readonly TimelineEntry[],
  state: AppState,
  actions: Actions,
): HTMLElement {
  const { withdrawals, depositChanges, oneTimeDeposits } = scenario;
  const total = withdrawals.length + depositChanges.length + oneTimeDeposits.length;
  const full = fullEventKinds(scenario);
  const everythingFull = Object.values(full).every(Boolean);

  const openAdd = (): void => openAddEvent(scenario, actions);

  const addButton = h(
    "button",
    {
      class: "btn-solid",
      type: "button",
      "data-key": "event-add",
      disabled: everythingFull,
      title: everythingFull ? messages.events.full : undefined,
      "aria-describedby": everythingFull ? "event-add-hint" : undefined,
      onclick: openAdd,
    },
    messages.events.add,
  );

  const emptyAction = h(
    "button",
    { class: "btn-solid", type: "button", "data-key": "event-add-first", "data-focus-next": "event-add", onclick: openAdd },
    messages.events.addFirst,
  );

  const body =
    total === 0
      ? h("div", { class: "table-card" }, renderEmptyState(messages.events.emptyTitle, messages.events.emptyHint, emptyAction))
      : renderTimelineList(scenario, timeline, state, actions);

  const end = monthLabel(scenario, scenario.horizonMonths);
  const tone = scenario.totalEffect < 0 ? "events__total-value--loss" : scenario.totalEffect > 0 ? "events__total-value--gain" : "";
  // The combined effect is not the sum of the rows: events change each other (a withdrawal can be capped).
  const totalLine =
    total === 0
      ? null
      : h(
          "p",
          { class: "events__total" },
          renderSteadyText(
            (adjusted) => [
              messages.events.totalBefore(end, adjusted),
              h("strong", { class: `events__total-value ${tone}`.trim() }, formatSignedMoney(scenario.totalEffect)),
              messages.events.totalAfter,
            ],
            scenario.inflationAdjusted,
          ),
        );

  return h(
    "section",
    { class: "section" },
    h(
      "div",
      { class: "section-head" },
      h("h2", {}, messages.events.heading),
      h("div", { class: "card__head-side" }, h("span", { class: "card__meta" }, messages.events.count(total)), addButton),
    ),
    everythingFull ? h("p", { id: "event-add-hint", class: "card__meta" }, messages.events.fullHint) : null,
    totalLine,
    body,
  );
}
