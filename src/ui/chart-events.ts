import { chartMonthOf, isPlanned } from "../state/timeline";
import type { EventKey, TimelineEntry } from "../state/timeline";
import type { Actions } from "./actions";
import { assignLanes, bandExtent, monthToPercent } from "./chart-geometry";
import { h } from "./dom";
import { formatMoney, formatYearMonth } from "./format";
import { messages } from "./i18n";

/** Badges closer than this (percent of the plot width) go in different lanes. About one badge on a phone. */
const MIN_BADGE_GAP = 8;
const MAX_LANES = 6;

const KIND_LABELS: Record<TimelineEntry["kind"], string> = {
  withdrawal: messages.kinds.withdrawal,
  "deposit-change": messages.kinds.depositChange,
  "one-time-deposit": messages.kinds.oneTimeDeposit,
};

/** One short sentence about an event, used as the hover text and the accessible name of its badge. */
function describe(entry: TimelineEntry): string {
  switch (entry.kind) {
    case "withdrawal": {
      const { withdrawal } = entry;
      return messages.chart.withdrawal(withdrawal.label, formatMoney(withdrawal.applied), formatYearMonth(withdrawal.date));
    }
    case "deposit-change": {
      const { change } = entry;
      return messages.chart.depositChange(
        change.label,
        change.amount === 0,
        formatMoney(change.amount),
        formatYearMonth(change.startDate),
        change.endDate === null ? null : formatYearMonth(change.endDate),
      );
    }
    case "one-time-deposit": {
      const { deposit } = entry;
      return messages.chart.oneTimeDeposit(deposit.label, formatMoney(deposit.amount), formatYearMonth(deposit.date));
    }
  }
}

function periodBand(entry: TimelineEntry, totalMonths: number, selected: boolean): HTMLElement | null {
  if (entry.kind !== "deposit-change" || entry.change.endMonth === null) return null;
  const extent = bandExtent(entry.change.startMonth, entry.change.endMonth, totalMonths);
  if (!extent) return null;
  return h("div", {
    class: "chart__band",
    style: `left:${extent.left}%;width:${extent.width}%`,
    "aria-current": selected ? "true" : undefined,
    "aria-hidden": "true",
  });
}

function marker(entry: TimelineEntry, x: number, selected: boolean): HTMLElement {
  return h("div", {
    class: `chart__marker chart__marker--${entry.kind}`,
    style: `left:${x}%`,
    "aria-current": selected ? "true" : undefined,
    "aria-hidden": "true",
  });
}

function badge(entry: TimelineEntry, x: number, lane: number, selected: EventKey | null, actions: Actions): HTMLElement {
  const isSelected = entry.key === selected;
  const description = describe(entry);
  // Outside the tab order on purpose: the list rows are the keyboard path to the same events.
  return h(
    "button",
    {
      class: `chart__badge chart__badge--${entry.kind}`,
      type: "button",
      "data-event": entry.key,
      tabindex: -1,
      style: `left:${x}%;--lane:${lane}`,
      "aria-pressed": String(isSelected),
      "aria-label": messages.chart.eventLabel(entry.number, description),
      title: description,
      onclick: () => actions.selectEvent(isSelected ? null : entry.key, chartMonthOf(entry)),
    },
    String(entry.number),
  );
}

/**
 * The layer of events drawn over the chart: a shaded band for each deposit change with an end, a line for
 * each event, and a numbered badge on top. The numbers are the ones in the list below the chart.
 */
export function renderChartEvents(
  timeline: readonly TimelineEntry[],
  totalMonths: number,
  selected: EventKey | null,
  actions: Actions,
): HTMLElement[] {
  const events = timeline.filter(isPlanned);
  const xs = events.map((entry) => monthToPercent(entry.month, totalMonths));
  const lanes = assignLanes(xs, MIN_BADGE_GAP, MAX_LANES);

  const bands = events.map((entry) => periodBand(entry, totalMonths, entry.key === selected));
  const lines = events.map((entry, i) => marker(entry, xs[i] ?? 0, entry.key === selected));
  const badges = events.map((entry, i) => badge(entry, xs[i] ?? 0, lanes[i] ?? 0, selected, actions));
  return [...bands, ...lines, ...badges].filter((element): element is HTMLElement => element !== null);
}

/** A key to what is drawn on the chart: the kinds of event and the goal line. Null when nothing is drawn. */
export function renderChartLegend(timeline: readonly TimelineEntry[], showGoal: boolean): HTMLElement | null {
  const kinds = new Set(timeline.filter(isPlanned).map((entry) => entry.kind));
  if (kinds.size === 0 && !showGoal) return null;
  const items = (Object.keys(KIND_LABELS) as TimelineEntry["kind"][])
    .filter((kind) => kinds.has(kind))
    .map((kind) =>
      h(
        "li",
        { class: "legend__item" },
        h("span", { class: `legend__swatch legend__swatch--${kind}`, "aria-hidden": "true" }),
        KIND_LABELS[kind],
      ),
    );
  const goal = showGoal
    ? h("li", { class: "legend__item" }, h("span", { class: "legend__swatch legend__swatch--goal", "aria-hidden": "true" }), messages.chart.goalLegend)
    : null;
  return h("ul", { class: "legend", "aria-label": messages.chart.legendLabel }, ...items, goal);
}
