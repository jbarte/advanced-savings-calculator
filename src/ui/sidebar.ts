import type { AppState, ScenarioView } from "../state/types";
import type { Actions } from "./actions";
import { h } from "./dom";
import { formatMoneyCompact } from "./format";
import { lastPoint, monthLabel } from "./view-helpers";

export function renderSidebar(
  scenarios: readonly ScenarioView[],
  active: ScenarioView,
  state: AppState,
  actions: Actions,
): HTMLElement {
  const items = scenarios.map((scenario) =>
    h(
      "button",
      {
        class: "nav__item",
        type: "button",
        "data-key": `scenario-${scenario.id}`,
        "aria-current": scenario.id === active.id ? "true" : "false",
        onclick: () => actions.selectScenario(scenario.id),
      },
      h("span", {}, scenario.name),
      h("span", { class: "nav__count" }, formatMoneyCompact(lastPoint(scenario, state.horizon).balance)),
    ),
  );

  const addButton = h(
    "button",
    { class: "nav__item nav__item--add", type: "button", disabled: true, title: "Coming soon" },
    h("span", {}, "+ New scenario"),
  );

  const { goal } = active;
  const goalMini = h(
    "div",
    { class: "goal-mini" },
    h("div", { class: "goal-mini__label" }, `Goal by ${monthLabel(active, goal.month)}`),
    h(
      "div",
      { class: "goal-mini__value" },
      formatMoneyCompact(goal.balanceAtGoal),
      h("span", {}, ` of ${formatMoneyCompact(goal.target)}`),
    ),
    h(
      "div",
      { class: "bar", role: "progressbar", "aria-valuenow": goal.percentReached, "aria-valuemin": 0, "aria-valuemax": 100 },
      h("div", { class: "bar__fill", style: `width:${goal.percentReached}%` }),
    ),
  );

  return h(
    "aside",
    { class: "sidebar" },
    h("div", { class: "brand" }, h("div", { class: "brand__mark", "aria-hidden": "true" }), h("div", { class: "brand__name" }, "Savings", h("span", {}, "calc"))),
    h("nav", { "aria-label": "Scenarios" }, h("h2", { class: "nav-heading" }, "Scenarios"), h("div", { class: "nav" }, ...items, addButton)),
    goalMini,
  );
}
