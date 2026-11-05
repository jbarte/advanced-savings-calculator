import { formatYearMonth, yearsToMonths } from "../core/year-month";
import type { EventKey, TimelineEntry } from "../state/timeline";
import type { AppState, PlannedDepositChange, PlannedWithdrawal, ScenarioView } from "../state/types";
import type { Actions } from "./actions";
import { openDepositChangeDialog } from "./deposit-change-dialog";
import { openOneTimeDepositDialog } from "./one-time-deposit-dialog";
import { h } from "./dom";
import { formatMoney, formatMoneyCompact } from "./format";
import { STATUS_LABELS, monthLabel } from "./view-helpers";
import { openWithdrawalDialog } from "./withdrawal-dialog";

type WithdrawalEntry = Extract<TimelineEntry, { kind: "withdrawal" }>;
type DepositChangeEntry = Extract<TimelineEntry, { kind: "deposit-change" }>;
type OneTimeDepositEntry = Extract<TimelineEntry, { kind: "one-time-deposit" }>;

interface RowParts {
  readonly title: string;
  readonly sub: string;
  readonly amount: string;
  readonly chips: readonly (HTMLElement | null)[];
  readonly impact: HTMLElement;
  readonly edit: () => void;
  readonly remove: () => void;
}

function periodText(change: PlannedDepositChange): string {
  const from = formatYearMonth(change.startDate);
  return change.endDate === null ? `From ${from}, no end` : `${from} – ${formatYearMonth(change.endDate)}`;
}

function impactCell(withdrawal: PlannedWithdrawal, maxCost: number): HTMLElement {
  const counted = withdrawal.status === "planned";
  return h(
    "div",
    { class: "impact", role: "cell" },
    h("div", { class: "impact__track" }, h("div", { class: "impact__fill", style: `width:${counted ? (withdrawal.lostGrowth / maxCost) * 100 : 0}%` })),
    h("span", { class: "impact__value", title: counted ? formatMoney(withdrawal.lostGrowth) : undefined }, counted ? formatMoneyCompact(withdrawal.lostGrowth) : "–"),
  );
}

function withdrawalParts(scenario: ScenarioView, entry: WithdrawalEntry, maxCost: number, actions: Actions): RowParts {
  const { withdrawal } = entry;
  const reduced = withdrawal.status === "planned" && withdrawal.shortfall > 0;
  const when = formatYearMonth(withdrawal.date);
  return {
    title: withdrawal.label,
    sub: reduced ? `Withdrawal · ${when} · only ${formatMoney(withdrawal.applied)} was available` : `Withdrawal · ${when}`,
    amount: formatMoney(withdrawal.amount),
    chips: [h("span", { class: "chip" }, STATUS_LABELS[withdrawal.status]), reduced ? h("span", { class: "chip chip--warn" }, "Reduced") : null],
    impact: impactCell(withdrawal, maxCost),
    edit: () =>
      openWithdrawalDialog({
        start: scenario.start,
        initial: { label: withdrawal.label, amount: withdrawal.amount, date: withdrawal.date },
        onSave: (draft) => actions.updateWithdrawal(withdrawal.id, draft),
      }),
    remove: () => actions.removeWithdrawal(withdrawal.id),
  };
}

function depositChangeParts(scenario: ScenarioView, entry: DepositChangeEntry, actions: Actions): RowParts {
  const { change } = entry;
  return {
    title: change.label,
    sub: `Deposit change · ${periodText(change)}`,
    amount: change.amount === 0 ? "Paused" : `${formatMoney(change.amount)}/mo`,
    chips: [h("span", { class: "chip" }, STATUS_LABELS[change.status])],
    impact: h("div", { class: "impact-empty", role: "cell" }),
    edit: () =>
      openDepositChangeDialog({
        start: scenario.start,
        initial: { label: change.label, amount: change.amount, startDate: change.startDate, endDate: change.endDate },
        onSave: (draft) => actions.updateDepositChange(change.id, draft),
      }),
    remove: () => actions.removeDepositChange(change.id),
  };
}

function oneTimeDepositParts(scenario: ScenarioView, entry: OneTimeDepositEntry, actions: Actions): RowParts {
  const { deposit } = entry;
  return {
    title: deposit.label,
    sub: `One-time deposit · ${formatYearMonth(deposit.date)}`,
    amount: `+${formatMoney(deposit.amount)}`,
    chips: [h("span", { class: "chip" }, STATUS_LABELS[deposit.status])],
    impact: h("div", { class: "impact-empty", role: "cell" }),
    edit: () =>
      openOneTimeDepositDialog({
        start: scenario.start,
        initial: { label: deposit.label, amount: deposit.amount, date: deposit.date },
        onSave: (draft) => actions.updateOneTimeDeposit(deposit.id, draft),
      }),
    remove: () => actions.removeOneTimeDeposit(deposit.id),
  };
}

function rowParts(scenario: ScenarioView, entry: TimelineEntry, maxCost: number, actions: Actions): RowParts {
  switch (entry.kind) {
    case "withdrawal":
      return withdrawalParts(scenario, entry, maxCost, actions);
    case "deposit-change":
      return depositChangeParts(scenario, entry, actions);
    case "one-time-deposit":
      return oneTimeDepositParts(scenario, entry, actions);
  }
}

function renderRow(
  scenario: ScenarioView,
  entry: TimelineEntry,
  selected: EventKey | null,
  maxCost: number,
  actions: Actions,
): HTMLElement {
  const parts = rowParts(scenario, entry, maxCost, actions);
  const isSelected = entry.key === selected;

  return h(
    "div",
    { class: "table__row", role: "row" },
    h(
      "div",
      { class: "table__who", role: "cell" },
      h("div", { class: `table__badge table__badge--${entry.kind}`, "aria-hidden": "true" }, String(entry.number)),
      // Selecting is the keyboard path to an event, so it is a real button around the text.
      h(
        "button",
        {
          class: "table__select",
          type: "button",
          "data-key": `event-select-${entry.key}`,
          "aria-pressed": String(isSelected),
          "aria-label": `Event ${entry.number}: ${parts.title}`,
          onclick: () => actions.selectEvent(isSelected ? null : entry.key),
        },
        h("span", { class: "table__title" }, parts.title),
        h("span", { class: "table__sub" }, parts.sub),
      ),
    ),
    h("div", { class: "table__amount", role: "cell" }, parts.amount),
    h("div", { class: "table__chips", role: "cell" }, ...parts.chips),
    parts.impact,
    h(
      "div",
      { class: "table__actions", role: "cell" },
      h(
        "button",
        {
          class: "btn-text",
          type: "button",
          "data-key": `event-edit-${entry.key}`,
          "aria-label": `Edit ${parts.title}`,
          onclick: parts.edit,
        },
        "Edit",
      ),
      h(
        "button",
        {
          class: "btn-text btn-text--danger",
          type: "button",
          "data-key": `event-remove-${entry.key}`,
          "aria-label": `Remove ${parts.title}`,
          onclick: parts.remove,
        },
        "Remove",
      ),
    ),
  );
}

/** All planned events in one list, in date order. Call it only when there is at least one. */
export function renderTimelineList(
  scenario: ScenarioView,
  timeline: readonly TimelineEntry[],
  state: AppState,
  actions: Actions,
): HTMLElement {
  const endLabel = monthLabel(scenario, yearsToMonths(state.horizon));
  const maxCost = Math.max(1, ...scenario.withdrawals.filter((w) => w.status === "planned").map((w) => w.lostGrowth));

  const head = h(
    "div",
    { class: "table__row table__row--head", role: "row" },
    h("span", { role: "columnheader" }, "Event"),
    h("span", { role: "columnheader" }, "Amount"),
    h("span", { role: "columnheader" }, "Status"),
    h("span", { role: "columnheader" }, `Lost growth by ${endLabel}`),
    h("span", { class: "visually-hidden", role: "columnheader" }, "Actions"),
  );

  return h(
    "div",
    { class: "table-card" },
    h(
      "div",
      { class: "table", role: "table", "aria-label": "Planned events in date order" },
      head,
      ...timeline.map((entry) => renderRow(scenario, entry, state.selectedEvent, maxCost, actions)),
    ),
  );
}
