import { MONTHS_PER_YEAR, addMonths, formatYearMonth } from "../core/year-month";
import { PLAN_LIMITS } from "../state/plan-document";
import type { AppState, GoalSummary, ScenarioView } from "../state/types";
import type { Actions } from "./actions";
import { renderTextField } from "./components";
import { h, s } from "./dom";
import { formatKronor, formatMoney, formatMoneyCompact } from "./format";
import { errorMessage, monthInputValue, parseEndYear, parseInflationPct, parseKronor, parseReturnPct, parseYearMonth } from "./parse-input";
import type { ParseResult } from "./parse-input";
import { openStartOverDialog } from "./start-over-dialog";
import { lastPoint, monthLabel } from "./view-helpers";

interface ParsedFieldProps<T> {
  readonly id: string;
  readonly label: string;
  readonly unit: string;
  readonly value: string;
  readonly dataKey: string;
  readonly type?: "text" | "month";
  readonly inputMode?: "numeric" | "decimal";
  readonly placeholder?: string;
  readonly parse: (text: string) => ParseResult<T>;
  readonly apply: (value: T) => void;
}

/** A text field whose text is checked and read by `parse`. Only valid values reach `apply`. */
function renderParsedField<T>(props: ParsedFieldProps<T>): HTMLElement {
  return renderTextField({
    id: props.id,
    label: props.label,
    unit: props.unit,
    value: props.value,
    dataKey: props.dataKey,
    ...(props.type ? { type: props.type } : {}),
    ...(props.inputMode ? { inputMode: props.inputMode } : {}),
    ...(props.placeholder ? { placeholder: props.placeholder } : {}),
    validate: errorMessage(props.parse),
    onCommit: (text) => {
      const result = props.parse(text);
      if (result.ok) props.apply(result.value);
    },
  });
}

/** What the Plan card says about where the plan lives. */
function planStatusText(state: AppState): string {
  if (state.planOrigin === "shared") return "Shared plan · not saved";
  const isExample = state.planOrigin === "example";
  if (state.storage === "blocked") return isExample ? "Example plan · not saved" : "Not saved: storage is blocked";
  if (state.storage === "saved") return "Saved in this browser";
  return isExample ? "Example plan" : "My plan";
}

function renderPlanActions(state: AppState, actions: Actions): HTMLElement {
  const isExample = state.planOrigin === "example";
  const status = h("span", { class: "card__meta" }, planStatusText(state));
  // A shared plan is kept or dropped from the banner above the chart.
  if (state.planOrigin === "shared") return h("div", { class: "card__head-side" }, status);
  return h(
    "div",
    { class: "card__head-side" },
    status,
    isExample
      ? h(
          "button",
          {
            class: "btn-text",
            type: "button",
            "data-key": "start-from-scratch",
            "data-focus-next": "start-over",
            onclick: () => actions.startFromScratch(),
          },
          "Start from scratch",
        )
      : h(
          "button",
          {
            class: "btn-text btn-text--danger",
            type: "button",
            "data-key": "start-over",
            "data-focus-next": "start-from-scratch",
            onclick: () => openStartOverDialog(() => actions.startOver()),
          },
          "Start over",
        ),
  );
}

export function renderInputsCard(scenario: ScenarioView, state: AppState, actions: Actions): HTMLElement {
  const side = renderPlanActions(state, actions);

  return h(
    "section",
    { class: "card", "aria-labelledby": "inputs-heading" },
    h("div", { class: "card__head" }, h("h2", { id: "inputs-heading" }, "Plan"), side),
    h(
      "div",
      { class: "fields" },
      renderParsedField({
        id: "start-amount",
        label: "Start amount",
        unit: "KR",
        value: formatKronor(scenario.startAmount),
        dataKey: "plan-start-amount",
        inputMode: "numeric",
        parse: (text) => parseKronor(text, PLAN_LIMITS.maxStartAmount),
        apply: (startAmount) => actions.updatePlan({ startAmount }),
      }),
      renderParsedField({
        id: "monthly-deposit",
        label: "Monthly deposit",
        unit: "KR/MO",
        value: formatKronor(scenario.monthlyDeposit),
        dataKey: "plan-monthly-deposit",
        inputMode: "numeric",
        parse: (text) => parseKronor(text, PLAN_LIMITS.maxMonthlyDeposit),
        apply: (monthlyDeposit) => actions.updatePlan({ monthlyDeposit }),
      }),
      renderParsedField({
        id: "annual-return",
        label: "Expected return",
        unit: "%/YR",
        value: String(scenario.annualReturnPct),
        dataKey: "plan-annual-return",
        inputMode: "decimal",
        parse: parseReturnPct,
        apply: (annualReturnPct) => actions.updatePlan({ annualReturnPct }),
      }),
      renderParsedField({
        id: "inflation",
        label: "Inflation",
        unit: "%/YR",
        value: String(scenario.inflationPct),
        dataKey: "plan-inflation",
        inputMode: "decimal",
        parse: parseInflationPct,
        apply: (inflationPct) => actions.updatePlan({ inflationPct }),
      }),
      renderParsedField({
        id: "start-date",
        label: "Start",
        unit: "",
        value: monthInputValue(scenario.start),
        dataKey: "plan-start-date",
        type: "month",
        placeholder: "YYYY-MM",
        parse: parseYearMonth,
        apply: (start) => actions.updatePlan({ start }),
      }),
      renderParsedField({
        id: "end-year",
        label: "End year",
        unit: `${scenario.horizonMonths / MONTHS_PER_YEAR} YRS`,
        value: String(addMonths(scenario.start, scenario.horizonMonths).year),
        dataKey: "plan-end-year",
        inputMode: "numeric",
        parse: (text) => parseEndYear(text, scenario.start.year),
        apply: (horizonYears) => actions.updatePlan({ horizonYears }),
      }),
    ),
  );
}

export function renderGoalCard(scenario: ScenarioView, goal: GoalSummary): HTMLElement {
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
    goal.reachedMonth === null ? "Not within the horizon" : formatYearMonth(addMonths(scenario.start, goal.reachedMonth));
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
  actions: Actions,
): HTMLElement {
  const balances = scenarios.map((scenario) => lastPoint(scenario).balance);
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
      h("span", { class: "card__meta" }, `End balance · ${active.horizonMonths / MONTHS_PER_YEAR} yrs`),
    ),
    ...rows,
  );
}
