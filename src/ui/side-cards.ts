import { MONTHS_PER_YEAR, addMonths } from "../core/year-month";
import { PLAN_LIMITS } from "../state/plan-document";
import { activeEntry, ownCount } from "../state/workspace";
import type { AppState, ScenarioView } from "../state/types";
import type { Actions } from "./actions";
import { renderTextField } from "./components";
import { h, s } from "./dom";
import { formatKronor, formatPercent } from "./format";
import { errorMessage, monthInputValue, parseEndYear, parseInflationPct, parseKronor, parseReturnPct, parseYearMonth } from "./parse-input";
import type { ParseResult } from "./parse-input";
import { openDeletePlanDialog } from "./delete-plan-dialog";
import { openFileDialog } from "./file-dialog";
import { openRenameDialog } from "./rename-dialog";
import { openStartOverDialog } from "./start-over-dialog";
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
  const { origin } = activeEntry(state);
  if (origin === "shared") return status.shared;
  const isExample = origin === "example";
  if (state.storage === "blocked") return isExample ? status.exampleUnsaved : status.ownUnsaved;
  if (state.storage === "saved") return status.saved;
  return isExample ? status.example : status.own;
}

const pencilIcon = (): SVGSVGElement =>
  s("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" }, s("path", { d: "M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" }));

/** The card's heading: "Plan", or the plan's name. It is also the way to rename the plan, so it is a button inside the heading. */
function renderPlanTitle(scenario: ScenarioView, actions: Actions): HTMLElement {
  return h(
    "h2",
    { id: "inputs-heading" },
    h(
      "button",
      {
        class: "card__title",
        type: "button",
        "data-key": "plan-rename",
        title: messages.planCard.renameHover,
        "aria-label": messages.planCard.renameAria(scenario.planName),
        onclick: () => openRenameDialog({ name: scenario.planName, onSave: (name) => actions.renamePlan(name) }),
      },
      scenario.planName ?? messages.planCard.heading,
      pencilIcon(),
    ),
  );
}

function renderPlanActions(scenario: ScenarioView, state: AppState, actions: Actions): HTMLElement {
  const { origin } = activeEntry(state);
  const isExample = origin === "example";
  const status = h("span", { class: "card__meta" }, planStatusText(state));
  const file = h(
    "button",
    {
      class: "btn-text",
      type: "button",
      "data-key": "plan-file",
      "aria-label": messages.planCard.fileAria,
      onclick: () => openFileDialog(scenario, actions),
    },
    messages.planCard.file,
  );
  // A shared plan is kept or dropped from the banner above the chart.
  if (origin === "shared") return h("div", { class: "card__head-side" }, status, file);
  const canDelete = ownCount(state.plans) > 1;
  return h(
    "div",
    { class: "card__head-side" },
    status,
    file,
    canDelete
      ? h(
          "button",
          {
            class: "btn-text btn-text--danger",
            type: "button",
            "data-key": "plan-delete",
            "data-focus-next": "plan-rename",
            "aria-label": messages.planCard.deleteAria(scenario.name),
            onclick: () => openDeletePlanDialog(scenario.name, () => actions.deletePlan(state.activeId)),
          },
          messages.planCard.delete,
        )
      : null,
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
  const side = renderPlanActions(scenario, state, actions);

  return h(
    "section",
    { class: "card", "aria-labelledby": "inputs-heading" },
    h("div", { class: "card__head" }, renderPlanTitle(scenario, actions), side),
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
        value: formatPercent(scenario.annualReturnPct),
        dataKey: "plan-annual-return",
        inputMode: "decimal",
        parse: parseReturnPct,
        apply: (annualReturnPct) => actions.updatePlan({ annualReturnPct }),
      }),
      renderParsedField({
        id: "inflation",
        label: messages.planCard.fields.inflation,
        unit: messages.units.percentPerYearField,
        value: formatPercent(scenario.inflationPct),
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
