import { PLAN_LIMITS } from "../state/plan-document";
import type { TimelineEntry } from "../state/timeline";
import type { AppState, ScenarioView } from "../state/types";
import type { Actions } from "./actions";
import { renderEmptyState } from "./components";
import { openDepositChangeDialog } from "./deposit-change-dialog";
import { h } from "./dom";
import { formatSignedMoney } from "./format";
import { openEventTypeDialog } from "./event-type-dialog";
import type { EventType } from "./event-type-dialog";
import { openOneTimeDepositDialog } from "./one-time-deposit-dialog";
import { monthLabel } from "./view-helpers";
import { openWithdrawalDialog } from "./withdrawal-dialog";
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
  const full: Record<EventType, boolean> = {
    withdrawal: withdrawals.length >= PLAN_LIMITS.maxWithdrawals,
    "deposit-change": depositChanges.length >= PLAN_LIMITS.maxDepositChanges,
    "one-time-deposit": oneTimeDeposits.length >= PLAN_LIMITS.maxOneTimeDeposits,
  };
  const everythingFull = Object.values(full).every(Boolean);

  const choose = (type: EventType): void => {
    const { start } = scenario;
    if (type === "withdrawal") openWithdrawalDialog({ start, onSave: (draft) => actions.addWithdrawal(draft) });
    else if (type === "deposit-change") openDepositChangeDialog({ start, onSave: (draft) => actions.addDepositChange(draft) });
    else openOneTimeDepositDialog({ start, onSave: (draft) => actions.addOneTimeDeposit(draft) });
  };

  const addButton = h(
    "button",
    {
      class: "btn-solid",
      type: "button",
      "data-key": "event-add",
      disabled: everythingFull,
      title: everythingFull ? messages.events.full : undefined,
      "aria-describedby": everythingFull ? "event-add-hint" : undefined,
      onclick: () => openEventTypeDialog({ full, onChoose: choose }),
    },
    messages.events.add,
  );

  const body =
    total === 0
      ? h("div", { class: "table-card" }, renderEmptyState(messages.events.emptyTitle, messages.events.emptyHint))
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
          messages.events.totalBefore(end, scenario.inflationAdjusted),
          h("strong", { class: `events__total-value ${tone}`.trim() }, formatSignedMoney(scenario.totalEffect)),
          messages.events.totalAfter,
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
