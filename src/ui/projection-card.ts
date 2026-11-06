import { MONTHS_PER_YEAR, addMonths } from "../core/year-month";
import { METRICS } from "../state/types";
import { activeEntry } from "../state/workspace";
import type { AppState, ScenarioView } from "../state/types";
import { eventsAtMonth } from "../state/timeline";
import type { TimelineEntry } from "../state/timeline";
import type { Actions } from "./actions";
import {
  areaPath,
  axisMonths,
  axisTicks,
  chartGoalLine,
  cursorAfterKey,
  isAllZero,
  linePath,
  nearestIndex,
  niceScale,
  toPoints,
  valueToPercent,
  zeroLine,
} from "./chart-geometry";
import { renderChartEvents, renderChartLegend } from "./chart-events";
import { renderEmptyState, renderSteadyText, renderToggle } from "./components";
import { h, s } from "./dom";
import { formatKronor, formatMoney, formatMoneyCompact } from "./format";
import { lastPoint, monthLabel, visiblePoints } from "./view-helpers";
import { horizonOptions } from "./horizon-options";
import { messages } from "./i18n";
import { renderYearTable } from "./year-table";

/** Ten or more digits (1 000 000 000 kr and up) don't fit a phone at the normal headline size. */
const LONG_AMOUNT_DIGITS = 10;

function isLongAmount(ore: number): boolean {
  return formatKronor(ore).replace(/\D/g, "").length >= LONG_AMOUNT_DIGITS;
}

function heroSubtitle(scenario: ScenarioView): HTMLElement {
  return renderSteadyText(
    (adjusted) => [adjusted ? messages.hero.subtitleAdjusted(scenario.name, scenario.inflationPct) : messages.hero.subtitle(scenario.name)],
    scenario.inflationAdjusted,
  );
}

export function renderHero(scenario: ScenarioView, state: AppState, actions: Actions): HTMLElement {
  const end = lastPoint(scenario);

  // The plan's own horizon and the presets. They change what is shown, never the plan: the plan's horizon is set with
  // the end year in the Plan card.
  const planYears = activeEntry(state).plan.horizonYears;
  const shownYears = state.viewHorizonYears ?? planYears;
  const horizons = horizonOptions(planYears).map((option) =>
    h(
      "button",
      {
        class: "tabs__item",
        type: "button",
        "data-key": option.isPlan ? "horizon-plan" : `horizon-${option.years}`,
        "aria-pressed": option.years === shownYears ? "true" : "false",
        onclick: () => actions.setViewHorizon(option.isPlan ? null : option.years),
      },
      option.isPlan ? messages.hero.planHorizon(option.years) : messages.units.yearsShort(option.years),
    ),
  );

  const tiles = METRICS.map((metric) =>
    h(
      "button",
      {
        class: "tile",
        type: "button",
        "data-key": `metric-${metric}`,
        "aria-pressed": metric === state.metric ? "true" : "false",
        title: formatMoney(end[metric]),
        onclick: () => actions.selectMetric(metric),
      },
      h("span", { class: "tile__label" }, messages.metrics[metric]),
      h("span", { class: "tile__value" }, formatMoneyCompact(end[metric])),
    ),
  );

  return h(
    "section",
    { class: "hero", "aria-labelledby": "hero-heading" },
    h(
      "div",
      { class: "hero__top" },
      h(
        "div",
        {},
        h("h1", { id: "hero-heading", class: "hero__eyebrow", tabindex: -1, "data-key": "hero-heading" }, renderSteadyText((adjusted) => [messages.hero.eyebrow(messages.metrics[state.metric], monthLabel(scenario, end.month), adjusted)], scenario.inflationAdjusted)),
        h(
          "p",
          { class: isLongAmount(end[state.metric]) ? "hero__value hero__value--long" : "hero__value" },
          formatKronor(end[state.metric]),
          h("span", { class: "hero__unit" }, messages.units.currency),
        ),
        h("p", { class: "hero__sub" }, heroSubtitle(scenario)),
      ),
      h(
        "div",
        { class: "hero__controls" },
        h("div", { class: "tabs", role: "group", "aria-label": messages.hero.timeHorizon }, ...horizons),
        renderToggle({ label: messages.hero.inflationAdjusted, checked: scenario.inflationAdjusted, onChange: (on) => actions.setInflationAdjusted(on) }),
      ),
    ),
    h("div", { class: "kpis" }, ...tiles),
  );
}

export function renderChartCard(
  scenario: ScenarioView,
  timeline: readonly TimelineEntry[],
  state: AppState,
  actions: Actions,
): HTMLElement {
  return h(
    "section",
    { class: "card card--chart", "aria-labelledby": "chart-heading" },
    h(
      "div",
      { class: "card__head" },
      h("h2", { id: "chart-heading" }, messages.chart.title(messages.metrics[state.metric])),
      h(
        "span",
        { class: "card__meta" },
        renderSteadyText(
          (adjusted) => [messages.chart.period(scenario.start.year, addMonths(scenario.start, scenario.horizonMonths).year, adjusted)],
          scenario.inflationAdjusted,
        ),
      ),
    ),
    renderChartOrEmptyState(scenario, state, timeline, actions),
    renderChartLegend(timeline, chartGoalValue(scenario, state) !== null),
    renderYearTable(scenario, state, actions),
  );
}

function renderChartOrEmptyState(
  scenario: ScenarioView,
  state: AppState,
  timeline: readonly TimelineEntry[],
  actions: Actions,
): HTMLElement {
  if (!scenario.points.some((p) => p.balance > 0)) {
    return renderEmptyState(messages.chart.nothingTitle, messages.chart.nothingHint);
  }
  if (isAllZero(visiblePoints(scenario).map((p) => p[state.metric]))) {
    return renderEmptyState(messages.emptyMetric[state.metric], messages.chart.metricEmptyHint);
  }
  return renderChart(scenario, state, timeline, actions);
}

/** The label of an event, for the tooltip and the value text. */
function eventLabel(entry: TimelineEntry): string {
  switch (entry.kind) {
    case "withdrawal":
      return entry.withdrawal.label;
    case "deposit-change":
      return entry.change.label;
    case "one-time-deposit":
      return entry.deposit.label;
  }
}

/**
 * Where the goal line goes on the chart, or null for none. It shows for the balance, for a goal inside the
 * chart's months, and (when the inflation switch is on) at the goal's value in today's money, so it sits at the
 * same height as the balance it is compared with.
 */
function chartGoalValue(scenario: ScenarioView, state: AppState): number | null {
  const { goal } = scenario;
  if (state.metric !== "balance" || goal === null || goal.status !== "ok" || !goal.withinHorizon) return null;
  const highest = Math.max(...visiblePoints(scenario).map((point) => point.balance));
  return chartGoalLine(scenario.inflationAdjusted ? goal.targetInflationAdjusted : goal.target, highest);
}

function renderChart(
  scenario: ScenarioView,
  state: AppState,
  timeline: readonly TimelineEntry[],
  actions: Actions,
): HTMLElement {
  const points = visiblePoints(scenario);
  const values = points.map((p) => p[state.metric]);
  const goalValue = chartGoalValue(scenario, state);
  const scale = niceScale(Math.min(...values), Math.max(Math.max(...values), goalValue ?? 0));
  const ticks = axisTicks(scale);
  const coords = toPoints(values, scale);
  const zeroY = zeroLine(scale);
  const totalMonths = scenario.horizonMonths;

  const svg = s(
    "svg",
    { class: "chart__svg", viewBox: "0 0 100 100", preserveAspectRatio: "none", "aria-hidden": "true" },
    s(
      "defs",
      {},
      s(
        "linearGradient",
        { id: "chart-fill", x1: 0, y1: 0, x2: 0, y2: 1 },
        s("stop", { class: "chart__fill-stop", offset: 0, "stop-opacity": 0.1 }),
        s("stop", { class: "chart__fill-stop", offset: 1, "stop-opacity": 0 }),
      ),
    ),
    s("path", { class: "chart__area", d: areaPath(coords, zeroY) }),
    s("path", { class: "chart__line", d: linePath(coords) }),
  );

  const cursor = h("div", { class: "chart__cursor" });
  const dot = h("div", { class: "chart__dot" });
  const tooltipValue = h("strong", {});
  const tooltipLabel = h("span", {});
  const tooltipEvents = h("ul", { class: "chart__tooltip-events" });
  // Hidden from screen readers: the slider's value text says the same, once per key press.
  const tooltip = h("div", { class: "chart__tooltip", "aria-hidden": "true" }, tooltipValue, tooltipLabel, tooltipEvents);

  const last = points.length - 1;
  // The cursor rests where the keyboard or a selected event left it, so a re-render doesn't move it.
  const resting = state.chartMonth === null ? last : Math.min(last, Math.max(0, state.chartMonth));
  let current = resting;
  const show = (index: number): void => {
    const point = points[index];
    const coord = coords[index];
    if (!point || !coord) return;
    current = index;
    const events = eventsAtMonth(timeline, point.month);
    const when = monthLabel(scenario, point.month);
    const value = formatMoney(point[state.metric]);
    const [x, y] = coord;
    cursor.style.left = `${x}%`;
    dot.style.left = `${x}%`;
    dot.style.top = `${y}%`;
    tooltip.style.left = `${x}%`;
    tooltip.style.top = `${y}%`;
    // Shift the tooltip so it stays inside the plot near the edges.
    tooltip.style.transform = `translate(-${x}%, calc(-100% - 14px))`;
    tooltipValue.textContent = value;
    tooltipLabel.textContent = when;
    tooltipEvents.replaceChildren(...events.map((entry) => h("li", {}, messages.chart.tooltipEvent(entry.number, eventLabel(entry)))));
    plot.setAttribute("aria-valuenow", String(index));
    plot.setAttribute("aria-valuetext", messages.chart.valueText(when, value, events.map(eventLabel)));
  };

  const plot = h(
    "div",
    {
      class: "chart__plot",
      tabindex: 0,
      "data-key": "chart",
      // A slider over the months: screen readers read the value text, and the keys follow the slider pattern.
      role: "slider",
      "aria-label": messages.chart.title(messages.metrics[state.metric]),
      "aria-describedby": "chart-keys",
      "aria-valuemin": 0,
      "aria-valuemax": last,
      onpointermove: (event) => {
        const rect = plot.getBoundingClientRect();
        show(nearestIndex(((event as PointerEvent).clientX - rect.left) / rect.width, points.length));
      },
      onpointerleave: () => show(resting),
      onkeydown: (event) => {
        const next = cursorAfterKey((event as KeyboardEvent).key, current, last, MONTHS_PER_YEAR);
        if (next === null) return;
        event.preventDefault();
        show(next);
        actions.setChartMonth(points[next]?.month ?? next);
      },
    },
    h("div", { class: "chart__grid", "aria-hidden": "true" }, ...ticks.map(() => h("div"))),
    scale.min < 0 ? h("div", { class: "chart__zero", style: `top:${zeroY}%`, "aria-hidden": "true" }) : null,
    svg,
    goalValue === null
      ? null
      : h(
          "div",
          { class: "chart__goal", style: `top:${valueToPercent(goalValue, scale)}%`, "aria-hidden": "true" },
          h("span", {}, messages.chart.goalLabel(formatMoneyCompact(goalValue))),
        ),
    ...renderChartEvents(timeline, totalMonths, state.selectedEvent, actions),
    cursor,
    dot,
    tooltip,
  );
  show(current);
  const keysHint = h("p", { id: "chart-keys", class: "visually-hidden" }, messages.chart.keysHint);

  const yLabels = ticks.map((tick) => h("span", {}, formatMoneyCompact(tick)));
  const xLabels = axisMonths(totalMonths).map((month) => h("span", {}, String(addMonths(scenario.start, month).year)));

  return h(
    "div",
    { class: "chart" },
    keysHint,
    h("div", { class: "chart__y", "aria-hidden": "true" }, ...yLabels),
    h("div", { class: "chart__body" }, plot, h("div", { class: "chart__x", "aria-hidden": "true" }, ...xLabels)),
  );
}
