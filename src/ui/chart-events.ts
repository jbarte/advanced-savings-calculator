import { formatYearMonth } from "../core/year-month";
import { chartMonthOf, isPlanned } from "../state/timeline";
import type { EventKey, TimelineEntry } from "../state/timeline";
import type { Actions } from "./actions";
import { assignLanes, bandExtent, monthToPercent } from "./chart-geometry";
import { h } from "./dom";
import { formatMoney } from "./format";

/** Badges closer than this (percent of the plot width) go in different lanes. About one badge on a phone. */
const MIN_BADGE_GAP = 8;
const MAX_LANES = 6;

const KIND_LABELS: Record<TimelineEntry["kind"], string> = {
  withdrawal: "Withdrawal",
  "deposit-change": "Deposit change",
  "one-time-deposit": "One-time deposit",
};

/** One short sentence about an event, used as the hover text and the accessible name of its badge. */
function describe(entry: TimelineEntry): string {
  switch (entry.kind) {
    case "withdrawal": {
      const { withdrawal } = entry;
      return `${withdrawal.label}: take out ${formatMoney(withdrawal.applied)} in ${formatYearMonth(withdrawal.date)}`;
    }
    case "deposit-change": {
      const { change } = entry;
      const what = change.amount === 0 ? "pause saving" : `save ${formatMoney(change.amount)} a month`;
      const until = change.endDate === null ? "" : ` until ${formatYearMonth(change.endDate)}`;
      return `${change.label}: ${what} from ${formatYearMonth(change.startDate)}${until}`;
    }
    case "one-time-deposit": {
      const { deposit } = entry;
      return `${deposit.label}: add ${formatMoney(deposit.amount)} in ${formatYearMonth(deposit.date)}`;
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
  const text = describe(entry);
  // Outside the tab order on purpose: the list rows are the keyboard path to the same events.
  return h(
    "button",
    {
      class: `chart__badge chart__badge--${entry.kind}`,
      type: "button",
      tabindex: -1,
      style: `left:${x}%;--lane:${lane}`,
      "aria-pressed": String(isSelected),
      "aria-label": `Event ${entry.number}: ${text}`,
      title: text,
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

/** A key to the kinds of event on the chart. Only kinds that are drawn are listed. Null when nothing is drawn. */
export function renderChartLegend(timeline: readonly TimelineEntry[]): HTMLElement | null {
  const kinds = new Set(timeline.filter(isPlanned).map((entry) => entry.kind));
  if (kinds.size === 0) return null;
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
  return h("ul", { class: "legend", "aria-label": "Events on the chart" }, ...items);
}
