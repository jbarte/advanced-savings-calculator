import type { AppState, ScenarioView } from "../state/types";
import { h } from "./dom";
import { formatMoney, formatMoneyCompact } from "./format";
import { initials, monthLabel } from "./view-helpers";

export function renderWithdrawals(scenario: ScenarioView, state: AppState): HTMLElement {
  const horizonMonths = state.horizon * 12;
  const endLabel = monthLabel(scenario, horizonMonths);
  const costs = scenario.withdrawals.map((w) => w.costByHorizon[state.horizon]);
  const maxCost = Math.max(1, ...costs);

  const rows = scenario.withdrawals.map((w, i) => {
    const cost = costs[i] ?? 0;
    const inHorizon = w.month < horizonMonths;
    return h(
      "div",
      { class: "table__row", role: "row" },
      h(
        "div",
        { class: "table__who", role: "cell" },
        h("div", { class: "table__badge", "aria-hidden": "true" }, initials(w.label)),
        h("div", {}, h("div", { class: "table__title" }, w.label), h("div", { class: "table__sub" }, monthLabel(scenario, w.month))),
      ),
      h("div", { class: "table__amount", role: "cell" }, formatMoney(w.amount)),
      h("div", { role: "cell" }, h("span", { class: "chip" }, inHorizon ? "Planned" : "After horizon")),
      h(
        "div",
        { class: "impact", role: "cell" },
        h("div", { class: "impact__track" }, h("div", { class: "impact__fill", style: `width:${(cost / maxCost) * 100}%` })),
        h("span", { class: "impact__value", title: formatMoney(cost) }, inHorizon ? formatMoneyCompact(cost) : "–"),
      ),
    );
  });

  const head = h(
    "div",
    { class: "table__row table__row--head", role: "row" },
    h("span", { role: "columnheader" }, "Withdrawal"),
    h("span", { role: "columnheader" }, "Amount"),
    h("span", { role: "columnheader" }, "Status"),
    h("span", { role: "columnheader" }, `Lost growth by ${endLabel}`),
  );

  const body = rows.length
    ? h("div", { class: "table", role: "table", "aria-label": "Planned withdrawals" }, head, ...rows)
    : h("div", { class: "table__empty" }, "No planned withdrawals in this scenario.");

  return h(
    "section",
    { class: "section" },
    h(
      "div",
      { class: "section-head" },
      h("h2", {}, "Planned withdrawals"),
      h("span", { class: "card__meta" }, `${rows.length} planned`),
    ),
    h("div", { class: "table-card" }, body),
  );
}
