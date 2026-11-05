import { formatYearMonth, yearsToMonths } from "../core/year-month";
import { chartMonthOf } from "../state/timeline";
import type { EventKey, TimelineEntry } from "../state/timeline";
import type { EventStatus, Ore } from "../state/types";
import type { AppState, PlannedDepositChange, ScenarioView } from "../state/types";
import type { Actions } from "./actions";
import { openDepositChangeDialog } from "./deposit-change-dialog";
import { openOneTimeDepositDialog } from "./one-time-deposit-dialog";
import { h } from "./dom";
import { formatMoney, formatSignedMoney, formatSignedMoneyCompact } from "./format";
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

/** What is shared by every row's effect cell: where it is measured and how long the longest bar is. */
interface EffectScale {
  /** The month the effect is measured at, e.g. "Nov 2056". */
  readonly end: string;
  /** The largest effect in the list (as a positive number), which gets a full bar. */
  readonly max: Ore;
}

/** "442 743 kr of growth", or "−1 234 kr of growth" when the return is negative. */
function growthText(growth: Ore): string {
  return `${growth < 0 ? formatSignedMoney(growth) : formatMoney(growth)} of growth`;
}

/** Why an event that is not counted has no effect. */
function noEffectReason(status: EventStatus, end: string): string {
  return status === "before-start" ? "Before the plan starts, so it has no effect" : `After ${end}, so it has no effect by then`;
}

/**
 * The effect of an event on the balance at the end of the horizon: a bar and a signed amount, red for a loss and
 * green for a gain. `explain` is the full sentence shown on hover.
 */
function effectCell(effect: Ore, status: EventStatus, scale: EffectScale, explain: string): HTMLElement {
  const counted = status === "planned";
  const tone = !counted || effect === 0 ? "" : effect < 0 ? " impact--loss" : " impact--gain";
  return h(
    "div",
    { class: `impact${tone}`, role: "cell", title: counted ? explain : noEffectReason(status, scale.end) },
    h("span", { class: "impact__label" }, `Effect by ${scale.end}`),
    h("div", { class: "impact__track" }, h("div", { class: "impact__fill", style: `width:${counted ? (Math.abs(effect) / scale.max) * 100 : 0}%` })),
    h("span", { class: "impact__value" }, counted ? formatSignedMoneyCompact(effect) : "–"),
  );
}

function withdrawalParts(scenario: ScenarioView, entry: WithdrawalEntry, scale: EffectScale, actions: Actions): RowParts {
  const { withdrawal } = entry;
  const reduced = withdrawal.status === "planned" && withdrawal.shortfall > 0;
  const when = formatYearMonth(withdrawal.date);
  return {
    title: withdrawal.label,
    sub: reduced ? `Withdrawal · ${when} · only ${formatMoney(withdrawal.applied)} was available` : `Withdrawal · ${when}`,
    amount: formatMoney(withdrawal.amount),
    chips: [h("span", { class: "chip" }, STATUS_LABELS[withdrawal.status]), reduced ? h("span", { class: "chip chip--warn" }, "Reduced") : null],
    impact: effectCell(
      withdrawal.effect,
      withdrawal.status,
      scale,
      `${formatSignedMoney(withdrawal.effect)} by ${scale.end}: ${formatMoney(withdrawal.applied)} taken out, and ` +
        `${formatMoney(withdrawal.lostGrowth)} of growth it would have earned`,
    ),
    edit: () =>
      openWithdrawalDialog({
        start: scenario.start,
        initial: { label: withdrawal.label, amount: withdrawal.amount, date: withdrawal.date },
        onSave: (draft) => actions.updateWithdrawal(withdrawal.id, draft),
      }),
    remove: () => actions.removeWithdrawal(withdrawal.id),
  };
}

function depositChangeParts(scenario: ScenarioView, entry: DepositChangeEntry, scale: EffectScale, actions: Actions): RowParts {
  const { change } = entry;
  return {
    title: change.label,
    sub: `Deposit change · ${periodText(change)}`,
    amount: change.amount === 0 ? "Paused" : `${formatMoney(change.amount)}/mo`,
    chips: [h("span", { class: "chip" }, STATUS_LABELS[change.status])],
    impact: effectCell(
      change.effect,
      change.status,
      scale,
      `${formatSignedMoney(change.effect)} by ${scale.end}, compared with keeping the deposit as it was`,
    ),
    edit: () =>
      openDepositChangeDialog({
        start: scenario.start,
        initial: { label: change.label, amount: change.amount, startDate: change.startDate, endDate: change.endDate },
        onSave: (draft) => actions.updateDepositChange(change.id, draft),
      }),
    remove: () => actions.removeDepositChange(change.id),
  };
}

function oneTimeDepositParts(scenario: ScenarioView, entry: OneTimeDepositEntry, scale: EffectScale, actions: Actions): RowParts {
  const { deposit } = entry;
  return {
    title: deposit.label,
    sub: `One-time deposit · ${formatYearMonth(deposit.date)}`,
    amount: `+${formatMoney(deposit.amount)}`,
    chips: [h("span", { class: "chip" }, STATUS_LABELS[deposit.status])],
    impact: effectCell(
      deposit.effect,
      deposit.status,
      scale,
      `${formatSignedMoney(deposit.effect)} by ${scale.end}: ${formatMoney(deposit.amount)} deposited, and ` +
        `${growthText(deposit.effect - deposit.amount)} on it`,
    ),
    edit: () =>
      openOneTimeDepositDialog({
        start: scenario.start,
        initial: { label: deposit.label, amount: deposit.amount, date: deposit.date },
        onSave: (draft) => actions.updateOneTimeDeposit(deposit.id, draft),
      }),
    remove: () => actions.removeOneTimeDeposit(deposit.id),
  };
}

function rowParts(scenario: ScenarioView, entry: TimelineEntry, scale: EffectScale, actions: Actions): RowParts {
  switch (entry.kind) {
    case "withdrawal":
      return withdrawalParts(scenario, entry, scale, actions);
    case "deposit-change":
      return depositChangeParts(scenario, entry, scale, actions);
    case "one-time-deposit":
      return oneTimeDepositParts(scenario, entry, scale, actions);
  }
}

function renderRow(
  scenario: ScenarioView,
  entry: TimelineEntry,
  selected: EventKey | null,
  scale: EffectScale,
  actions: Actions,
): HTMLElement {
  const parts = rowParts(scenario, entry, scale, actions);
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
          onclick: () => actions.selectEvent(isSelected ? null : entry.key, chartMonthOf(entry)),
        },
        // The name read out is "Event 2: New car, Withdrawal · Nov 2031": number, title, kind and date.
        h("span", { class: "visually-hidden" }, `Event ${entry.number}: `),
        h("span", { class: "table__title" }, parts.title),
        h("span", { class: "visually-hidden" }, ", "),
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
          "data-focus-next": "event-add",
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
  const effects = [...scenario.withdrawals, ...scenario.depositChanges, ...scenario.oneTimeDeposits].map((event) => Math.abs(event.effect));
  const scale: EffectScale = { end: endLabel, max: Math.max(1, ...effects) };

  const head = h(
    "div",
    { class: "table__row table__row--head", role: "row" },
    h("span", { role: "columnheader" }, "Event"),
    h("span", { role: "columnheader" }, "Amount"),
    h("span", { role: "columnheader" }, "Status"),
    h("span", { role: "columnheader" }, `Effect by ${endLabel}`),
    h("span", { class: "visually-hidden", role: "columnheader" }, "Actions"),
  );

  return h(
    "div",
    { class: "table-card" },
    h(
      "div",
      { class: "table", role: "table", "aria-label": "Planned events in date order" },
      head,
      ...timeline.map((entry) => renderRow(scenario, entry, state.selectedEvent, scale, actions)),
    ),
  );
}
