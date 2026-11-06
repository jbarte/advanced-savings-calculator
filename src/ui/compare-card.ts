import { MONTHS_PER_YEAR } from "../core/year-month";
import { buildComparison, valueAtMonth, yearMonthOf } from "../state/comparison";
import type { Comparison } from "../state/comparison";
import type { AppState, ScenarioView } from "../state/types";
import type { Actions } from "./actions";
import { axisMonths, axisTicks, calendarPoints, cursorAfterKey, isAllZero, linePath, nearestIndex, niceScale, valueToPercent } from "./chart-geometry";
import { renderEmptyState } from "./components";
import { h, s } from "./dom";
import { formatMoney, formatMoneyCompact, formatSignedMoney, formatYearMonth } from "./format";
import { messages } from "./i18n";

/** How many line colours there are (`--compare-1` … `--compare-6`): five plans of the user's own and one from a link. */
const COLOURS = 6;

const colourOf = (index: number): string => `var(--compare-${(index % COLOURS) + 1})`;

function renderChart(comparison: Comparison, activeId: string): HTMLElement {
  const { lines, firstMonth, lastMonth, metric } = comparison;
  const every = lines.flatMap((line) => line.values);
  const scale = niceScale(Math.min(...every), Math.max(...every));
  const ticks = axisTicks(scale);
  const span = lastMonth - firstMonth;
  const paths = lines.map((line, i) => ({ line, colour: colourOf(i), d: linePath(calendarPoints(line.values, line.firstMonth, firstMonth, lastMonth, scale)) }));

  // The open plan is drawn last, so it is on top and thicker.
  const ordered = [...paths.filter((p) => p.line.id !== activeId), ...paths.filter((p) => p.line.id === activeId)];
  const svg = s(
    "svg",
    { class: "chart__svg", viewBox: "0 0 100 100", preserveAspectRatio: "none", "aria-hidden": "true" },
    ...ordered.map((p) =>
      s("path", { class: p.line.id === activeId ? "compare__line compare__line--open" : "compare__line", d: p.d, style: `stroke:${p.colour}` }),
    ),
  );

  const cursor = h("div", { class: "chart__cursor" });
  const tooltipTitle = h("strong", {});
  const tooltipRows = h("ul", { class: "compare__tooltip-rows" });
  const tooltip = h("div", { class: "chart__tooltip compare__tooltip", "aria-hidden": "true" }, tooltipTitle, tooltipRows);

  const last = span;
  let current = last;
  const show = (index: number): void => {
    const month = firstMonth + index;
    const x = span === 0 ? 50 : (index / span) * 100;
    current = index;
    cursor.style.left = `${x}%`;
    tooltip.style.left = `${x}%`;
    tooltip.style.top = "0";
    tooltip.style.transform = `translate(-${x}%, 0)`;
    const when = formatYearMonth(yearMonthOf(month));
    const present = lines.flatMap((line, i) => {
      const value = valueAtMonth(line, month);
      return value === null ? [] : [{ name: line.name, value: formatMoney(value), colour: colourOf(i) }];
    });
    tooltipTitle.textContent = when;
    tooltipRows.replaceChildren(
      ...present.map((row) =>
        h("li", {}, h("span", { class: "compare__swatch", style: `background:${row.colour}` }), h("span", {}, row.name), h("b", {}, row.value)),
      ),
    );
    plot.setAttribute("aria-valuenow", String(index));
    plot.setAttribute("aria-valuetext", messages.compare.valueText(when, present.map((row) => messages.compare.valuePart(row.name, row.value))));
  };

  const plot = h(
    "div",
    {
      class: "chart__plot",
      tabindex: 0,
      "data-key": "compare-chart",
      role: "slider",
      "aria-label": messages.compare.chartLabel(messages.metrics[metric]),
      "aria-describedby": "compare-keys",
      "aria-valuemin": 0,
      "aria-valuemax": last,
      onpointermove: (event) => {
        const rect = plot.getBoundingClientRect();
        show(nearestIndex(((event as PointerEvent).clientX - rect.left) / rect.width, span + 1));
      },
      onpointerleave: () => show(last),
      onkeydown: (event) => {
        const next = cursorAfterKey((event as KeyboardEvent).key, current, last, MONTHS_PER_YEAR);
        if (next === null) return;
        event.preventDefault();
        show(next);
      },
    },
    h("div", { class: "chart__grid", "aria-hidden": "true" }, ...ticks.map(() => h("div"))),
    scale.min < 0 ? h("div", { class: "chart__zero", style: `top:${valueToPercent(0, scale)}%`, "aria-hidden": "true" }) : null,
    svg,
    cursor,
    tooltip,
  );
  show(last);

  const yLabels = ticks.map((tick) => h("span", {}, formatMoneyCompact(tick)));
  const xLabels = axisMonths(span).map((offset) => h("span", {}, String(yearMonthOf(firstMonth + offset).year)));
  return h(
    "div",
    { class: "chart" },
    h("p", { id: "compare-keys", class: "visually-hidden" }, messages.chart.keysHint),
    h("div", { class: "chart__y", "aria-hidden": "true" }, ...yLabels),
    h("div", { class: "chart__body" }, plot, h("div", { class: "chart__x", "aria-hidden": "true" }, ...xLabels)),
  );
}

function renderLegend(comparison: Comparison): HTMLElement {
  return h(
    "ul",
    { class: "legend", "aria-label": messages.compare.legendLabel },
    ...comparison.lines.map((line, i) =>
      h("li", { class: "legend__item" }, h("span", { class: "compare__swatch", style: `background:${colourOf(i)}`, "aria-hidden": "true" }), line.name),
    ),
  );
}

function tone(amount: number): string {
  return amount < 0 ? " compare-table__diff--loss" : amount > 0 ? " compare-table__diff--gain" : "";
}

function renderTable(comparison: Comparison, openName: string, actions: Actions): HTMLElement {
  const head = messages.compare.headers;
  const cells = (...texts: string[]): HTMLElement[] => texts.map((text) => h("th", { scope: "col" }, text));

  const rows = comparison.rows.map((row, i) =>
    h(
      "tr",
      { "aria-current": row.open ? "true" : undefined },
      h(
        "th",
        { scope: "row" },
        h(
          "button",
          {
            class: "compare-table__plan",
            type: "button",
            "data-key": `compare-plan-${row.id}`,
            "aria-current": row.open ? "true" : "false",
            title: messages.compare.open(row.name),
            onclick: () => actions.selectPlan(Number(row.id)),
          },
          h("span", { class: "compare__swatch", style: `background:${colourOf(i)}`, "aria-hidden": "true" }),
          row.name,
        ),
      ),
      h("td", {}, String(row.endDate.year)),
      h("td", {}, formatMoney(row.balance)),
      h("td", {}, formatMoney(row.deposited)),
      h("td", {}, formatMoney(row.growth)),
      h("td", {}, formatMoney(row.withdrawn)),
      h(
        "td",
        { class: `compare-table__diff${tone(row.difference)}` },
        row.open ? messages.compare.openMarker : formatSignedMoney(row.difference),
      ),
    ),
  );

  return h(
    "div",
    { class: "compare-scroll" },
    h(
      "table",
      { class: "compare-table", "aria-label": messages.compare.tableLabel },
      h("thead", {}, h("tr", {}, h("th", { scope: "col" }, head.plan), ...cells(head.ends, head.balance, head.deposited, head.growth, head.withdrawn, head.difference(openName)))),
      h("tbody", {}, ...rows),
    ),
  );
}

/**
 * The Compare card: every plan as a line on one chart, and a table of their end figures with the difference to the
 * open plan. It follows the chart's metric and the inflation switch. Shown only when there are two or more plans.
 */
export function renderCompareCard(views: readonly ScenarioView[], active: ScenarioView, state: AppState, actions: Actions): HTMLElement {
  const comparison = buildComparison(views, active.id, state.metric);
  const everyValue = comparison.lines.flatMap((line) => line.values);
  const empty = isAllZero(everyValue);

  return h(
    "section",
    { class: "card compare-card", "aria-labelledby": "compare-heading" },
    h(
      "div",
      { class: "card__head" },
      h("h2", { id: "compare-heading" }, messages.compare.heading),
      h("span", { class: "card__meta" }, messages.compare.meta(messages.metrics[state.metric], active.inflationAdjusted)),
    ),
    empty ? renderEmptyState(messages.chart.nothingTitle, messages.chart.nothingHint) : renderChart(comparison, active.id),
    renderLegend(comparison),
    renderTable(comparison, active.name, actions),
  );
}
