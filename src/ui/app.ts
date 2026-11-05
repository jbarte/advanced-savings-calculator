import { buildTimeline } from "../state/timeline";
import type { AppState, ScenarioView } from "../state/types";
import type { Actions } from "./actions";
import { h } from "./dom";
import { announce } from "./announcer";
import { noticeText } from "./notice-text";
import { renderNotice } from "./error-state";
import { renderSharedBanner } from "./shared-banner";
import { renderChartCard, renderHero } from "./projection-card";
import { renderGoalCard } from "./goal-card";
import { renderComparisonCard, renderInputsCard } from "./side-cards";
import { renderAppBar } from "./topbar";
import { renderEventsSection } from "./events-section";
import { messages } from "./i18n";

export interface AppView {
  readonly scenarios: readonly ScenarioView[];
  readonly state: AppState;
  readonly isDark: boolean;
}

export function renderApp(root: HTMLElement, view: AppView, actions: Actions): void {
  const { scenarios, state, isDark } = view;
  const active = scenarios.find((scenario) => scenario.id === state.scenarioId) ?? scenarios[0];
  if (!active) throw new Error("No scenarios to render");

  // Re-rendering replaces every element, so restore keyboard focus afterwards. When the focused element is
  // gone (a removed row, a swapped button), its `data-focus-next` names where focus goes instead.
  const focused = document.activeElement;
  const focusKey = focused?.getAttribute("data-key");
  const fallbackKey = focused?.getAttribute("data-focus-next");

  const timeline = buildTimeline(active.withdrawals, active.depositChanges, active.oneTimeDeposits);

  const shell = h(
    "div",
    { class: "shell" },
    renderAppBar(scenarios, active, isDark, actions),
    h(
      "main",
      { class: "canvas" },
      state.notice ? renderNotice(noticeText(state.notice), actions) : null,
      state.planOrigin === "shared" ? renderSharedBanner(actions) : null,
      renderHero(active, state, actions),
      renderChartCard(active, timeline, state, actions),
      h(
        "div",
        { class: "bento" },
        renderInputsCard(active, state, actions),
        renderGoalCard(active, actions),
        scenarios.length > 1 ? renderComparisonCard(scenarios, active, actions) : null,
      ),
      renderEventsSection(active, timeline, state, actions),
      h("p", { class: "disclaimer" }, messages.app.disclaimer),
    ),
  );

  root.replaceChildren(shell);

  const find = (key: string | null | undefined): HTMLElement | null =>
    key ? root.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`) : null;
  (find(focusKey) ?? find(fallbackKey))?.focus();
  announce(state.notice ? noticeText(state.notice) : "");
}
