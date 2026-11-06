import { buildTimeline } from "../state/timeline";
import { activeEntry, canAddPlan } from "../state/workspace";
import type { PlanFields } from "../state/plan-document";
import type { AppState, ScenarioView } from "../state/types";
import type { Actions } from "./actions";
import { h } from "./dom";
import { announce } from "./announcer";
import { noticeText } from "./notice-text";
import { renderNotice } from "./error-state";
import { renderSharedBanner } from "./shared-banner";
import { renderChartCard, renderHero } from "./projection-card";
import { renderCompareCard } from "./compare-card";
import { renderGoalCard } from "./goal-card";
import { renderInputsCard } from "./side-cards";
import { captureCharts, glideCharts } from "./chart-glide";
import { renderAppBar } from "./topbar";
import type { PlanTab } from "./topbar";
import { renderEventsSection } from "./events-section";
import { messages } from "./i18n";

export interface AppView {
  /** The open plan, ready to draw. */
  readonly view: ScenarioView;
  /** Every plan, ready to draw, in tab order. The Compare card shows when there are two or more. */
  readonly views: readonly ScenarioView[];
  readonly tabs: readonly PlanTab[];
  readonly state: AppState;
  readonly isDark: boolean;
  /** The open plan with some fields changed, as it would be drawn, or null when the change is not valid. */
  readonly preview: (patch: Partial<PlanFields>) => ScenarioView | null;
}

export function renderApp(root: HTMLElement, view: AppView, actions: Actions): void {
  const { view: active, views, tabs, state, isDark } = view;
  const origin = activeEntry(state).origin;

  // Re-rendering replaces every element, so restore keyboard focus afterwards. When the focused element is
  // gone (a removed row, a swapped button), its `data-focus-next` names where focus goes instead.
  const focused = document.activeElement;
  const focusKey = focused?.getAttribute("data-key");
  const fallbackKey = focused?.getAttribute("data-focus-next");

  // What the charts drew and which plan the page showed, to glide from the old chart or fade in another plan.
  const drawnBefore = captureCharts(root);
  const planBefore = root.querySelector(".shell")?.getAttribute("data-plan") ?? null;
  const planSwitched = planBefore !== null && planBefore !== String(state.activeId);

  const timeline = buildTimeline(active.withdrawals, active.depositChanges, active.oneTimeDeposits);
  let hero = renderHero(active, state, actions);
  let chartCard = renderChartCard(active, timeline, state, actions);

  /*
   * While a slider in the Plan card moves, only the headline and the chart are drawn again, from a preview that is not
   * saved; the rest of the page (and the slider being dragged) stays. At most once a frame, with the latest value.
   */
  let pending: Partial<PlanFields> | null = null;
  let frame = 0;
  const drawPreview = (patch: Partial<PlanFields>): void => {
    const previewed = view.preview(patch);
    if (!previewed) return;
    const previewTimeline = buildTimeline(previewed.withdrawals, previewed.depositChanges, previewed.oneTimeDeposits);
    const nextHero = renderHero(previewed, state, actions);
    const nextChart = renderChartCard(previewed, previewTimeline, state, actions);
    hero.replaceWith(nextHero);
    chartCard.replaceWith(nextChart);
    hero = nextHero;
    chartCard = nextChart;
  };
  const livePreview = (patch: Partial<PlanFields>): void => {
    pending = patch;
    if (frame !== 0) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (pending) drawPreview(pending);
      pending = null;
    });
  };

  const shell = h(
    "div",
    { class: "shell", "data-plan": String(state.activeId) },
    renderAppBar(tabs, state.activeId, canAddPlan(state), active, isDark, actions),
    h(
      "main",
      { class: planSwitched ? "canvas canvas--switched" : "canvas" },
      state.notice ? renderNotice(noticeText(state.notice), actions) : null,
      origin === "shared" ? renderSharedBanner(canAddPlan(state), actions) : null,
      hero,
      chartCard,
      views.length > 1 ? renderCompareCard(views, active, state, actions) : null,
      h(
        "div",
        { class: "bento" },
        renderInputsCard(active, state, actions, livePreview),
        renderGoalCard(active, actions),
      ),
      renderEventsSection(active, timeline, state, actions),
      h("p", { class: "disclaimer" }, messages.app.disclaimer),
    ),
  );

  root.replaceChildren(shell);
  // Another plan fades in (see `.canvas--switched`); the same plan, changed, has its chart glide to the new shape.
  if (!planSwitched) glideCharts(root, drawnBefore);
  document.title = active.planName === null ? messages.app.pageTitle : messages.app.pageTitleNamed(active.planName);

  const find = (key: string | null | undefined): HTMLElement | null =>
    key ? root.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`) : null;
  (find(focusKey) ?? find(fallbackKey))?.focus();
  announce(state.notice ? noticeText(state.notice) : "");
}
