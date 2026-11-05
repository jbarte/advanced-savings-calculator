import { MONTHS_PER_YEAR, addMonths } from "../core/year-month";
import { PLAN_LIMITS } from "../state/plan-document";
import type { AppState, ScenarioView } from "../state/types";
import type { Actions } from "./actions";
import { renderTextField } from "./components";
import { h } from "./dom";
import { formatKronor, formatMoneyCompact } from "./format";
import { errorMessage, monthInputValue, parseEndYear, parseInflationPct, parseKronor, parseReturnPct, parseYearMonth } from "./parse-input";
import type { ParseResult } from "./parse-input";
import { openStartOverDialog } from "./start-over-dialog";
import { lastPoint } from "./view-helpers";
import { messages } from "./i18n";

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
  const status = messages.planCard.status;
  if (state.planOrigin === "shared") return status.shared;
  const isExample = state.planOrigin === "example";
  if (state.storage === "blocked") return isExample ? status.exampleUnsaved : status.ownUnsaved;
  if (state.storage === "saved") return status.saved;
  return isExample ? status.example : status.own;
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
          messages.plan.startFromScratch,
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
          messages.planCard.startOver,
        ),
  );
}

export function renderInputsCard(scenario: ScenarioView, state: AppState, actions: Actions): HTMLElement {
  const side = renderPlanActions(state, actions);

  return h(
    "section",
    { class: "card", "aria-labelledby": "inputs-heading" },
    h("div", { class: "card__head" }, h("h2", { id: "inputs-heading" }, messages.planCard.heading), side),
    h(
      "div",
      { class: "fields" },
      renderParsedField({
        id: "start-amount",
        label: messages.planCard.fields.startAmount,
        unit: messages.units.currencyField,
        value: formatKronor(scenario.startAmount),
        dataKey: "plan-start-amount",
        inputMode: "numeric",
        parse: (text) => parseKronor(text, PLAN_LIMITS.maxStartAmount),
        apply: (startAmount) => actions.updatePlan({ startAmount }),
      }),
      renderParsedField({
        id: "monthly-deposit",
        label: messages.planCard.fields.monthlyDeposit,
        unit: messages.units.perMonthField,
        value: formatKronor(scenario.monthlyDeposit),
        dataKey: "plan-monthly-deposit",
        inputMode: "numeric",
        parse: (text) => parseKronor(text, PLAN_LIMITS.maxMonthlyDeposit),
        apply: (monthlyDeposit) => actions.updatePlan({ monthlyDeposit }),
      }),
      renderParsedField({
        id: "annual-return",
        label: messages.planCard.fields.expectedReturn,
        unit: messages.units.percentPerYearField,
        value: String(scenario.annualReturnPct),
        dataKey: "plan-annual-return",
        inputMode: "decimal",
        parse: parseReturnPct,
        apply: (annualReturnPct) => actions.updatePlan({ annualReturnPct }),
      }),
      renderParsedField({
        id: "inflation",
        label: messages.planCard.fields.inflation,
        unit: messages.units.percentPerYearField,
        value: String(scenario.inflationPct),
        dataKey: "plan-inflation",
        inputMode: "decimal",
        parse: parseInflationPct,
        apply: (inflationPct) => actions.updatePlan({ inflationPct }),
      }),
      renderParsedField({
        id: "start-date",
        label: messages.planCard.fields.start,
        unit: "",
        value: monthInputValue(scenario.start),
        dataKey: "plan-start-date",
        type: "month",
        placeholder: messages.common.yearMonthPlaceholder,
        parse: parseYearMonth,
        apply: (start) => actions.updatePlan({ start }),
      }),
      renderParsedField({
        id: "end-year",
        label: messages.planCard.fields.endYear,
        unit: messages.units.yearsField(scenario.horizonMonths / MONTHS_PER_YEAR),
        value: String(addMonths(scenario.start, scenario.horizonMonths).year),
        dataKey: "plan-end-year",
        inputMode: "numeric",
        parse: (text) => parseEndYear(text, scenario.start.year),
        apply: (horizonYears) => actions.updatePlan({ horizonYears }),
      }),
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
      h("h2", { id: "compare-heading" }, messages.compare.heading),
      h("span", { class: "card__meta" }, messages.compare.endBalance(active.horizonMonths / MONTHS_PER_YEAR)),
    ),
    ...rows,
  );
}
