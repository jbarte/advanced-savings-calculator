import { yearsToMonths } from "../core/year-month";
import { HORIZONS, METRICS } from "../state/types";
import type { AppState, Metric, ScenarioView } from "../state/types";
import type { Actions } from "./actions";
import { buildTimeline } from "../state/timeline";
import type { TimelineEntry } from "../state/timeline";
import { areaPath, axisTicks, isAllZero, linePath, nearestIndex, niceScale, toPoints, zeroLine } from "./chart-geometry";
import { renderChartEvents, renderChartLegend } from "./chart-events";
import { renderEmptyState } from "./components";
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

export function renderHero(scenario: ScenarioView, state: AppState, actions: Actions): HTMLElement {
  const end = lastPoint(scenario, state.horizon);

  const horizons = HORIZONS.map((years) =>
    h(
      "button",
      {
        class: "tabs__item",
        type: "button",
        "data-key": `horizon-${years}`,
        "aria-pressed": years === state.horizon ? "true" : "false",
        onclick: () => actions.setHorizon(years),
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
        h("h1", { id: "hero-heading", class: "hero__eyebrow", tabindex: -1, "data-key": "hero-heading" }, `${METRIC_LABELS[state.metric]} by ${monthLabel(scenario, end.month)}`),
        h(
          "p",
          { class: isLongAmount(end[state.metric]) ? "hero__value hero__value--long" : "hero__value" },
          formatKronor(end[state.metric]),
          h("span", { class: "hero__unit" }, "kr"),
        ),
        h("p", { class: "hero__sub" }, `${scenario.name} · How your savings grow, and what each withdrawal costs you.`),
      ),
      h("div", { class: "tabs", role: "group", "aria-label": "Time horizon" }, ...horizons),
    ),
    h("div", { class: "kpis" }, ...tiles),
  );
}

export function renderChartCard(scenario: ScenarioView, state: AppState, actions: Actions): HTMLElement {
  const timeline = buildTimeline(scenario.withdrawals, scenario.depositChanges, scenario.oneTimeDeposits);
  return h(
    "section",
    { class: "card card--chart", "aria-labelledby": "chart-heading" },
    h(
      "div",
      { class: "card__head" },
      h("h2", { id: "chart-heading" }, `${METRIC_LABELS[state.metric]} over time`),
      h("span", { class: "card__meta" }, `${scenario.start.year}–${scenario.start.year + state.horizon}`),
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
  if (isAllZero(visiblePoints(scenario, state.horizon).map((p) => p[state.metric]))) {
    return renderEmptyState(EMPTY_METRIC_TITLES[state.metric], "This shows up here once your plan includes it.");
  }
  return renderChart(scenario, state, timeline, actions);
}

function renderChart(
  scenario: ScenarioView,
  state: AppState,
  timeline: readonly TimelineEntry[],
  actions: Actions,
): HTMLElement {
  const points = visiblePoints(scenario, state.horizon);
  const values = points.map((p) => p[state.metric]);
  const scale = niceScale(Math.min(...values), Math.max(...values));
  const ticks = axisTicks(scale);
  const coords = toPoints(values, scale);
  const zeroY = zeroLine(scale);
  const totalMonths = yearsToMonths(state.horizon);

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
  const tooltip = h("div", { class: "chart__tooltip", role: "status" }, tooltipValue, tooltipLabel);

  let current = points.length - 1;
  const show = (index: number): void => {
    const point = points[index];
    const coord = coords[index];
    if (!point || !coord) return;
    current = index;
    const [x, y] = coord;
    cursor.style.left = `${x}%`;
    dot.style.left = `${x}%`;
    dot.style.top = `${y}%`;
    tooltip.style.left = `${x}%`;
    tooltip.style.top = `${y}%`;
    // Shift the tooltip so it stays inside the plot near the edges.
    tooltip.style.transform = `translate(-${x}%, calc(-100% - 14px))`;
    tooltipValue.textContent = formatMoney(point[state.metric]);
    tooltipLabel.textContent = monthLabel(scenario, point.month);
  };

  const plot = h(
    "div",
    {
      class: "chart__plot",
      tabindex: 0,
      "data-key": "chart",
      "aria-label": `${METRIC_LABELS[state.metric]} over time. Use the arrow keys to move between points.`,
      onpointermove: (event) => {
        const rect = plot.getBoundingClientRect();
        show(nearestIndex(((event as PointerEvent).clientX - rect.left) / rect.width, points.length));
      },
      onpointerleave: () => show(points.length - 1),
      onkeydown: (event) => {
        const key = (event as KeyboardEvent).key;
        if (key !== "ArrowLeft" && key !== "ArrowRight") return;
        event.preventDefault();
        show(Math.min(points.length - 1, Math.max(0, current + (key === "ArrowRight" ? 1 : -1))));
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

  const yLabels = ticks.map((tick) => h("span", {}, formatMoneyCompact(tick)));
  const step = state.horizon / 5;
  const xLabels = Array.from({ length: 6 }, (_, i) => h("span", {}, String(scenario.start.year + i * step)));

  return h(
    "div",
    { class: "chart" },
    h("div", { class: "chart__y", "aria-hidden": "true" }, ...yLabels),
    h("div", { class: "chart__body" }, plot, h("div", { class: "chart__x", "aria-hidden": "true" }, ...xLabels)),
  );
}
