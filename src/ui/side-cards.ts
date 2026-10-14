import { addMonths, formatYearMonth } from "../core/year-month";
import type { AppState, ScenarioView } from "../state/types";
import type { Actions } from "./actions";
import { h, s } from "./dom";
import { formatMoney, formatMoneyCompact } from "./format";
import { lastPoint, monthLabel } from "./view-helpers";

/** Read-only for now; becomes the editable form once the engine exists. */
export function renderInputsCard(scenario: ScenarioView): HTMLElement {
  const field = (id: string, label: string, value: string, unit: string): HTMLElement =>
    h(
      "div",
      { class: "field" },
      h("label", { for: id }, label),
      h("div", { class: "field__control" }, h("input", { id, value, readonly: true }), h("span", { class: "field__unit" }, unit)),
    );

  return h(
    "section",
    { class: "card", "aria-labelledby": "inputs-heading" },
    h("div", { class: "card__head" }, h("h2", { id: "inputs-heading" }, "Plan"), h("span", { class: "card__meta" }, "Sample data")),
    h(
      "div",
      { class: "fields" },
      field("start-amount", "Start amount", formatMoney(scenario.startAmount).replace(" kr", ""), "KR"),
      field("monthly-deposit", "Monthly deposit", formatMoney(scenario.monthlyDeposit).replace(" kr", ""), "KR/MO"),
      field("annual-return", "Expected return", String(scenario.annualReturnPct), "%/YR"),
      field("start-date", "Start", formatYearMonth(scenario.start), ""),
    ),
  );
}

export function renderGoalCard(scenario: ScenarioView): HTMLElement {
  const { goal } = scenario;
  const pct = goal.percentReached;
  const arc = "M22 104 A78 78 0 0 1 178 104";
  const arcAttrs = { d: arc, fill: "none", "stroke-width": 22, pathLength: 100 };

  const gauge = h(
    "div",
    { class: "gauge" },
    s(
      "svg",
      { viewBox: "0 0 200 116", "aria-hidden": "true" },
      s("path", { ...arcAttrs, class: "gauge__track" }),
      s("path", { ...arcAttrs, class: "gauge__value", "stroke-dasharray": `${Math.max(0, pct - 4.5)} 200` }),
      s("path", { ...arcAttrs, class: "gauge__tip", "stroke-dasharray": `${Math.min(pct, 3.5)} 200`, "stroke-dashoffset": -Math.max(0, pct - 3.5) }),
    ),
    h(
      "div",
      { class: "gauge__label" },
      h("div", { class: "gauge__number" }, h("strong", {}, String(pct)), h("span", {}, "%")),
      h("span", { class: "card__meta" }, `of ${formatMoney(goal.target)}`),
    ),
  );

  const reached =
    goal.reachedMonth === null ? "Not within 30 years" : formatYearMonth(addMonths(scenario.start, goal.reachedMonth));
  const stat = (label: string, value: string): HTMLElement =>
    h("div", { class: "stats__row" }, h("dt", {}, label), h("dd", {}, value));

  return h(
    "section",
    { class: "card", "aria-labelledby": "goal-heading", role: "group" },
    h(
      "div",
      { class: "card__head" },
      h("h2", { id: "goal-heading" }, `Goal by ${monthLabel(scenario, goal.month)}`),
      h("span", { class: "status" }, goal.shortfall === 0 ? "On track" : `Short ${formatMoneyCompact(goal.shortfall)}`),
    ),
    gauge,
    h(
      "dl",
      { class: "stats" },
      stat("Projected balance", formatMoney(goal.balanceAtGoal)),
      stat("Monthly deposit needed", `${formatMoney(goal.requiredMonthly)}/mo`),
      stat("Goal reached", reached),
    ),
  );
}

export function renderComparisonCard(
  scenarios: readonly ScenarioView[],
  active: ScenarioView,
  state: AppState,
  actions: Actions,
): HTMLElement {
  const balances = scenarios.map((scenario) => lastPoint(scenario, state.horizon).balance);
  const top = Math.max(1, ...balances);

  const rows = scenarios.map((scenario, i) => {
    const balance = balances[i] ?? 0;
    return h(
      "button",
      {
        class: "compare",
        type: "button",
        "data-key": `compare-${scenario.id}`,
        "aria-current": scenario.id === active.id ? "true" : "false",
        onclick: () => actions.selectScenario(scenario.id),
      },
      h("span", { class: "compare__row" }, h("span", {}, scenario.name), h("span", { class: "compare__amount" }, formatMoneyCompact(balance))),
      h("span", { class: "compare__track", style: "display:block" }, h("span", { class: "compare__fill", style: `display:block;width:${(balance / top) * 100}%` })),
    );
  });

  return h(
    "section",
    { class: "card card--dark", "aria-labelledby": "compare-heading" },
    h(
      "div",
      { class: "card__head" },
      h("h2", { id: "compare-heading" }, "Compare"),
      h("span", { class: "card__meta" }, `End balance · ${state.horizon} yrs`),
    ),
    ...rows,
  );
}
