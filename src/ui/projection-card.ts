import { MONTHS_PER_YEAR, addMonths, yearsToMonths } from "../core/year-month";
import { HORIZON_PRESETS, METRICS } from "../state/types";
import type { AppState, Metric, ScenarioView } from "../state/types";
import { eventsAtMonth } from "../state/timeline";
import type { TimelineEntry } from "../state/timeline";
import type { Actions } from "./actions";
import { areaPath, axisMonths, axisTicks, cursorAfterKey, isAllZero, linePath, nearestIndex, niceScale, toPoints, zeroLine } from "./chart-geometry";
import { renderChartEvents, renderChartLegend } from "./chart-events";
import { renderEmptyState, renderToggle } from "./components";
import { h, s } from "./dom";
import { formatKronor, formatMoney, formatMoneyCompact } from "./format";
import { lastPoint, monthLabel, visiblePoints } from "./view-helpers";

const METRIC_LABELS: Record<Metric, string> = {
  balance: "Balance",
  deposited: "Deposited",
  growth: "Growth",
  withdrawn: "Withdrawn",
};

const EMPTY_METRIC_TITLES: Record<Metric, string> = {
  balance: "No balance yet",
  deposited: "No deposits yet",
  growth: "No growth yet",
  withdrawn: "No withdrawals yet",
};

/** Ten or more digits (1 000 000 000 kr and up) don't fit a phone at the normal headline size. */
const LONG_AMOUNT_DIGITS = 10;

function isLongAmount(ore: number): boolean {
  return formatKronor(ore).replace(/\D/g, "").length >= LONG_AMOUNT_DIGITS;
}

function heroSubtitle(scenario: ScenarioView): string {
  if (!scenario.inflationAdjusted) return `${scenario.name} · How your savings grow, and what each event adds or costs.`;
  return `${scenario.name} · Inflation adjusted at ${scenario.inflationPct} % a year. What you enter stays as entered.`;
}

export function renderHero(scenario: ScenarioView, state: AppState, actions: Actions): HTMLElement {
  const end = lastPoint(scenario);

  // Presets for the horizon; any other length is set with the end year in the Plan card.
  const horizons = HORIZON_PRESETS.map((years) =>
    h(
      "button",
      {
        class: "tabs__item",
        type: "button",
        "data-key": `horizon-${years}`,
        "aria-pressed": yearsToMonths(years) === scenario.horizonMonths ? "true" : "false",
        onclick: () => actions.updatePlan({ horizonYears: years }),
      },
      `${years} yrs`,
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
      h("span", { class: "tile__label" }, METRIC_LABELS[metric]),
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
        h("h1", { id: "hero-heading", class: "hero__eyebrow", tabindex: -1, "data-key": "hero-heading" }, `${METRIC_LABELS[state.metric]} by ${monthLabel(scenario, end.month)}${scenario.inflationAdjusted ? " · inflation adjusted" : ""}`),
        h(
          "p",
          { class: isLongAmount(end[state.metric]) ? "hero__value hero__value--long" : "hero__value" },
          formatKronor(end[state.metric]),
          h("span", { class: "hero__unit" }, "kr"),
        ),
        h("p", { class: "hero__sub" }, heroSubtitle(scenario)),
      ),
      h(
        "div",
        { class: "hero__controls" },
        h("div", { class: "tabs", role: "group", "aria-label": "Time horizon" }, ...horizons),
        renderToggle({ label: "Inflation adjusted", checked: scenario.inflationAdjusted, onChange: (on) => actions.setInflationAdjusted(on) }),
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
      h("h2", { id: "chart-heading" }, `${METRIC_LABELS[state.metric]} over time`),
      h(
        "span",
        { class: "card__meta" },
        `${scenario.start.year}–${addMonths(scenario.start, scenario.horizonMonths).year}${scenario.inflationAdjusted ? " · inflation adjusted" : ""}`,
      ),
    ),
    renderChartOrEmptyState(scenario, state, timeline, actions),
    renderChartLegend(timeline),
  );
}

function renderChartOrEmptyState(
  scenario: ScenarioView,
  state: AppState,
  timeline: readonly TimelineEntry[],
  actions: Actions,
): HTMLElement {
  if (!scenario.points.some((p) => p.balance > 0)) {
    return renderEmptyState("Nothing to show yet", "Enter a start amount or a monthly deposit to see your projection.");
  }
  if (isAllZero(visiblePoints(scenario).map((p) => p[state.metric]))) {
    return renderEmptyState(EMPTY_METRIC_TITLES[state.metric], "This shows up here once your plan includes it.");
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

function renderChart(
  scenario: ScenarioView,
  state: AppState,
  timeline: readonly TimelineEntry[],
  actions: Actions,
): HTMLElement {
  const points = visiblePoints(scenario);
  const values = points.map((p) => p[state.metric]);
  const scale = niceScale(Math.min(...values), Math.max(...values));
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
    tooltipEvents.replaceChildren(...events.map((entry) => h("li", {}, `${entry.number} · ${eventLabel(entry)}`)));
    const eventText = events.length === 0 ? "" : `. Events: ${events.map(eventLabel).join(", ")}`;
    plot.setAttribute("aria-valuenow", String(index));
    plot.setAttribute("aria-valuetext", `${when}: ${value}${eventText}`);
  };

  const plot = h(
    "div",
    {
      class: "chart__plot",
      tabindex: 0,
      "data-key": "chart",
      // A slider over the months: screen readers read the value text, and the keys follow the slider pattern.
      role: "slider",
      "aria-label": `${METRIC_LABELS[state.metric]} over time`,
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
    ...renderChartEvents(timeline, totalMonths, state.selectedEvent, actions),
    cursor,
    dot,
    tooltip,
  );
  show(current);
  const keysHint = h(
    "p",
    { id: "chart-keys", class: "visually-hidden" },
    "Arrow keys move one month, Page Up and Page Down one year, Home and End to the start and the end.",
  );

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
