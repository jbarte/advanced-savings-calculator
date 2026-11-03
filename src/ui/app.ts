import type { AppState, ScenarioView } from "../state/types";
import type { Actions } from "./actions";
import { h } from "./dom";
import { renderNotice } from "./error-state";
import { renderChartCard, renderHero } from "./projection-card";
import { renderComparisonCard, renderGoalCard, renderInputsCard } from "./side-cards";
import { renderAppBar } from "./topbar";
import { renderEventsSection } from "./events-section";

export interface AppView {
  readonly scenarios: readonly ScenarioView[];
  readonly state: AppState;
  readonly isDark: boolean;
}

export function renderApp(root: HTMLElement, view: AppView, actions: Actions): void {
  const { scenarios, state, isDark } = view;
  const active = scenarios.find((scenario) => scenario.id === state.scenarioId) ?? scenarios[0];
  if (!active) throw new Error("No scenarios to render");

  // Re-rendering replaces every element, so restore keyboard focus afterwards.
  const focusKey = document.activeElement?.getAttribute("data-key");

  const shell = h(
    "div",
    { class: "shell" },
    renderAppBar(scenarios, active, isDark, actions),
    h(
      "main",
      { class: "canvas" },
      state.notice ? renderNotice(state.notice, actions) : null,
      renderHero(active, state, actions),
      renderChartCard(active, state),
      h(
        "div",
        { class: "bento" },
        renderInputsCard(active, state, actions),
        active.goal ? renderGoalCard(active, active.goal) : null,
        scenarios.length > 1 ? renderComparisonCard(scenarios, active, state, actions) : null,
      ),
      renderEventsSection(active, state, actions),
      h(
        "p",
        { class: "disclaimer" },
        "Projections assume a constant return and are estimates only. This is not financial advice.",
      ),
    ),
  );

  root.replaceChildren(shell);

  if (focusKey) root.querySelector<HTMLElement>(`[data-key="${CSS.escape(focusKey)}"]`)?.focus();
}
