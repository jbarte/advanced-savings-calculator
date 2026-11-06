import { PLAN_LIMITS } from "../state/plan-document";
import { chartMonthOf } from "../state/timeline";
import { canAddPlan } from "../state/workspace";
import type { EventKey, TimelineEntry } from "../state/timeline";
import type { EventStatus, Ore } from "../state/types";
import type { AppState, PlannedDepositChange, ScenarioView } from "../state/types";
import type { Actions } from "./actions";
import { openDepositChangeDialog } from "./deposit-change-dialog";
import { openOneTimeDepositDialog } from "./one-time-deposit-dialog";
import { h } from "./dom";
import { formatMoney, formatSignedMoney, formatSignedMoneyCompact, formatYearMonth } from "./format";
import { STATUS_LABELS, monthLabel } from "./view-helpers";
import { openWithdrawalDialog } from "./withdrawal-dialog";
import { messages } from "./i18n";

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
  return change.endDate === null ? messages.list.periodOpen(from) : messages.list.period(from, formatYearMonth(change.endDate));
}

/** What is shared by every row's effect cell: where it is measured and how long the longest bar is. */
interface EffectScale {
  /** True when effects are inflation adjusted, so the hover text names both amounts. */
  readonly inflationAdjusted: boolean;
  /** The month the effect is measured at, e.g. "Nov 2056". */
  readonly end: string;
  /** The largest effect in the list (as a positive number), which gets a full bar. */
  readonly max: Ore;
}

/** "442 743 kr of growth", or "−1 234 kr of growth" when the return is negative. */
function growthText(growth: Ore): string {
  return messages.list.growth(growth < 0 ? formatSignedMoney(growth) : formatMoney(growth));
}

/** Why an event that is not counted has no effect. */
function noEffectReason(status: EventStatus, end: string): string {
  return status === "before-start" ? messages.list.noEffectBefore : messages.list.noEffectAfter(end);
}

/**
 * The effect of an event on the balance at the end of the horizon: a bar and a signed amount, red for a loss and
 * green for a gain. `explain` is the full sentence shown on hover.
 */
function effectCell(effect: Ore, status: EventStatus, scale: EffectScale, explain: string): HTMLElement {
  const counted = status === "planned";
  // The nominal breakdown (money in, growth) no longer adds up once the effect is divided by the price level.
  const hover = scale.inflationAdjusted ? messages.list.adjustedHover(formatSignedMoney(effect), scale.end) : explain;
  const tone = !counted || effect === 0 ? "" : effect < 0 ? " impact--loss" : " impact--gain";
  return h(
    "div",
    { class: `impact${tone}`, role: "cell", title: counted ? hover : noEffectReason(status, scale.end) },
    h("span", { class: "impact__label" }, messages.list.effectLabel(scale.end)),
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
    sub: reduced ? messages.list.withdrawalSubReduced(when, formatMoney(withdrawal.applied)) : messages.list.withdrawalSub(when),
    amount: formatMoney(withdrawal.amount),
    chips: [h("span", { class: "chip" }, STATUS_LABELS[withdrawal.status]), reduced ? h("span", { class: "chip chip--warn" }, messages.list.reduced) : null],
    impact: effectCell(
      withdrawal.effect,
      withdrawal.status,
      scale,
      messages.list.withdrawalExplain(
        formatSignedMoney(withdrawal.effect),
        scale.end,
        formatMoney(withdrawal.applied),
        formatMoney(withdrawal.lostGrowth),
      ),
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
    sub: messages.list.depositChangeSub(periodText(change)),
    amount: change.amount === 0 ? messages.list.paused : `${formatMoney(change.amount)}${messages.units.perMonth}`,
    chips: [h("span", { class: "chip" }, STATUS_LABELS[change.status])],
    impact: effectCell(
      change.effect,
      change.status,
      scale,
      messages.list.depositChangeExplain(formatSignedMoney(change.effect), scale.end),
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
    sub: messages.list.oneTimeSub(formatYearMonth(deposit.date)),
    amount: `+${formatMoney(deposit.amount)}`,
    chips: [h("span", { class: "chip" }, STATUS_LABELS[deposit.status])],
    impact: effectCell(
      deposit.effect,
      deposit.status,
      scale,
      messages.list.oneTimeExplain(
        formatSignedMoney(deposit.effect),
        scale.end,
        formatMoney(deposit.amount),
        growthText(deposit.effect - deposit.amount),
      ),
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
  canCopy: boolean,
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
        h("span", { class: "visually-hidden" }, messages.list.eventNumber(entry.number)),
        h("span", { class: "table__title" }, parts.title),
        h("span", { class: "visually-hidden" }, messages.list.nameSeparator),
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
          "aria-label": messages.list.editAria(parts.title),
          onclick: parts.edit,
        },
        messages.common.edit,
      ),
      h(
        "button",
        {
          class: "btn-text",
          type: "button",
          "data-key": `event-skip-${entry.key}`,
          disabled: !canCopy,
          title: canCopy ? messages.list.skipHover : messages.app.plansFull(PLAN_LIMITS.maxPlans),
          "aria-label": messages.list.skipAria(parts.title),
          onclick: () => actions.copyWithoutEvent(entry.key),
        },
        messages.list.skip,
      ),
      h(
        "button",
        {
          class: "btn-text btn-text--danger",
          type: "button",
          "data-key": `event-remove-${entry.key}`,
          "data-focus-next": "event-add",
          "aria-label": messages.list.removeAria(parts.title),
          onclick: parts.remove,
        },
        messages.common.remove,
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
  const endLabel = monthLabel(scenario, scenario.horizonMonths);
  const effects = [...scenario.withdrawals, ...scenario.depositChanges, ...scenario.oneTimeDeposits].map((event) => Math.abs(event.effect));
  const scale: EffectScale = { end: endLabel, max: Math.max(1, ...effects), inflationAdjusted: scenario.inflationAdjusted };

  const head = h(
    "div",
    { class: "table__row table__row--head", role: "row" },
    h("span", { role: "columnheader" }, messages.list.eventHeader),
    h("span", { role: "columnheader" }, messages.list.amountHeader),
    h("span", { role: "columnheader" }, messages.list.statusHeader),
    h("span", { role: "columnheader" }, messages.list.effectHeader(endLabel, scenario.inflationAdjusted)),
    h("span", { class: "visually-hidden", role: "columnheader" }, messages.list.actionsHeader),
  );

  return h(
    "div",
    { class: "table-card" },
    h(
      "div",
      { class: "table", role: "table", "aria-label": messages.list.ariaTable },
      head,
      ...timeline.map((entry) => renderRow(scenario, entry, state.selectedEvent, scale, canAddPlan(state), actions)),
    ),
  );
}
