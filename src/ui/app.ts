import { buildTimeline } from "../state/timeline";
import { activeEntry, canAddPlan } from "../state/workspace";
import type { PlanPreview } from "./plan-slider";
import type { AppState, ScenarioView } from "../state/types";
import type { Actions } from "./actions";
import { captureHeadline, countHeadline } from "./count-up";
import { h, s } from "./dom";
import { formatMoney } from "./format";
import { lastPoint, monthLabel } from "./view-helpers";
import { announce } from "./announcer";
import { noticeText } from "./notice-text";
import { renderNotice } from "./error-state";
import { renderSharedBanner } from "./shared-banner";
import { renderChartCard, renderHero } from "./projection-card";
import { renderCompareCard } from "./compare-card";
import { renderGoalCard } from "./goal-card";
import { renderInputsCard } from "./side-cards";
import { PREVIEW_GLIDE_MS, captureBadges, captureCharts, glideCharts, introduceChart, popNewBadges } from "./chart-glide";
import { renderAppBar } from "./topbar";
import type { PlanTab } from "./topbar";
import { renderEventsSection } from "./events-section";
import { messages } from "./i18n";

const lockIcon = (): SVGSVGElement =>
  s("svg", { class: "icon", viewBox: "0 0 24 24", "aria-hidden": "true" }, s("path", { d: "M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3" }));

export interface AppView {
  /** The open plan, ready to draw. */
  readonly view: ScenarioView;
  /** Every plan, ready to draw, in tab order. The Compare card shows when there are two or more. */
  readonly views: readonly ScenarioView[];
  readonly tabs: readonly PlanTab[];
  readonly state: AppState;
  readonly isDark: boolean;
  /** The open plan with some fields changed, as it would be drawn, or null when the change is not valid. */
  readonly preview: (patch: PlanPreview) => ScenarioView | null;
}

/**
 * Draws the whole page into `root`, replacing what was there. Around that it keeps the page steady: keyboard focus is put
 * back (by `data-key`, or the element named by `data-focus-next` when the focused one is gone), the charts glide from
 * where they were drawn, a new badge pops, another plan fades in, and a Plan card slider's live preview redraws only the
 * headline, the chart and the Goal card (`drawPreview`), leaving the slider being dragged where it is.
 */
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
  const badgesBefore = captureBadges(root);
  const headlineBefore = captureHeadline(root);
  const planBefore = root.querySelector(".shell")?.getAttribute("data-plan") ?? null;
  const planSwitched = planBefore !== null && planBefore !== String(state.activeId);

  const timeline = buildTimeline(active.withdrawals, active.depositChanges, active.oneTimeDeposits);
  let hero = renderHero(active, state, actions);
  let chartCard = renderChartCard(active, timeline, state, actions);

  /*
   * While a slider in the Plan card moves, only the headline and the chart are drawn again, from a preview that is not
   * saved; the rest of the page (and the slider being dragged) stays. At most once a frame, with the latest value.
   */
  let pending: PlanPreview | null = null;
  let frame = 0;
  // Where the Plan card is far from the chart (a phone, a narrow window) the result shows in a pill at the top while a
  // slider moves, then goes away. The CSS hides it when the chart is beside the Plan card.
  const readout = h("div", { class: "live-readout", "aria-hidden": "true", hidden: true });
  let readoutTimer = 0;
  const showReadout = (previewed: ScenarioView): void => {
    const end = lastPoint(previewed);
    readout.replaceChildren(
      h("span", {}, messages.hero.eyebrow(messages.metrics[state.metric], monthLabel(previewed, end.month), previewed.inflationAdjusted)),
      h("strong", {}, formatMoney(end[state.metric])),
    );
    readout.hidden = false;
    window.clearTimeout(readoutTimer);
    readoutTimer = window.setTimeout(() => (readout.hidden = true), 1500);
  };
  const drawPreview = (patch: PlanPreview): void => {
    const previewed = view.preview(patch);
    if (!previewed) return;
    const previewTimeline = buildTimeline(previewed.withdrawals, previewed.depositChanges, previewed.oneTimeDeposits);
    // The goal slider sits beside the gauge it moves, so it needs no pill with the balance.
    if (patch.goal === undefined) showReadout(previewed);
    const nextHero = renderHero(previewed, state, actions);
    const nextChart = renderChartCard(previewed, previewTimeline, state, actions);
    // Where the line is drawn right now (possibly part of the way from the last step), so each step glides on from there.
    const drawn = captureCharts(chartCard);
    hero.replaceWith(nextHero);
    chartCard.replaceWith(nextChart);
    glideCharts(nextChart, drawn, PREVIEW_GLIDE_MS);
    hero = nextHero;
    chartCard = nextChart;
    // The Goal card follows too (the gauge, the figures, the deposit needed), but its slider stays: only the parts around
    // it are swapped, so the slider being dragged is not rebuilt under the pointer.
    const nextGoal = renderGoalCard(previewed, actions, livePreview);
    for (const part of [".card__head", ".goal__body"]) {
      const current = goalCard.querySelector(part);
      const next = nextGoal.querySelector(part);
      if (current !== null && next !== null) current.replaceWith(next);
    }
  };
  const livePreview = (patch: PlanPreview): void => {
    pending = patch;
    if (frame !== 0) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (pending) drawPreview(pending);
      pending = null;
    });
  };

  const goalCard = renderGoalCard(active, actions, livePreview);

  const shell = h(
    "div",
    { class: "shell", "data-plan": String(state.activeId) },
    readout,
    renderAppBar(tabs, state.activeId, canAddPlan(state), active, isDark, actions),
    h(
      "main",
      { class: planSwitched ? "canvas canvas--switched" : "canvas" },
      state.notice ? renderNotice(noticeText(state.notice), actions) : null,
      origin === "shared" ? renderSharedBanner(canAddPlan(state), actions) : null,
      hero,
      // The chart, the comparison, the inputs and the goal. On a wide screen the Plan card is a column beside the chart
      // that stays in view while the page scrolls, so the chart can be watched while it is changed.
      h(
        "div",
        { class: views.length > 1 ? "workspace workspace--compare" : "workspace" },
        chartCard,
        views.length > 1 ? renderCompareCard(views, active, state, actions) : null,
        renderInputsCard(active, state, actions, livePreview),
        goalCard,
      ),
      renderEventsSection(active, timeline, state, actions),
      h(
        "footer",
        { class: "footer" },
        h("p", { class: "footer__privacy" }, lockIcon(), messages.app.privacyNote),
        h("p", { class: "disclaimer" }, messages.app.disclaimer),
      ),
    ),
  );

  root.replaceChildren(shell);
  // Another plan fades in (see `.canvas--switched`); the same plan, changed, has its chart glide to the new shape.
  if (!planSwitched) glideCharts(root, drawnBefore);
  // The first drawing of the page reveals the chart; later ones only pop the badges of events that are new.
  if (drawnBefore.length === 0) introduceChart(root);
  else if (!planSwitched) popNewBadges(root, badgesBefore);
  // The headline counts to its new amount (not while a slider drags: the preview has already shown it).
  countHeadline(root, headlineBefore);
  document.title = active.planName === null ? messages.app.pageTitle : messages.app.pageTitleNamed(active.planName);

  const find = (key: string | null | undefined): HTMLElement | null =>
    key ? root.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`) : null;
  (find(focusKey) ?? find(fallbackKey))?.focus();
  announce(state.notice ? noticeText(state.notice) : "");
}
