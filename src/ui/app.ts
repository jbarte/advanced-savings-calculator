import type { AppState, ScenarioView } from "../state/types";
import type { Actions } from "./actions";
import { h } from "./dom";
import { renderPageTitle, renderProjectionCard } from "./projection-card";
import { renderComparisonCard, renderGoalCard, renderInputsCard } from "./side-cards";
import { renderSidebar } from "./sidebar";
import { renderTopbar } from "./topbar";
import { renderWithdrawals } from "./withdrawals-table";

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

  const page = h(
    "div",
    { class: "page" },
    h(
      "div",
      { class: "frame" },
      renderSidebar(scenarios, active, state, actions),
      h(
        "main",
        { class: "main" },
        renderTopbar(active, isDark, actions),
        h(
          "div",
          { class: "content" },
          h(
            "div",
            { class: "col-main" },
            renderPageTitle(active, state, actions),
            renderProjectionCard(active, state, actions),
            renderWithdrawals(active, state),
          ),
          h(
            "div",
            { class: "col-side" },
            renderInputsCard(active),
            renderGoalCard(active),
            renderComparisonCard(scenarios, active, state, actions),
            h(
              "p",
              { class: "disclaimer" },
              "Projections assume a constant return and are estimates only. This is not financial advice.",
            ),
          ),
        ),
      ),
    ),
  );

  root.replaceChildren(page);

  if (focusKey) root.querySelector<HTMLElement>(`[data-key="${CSS.escape(focusKey)}"]`)?.focus();
}
