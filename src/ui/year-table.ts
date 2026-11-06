import type { AppState, ScenarioView } from "../state/types";
import type { Actions } from "./actions";
import { h } from "./dom";
import { formatMoney } from "./format";
import { messages } from "./i18n";
import { monthLabel, visiblePoints } from "./view-helpers";

/** The months the table has a row for: the start, then the same month every year, through the end of the horizon. */
const MONTHS_PER_ROW = 12;

/**
 * The chart's figures as a table, one row a year: balance, deposited, growth and withdrawn, as the chart and the tiles
 * show them (inflation adjusted when that switch is on). It is the way to read the chart without seeing it, and for
 * anyone who wants the numbers. A native `<details>`, so it works with the keyboard and a screen reader without script.
 */
export function renderYearTable(scenario: ScenarioView, state: AppState, actions: Actions): HTMLElement {
  const rows = visiblePoints(scenario).filter((point) => point.month % MONTHS_PER_ROW === 0);
  const head = messages.chart.yearTable;

  const details = h(
    "details",
    {
      class: "years",
      open: state.yearTableOpen,
      // Drawing the page with `open` set also fires "toggle", so only a real change from the user is passed on.
      ontoggle: () => {
        if (details.open !== state.yearTableOpen) actions.setYearTableOpen(details.open);
      },
    },
    h("summary", { class: "years__summary", "data-key": "year-table" }, head.toggle),
    h(
      "div",
      // A scrolling area must be reachable with the keyboard, and have a name.
      { class: "compare-scroll years__scroll", tabindex: 0, role: "region", "aria-label": head.tableLabel },
      h(
        "table",
        { class: "compare-table years__table" },
        h("caption", { class: "visually-hidden" }, head.caption(scenario.inflationAdjusted)),
        h(
          "thead",
          {},
          h(
            "tr",
            {},
            h("th", { scope: "col" }, head.date),
            h("th", { scope: "col" }, messages.metrics.balance),
            h("th", { scope: "col" }, messages.metrics.deposited),
            h("th", { scope: "col" }, messages.metrics.growth),
            h("th", { scope: "col" }, messages.metrics.withdrawn),
          ),
        ),
        h(
          "tbody",
          {},
          ...rows.map((point) =>
            h(
              "tr",
              {},
              h("th", { scope: "row" }, monthLabel(scenario, point.month)),
              h("td", {}, formatMoney(point.balance)),
              h("td", {}, formatMoney(point.deposited)),
              h("td", {}, formatMoney(point.growth)),
              h("td", {}, formatMoney(point.withdrawn)),
            ),
          ),
        ),
      ),
    ),
  );
  return details;
}
