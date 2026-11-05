import { PLAN_LIMITS } from "../state/plan-document";
import { buildTimeline } from "../state/timeline";
import type { AppState, ScenarioView } from "../state/types";
import type { Actions } from "./actions";
import { renderEmptyState } from "./components";
import { openDepositChangeDialog } from "./deposit-change-dialog";
import { h } from "./dom";
import { openEventTypeDialog } from "./event-type-dialog";
import type { EventType } from "./event-type-dialog";
import { openOneTimeDepositDialog } from "./one-time-deposit-dialog";
import { openWithdrawalDialog } from "./withdrawal-dialog";
import { renderTimelineList } from "./timeline-list";

/** Everything that happens in the plan besides the monthly saving: withdrawals, deposit changes and one-time deposits. */
export function renderEventsSection(scenario: ScenarioView, state: AppState, actions: Actions): HTMLElement {
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
      title: everythingFull ? "The plan has as many events as it can hold" : undefined,
      onclick: () => openEventTypeDialog({ full, onChoose: choose }),
    },
    "Add event",
  );

  const body =
    total === 0
      ? h("div", { class: "table-card" }, renderEmptyState("No events yet", "Add a withdrawal or a change to your monthly deposit to see what it does."))
      : renderTimelineList(scenario, buildTimeline(withdrawals, depositChanges, oneTimeDeposits), state, actions);

  return h(
    "section",
    { class: "section" },
    h(
      "div",
      { class: "section-head" },
      h("h2", {}, "Planned events"),
      h("div", { class: "card__head-side" }, h("span", { class: "card__meta" }, `${total} ${total === 1 ? "event" : "events"}`), addButton),
    ),
    body,
  );
}
