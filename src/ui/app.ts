import { buildTimeline } from "../state/timeline";
import { activeEntry, canAddPlan } from "../state/workspace";
import type { AppState, ScenarioView } from "../state/types";
import type { Actions } from "./actions";
import { h } from "./dom";
import { announce } from "./announcer";
import { noticeText } from "./notice-text";
import { renderNotice } from "./error-state";
import { renderSharedBanner } from "./shared-banner";
import { renderChartCard, renderHero } from "./projection-card";
import { renderGoalCard } from "./goal-card";
import { renderInputsCard } from "./side-cards";
import { renderAppBar } from "./topbar";
import type { PlanTab } from "./topbar";
import { renderEventsSection } from "./events-section";
import { messages } from "./i18n";

export interface AppView {
  /** The open plan, ready to draw. */
  readonly view: ScenarioView;
  readonly tabs: readonly PlanTab[];
  readonly state: AppState;
  readonly isDark: boolean;
}

export function renderApp(root: HTMLElement, view: AppView, actions: Actions): void {
  const { view: active, tabs, state, isDark } = view;
  const origin = activeEntry(state).origin;

  // Re-rendering replaces every element, so restore keyboard focus afterwards. When the focused element is
  // gone (a removed row, a swapped button), its `data-focus-next` names where focus goes instead.
  const focused = document.activeElement;
  const focusKey = focused?.getAttribute("data-key");
  const fallbackKey = focused?.getAttribute("data-focus-next");

  const timeline = buildTimeline(active.withdrawals, active.depositChanges, active.oneTimeDeposits);

  const shell = h(
    "div",
    { class: "shell" },
    renderAppBar(tabs, state.activeId, canAddPlan(state), active, isDark, actions),
    h(
      "main",
      { class: "canvas" },
      state.notice ? renderNotice(noticeText(state.notice), actions) : null,
      origin === "shared" ? renderSharedBanner(canAddPlan(state), actions) : null,
      renderHero(active, state, actions),
      renderChartCard(active, timeline, state, actions),
      h(
        "div",
        { class: "bento" },
        renderInputsCard(active, state, actions),
        renderGoalCard(active, actions),
      ),
      renderEventsSection(active, timeline, state, actions),
      h("p", { class: "disclaimer" }, messages.app.disclaimer),
    ),
  );

  root.replaceChildren(shell);
  document.title = active.planName === null ? messages.app.pageTitle : messages.app.pageTitleNamed(active.planName);

  const find = (key: string | null | undefined): HTMLElement | null =>
    key ? root.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`) : null;
  (find(focusKey) ?? find(fallbackKey))?.focus();
  announce(state.notice ? noticeText(state.notice) : "");
}
