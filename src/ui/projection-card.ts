import { HORIZONS, METRICS } from "../state/types";
import type { AppState, Metric, ScenarioView } from "../state/types";
import type { Actions } from "./actions";
import { areaPath, axisTicks, linePath, nearestIndex, niceScale, toPoints } from "./chart-geometry";
import { h, s } from "./dom";
import { formatMoney, formatMoneyCompact } from "./format";
import { lastPoint, monthLabel, visiblePoints } from "./view-helpers";

const METRIC_LABELS: Record<Metric, string> = {
  balance: "Balance",
  deposited: "Deposited",
  growth: "Growth",
  withdrawn: "Withdrawn",
};

export function renderPageTitle(scenario: ScenarioView, state: AppState, actions: Actions): HTMLElement {
  const index = HORIZONS.indexOf(state.horizon);
  const next = HORIZONS[(index + 1) % HORIZONS.length] ?? state.horizon;
  const endYear = scenario.start.year + state.horizon;

  return h(
    "div",
    { class: "page-title" },
    h(
      "div",
      {},
      h("h1", {}, "Projection"),
      h("p", {}, "How your savings grow, and what each withdrawal costs you."),
    ),
    h(
      "button",
      {
        class: "pill",
        type: "button",
        "data-key": "horizon",
        "aria-label": `Time horizon ${state.horizon} years. Change to ${next} years.`,
        onclick: () => actions.setHorizon(next),
      },
      h("span", { class: "pill__tag" }, "HORIZON"),
      h("span", { class: "pill__value" }, `${state.horizon} years · ${scenario.start.year}–${endYear}`),
    ),
  );
}

export function renderProjectionCard(scenario: ScenarioView, state: AppState, actions: Actions): HTMLElement {
  const end = lastPoint(scenario, state.horizon);

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
    { class: "card", "aria-labelledby": "projection-heading" },
    h(
      "div",
      { class: "card__head" },
      h("h2", { id: "projection-heading" }, METRIC_LABELS[state.metric]),
      h("div", { class: "card__meta" }, `At ${monthLabel(scenario, end.month)}`),
    ),
    h("div", { class: "tiles" }, ...tiles),
    renderChart(scenario, state),
  );
}

function renderChart(scenario: ScenarioView, state: AppState): HTMLElement {
  const points = visiblePoints(scenario, state.horizon);
  const values = points.map((p) => p[state.metric]);
  const scale = niceScale(Math.max(...values));
  const ticks = axisTicks(scale);
  const coords = toPoints(values, scale.max);
  const totalMonths = state.horizon * 12;

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
    s("path", { class: "chart__area", d: areaPath(coords) }),
    s("path", { class: "chart__line", d: linePath(coords) }),
  );

  const markers = scenario.withdrawals
    .filter((w) => w.month <= totalMonths)
    .map((w) =>
      h(
        "div",
        { class: "chart__marker", style: `left:${(w.month / totalMonths) * 100}%` },
        h("span", {}, `−${formatMoneyCompact(w.amount)}`),
      ),
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
    svg,
    ...markers,
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
