import { addMonths } from "../core/year-month";
import { PLAN_LIMITS } from "../state/plan-document";
import type { GoalSummary, ScenarioView } from "../state/types";
import type { Actions } from "./actions";
import { renderButton } from "./components";
import { h, s } from "./dom";
import { formatMoney, formatMoneyCompact, formatYearMonth } from "./format";
import { horizonEndOf, openGoalDialog } from "./goal-dialog";
import { requiredDepositText } from "./goal-text";
import { monthLabel } from "./view-helpers";
import { messages } from "./i18n";

/* The gauge is an arc whose length is drawn as 100 units, so a share of 62 % is a dash of 62. */
const GAUGE_ARC = "M22 104 A78 78 0 0 1 178 104";
const GAUGE_DASH_GAP = 200; // longer than the arc, so the rest of the arc is empty
const GAUGE_TIP = 3.5; // length of the rounded tip at the end of the filled part
const GAUGE_TIP_GAP = 4.5; // room left for the tip so it doesn't overlap the fill

function renderGauge(goal: GoalSummary): HTMLElement {
  const pct = goal.percentReached;
  const arc = { d: GAUGE_ARC, fill: "none", "stroke-width": 22, pathLength: 100 };
  return h(
    "div",
    { class: "gauge" },
    s(
      "svg",
      { viewBox: "0 0 200 116", "aria-hidden": "true" },
      s("path", { ...arc, class: "gauge__track" }),
      s("path", { ...arc, class: "gauge__value", "stroke-dasharray": `${Math.max(0, pct - GAUGE_TIP_GAP)} ${GAUGE_DASH_GAP}` }),
      s("path", {
        ...arc,
        class: "gauge__tip",
        "stroke-dasharray": `${Math.min(pct, GAUGE_TIP)} ${GAUGE_DASH_GAP}`,
        "stroke-dashoffset": -Math.max(0, pct - GAUGE_TIP),
      }),
    ),
    h(
      "div",
      { class: "gauge__label" },
      h("div", { class: "gauge__number" }, h("strong", {}, String(pct)), h("span", {}, "%")),
      h("span", { class: "card__meta" }, messages.goalCard.ofTarget(formatMoney(goal.target))),
    ),
  );
}

function stat(label: string, value: string): HTMLElement {
  return h("div", { class: "stats__row" }, h("dt", {}, label), h("dd", {}, value));
}

function editGoal(scenario: ScenarioView, goal: GoalSummary, actions: Actions): void {
  openGoalDialog({
    start: scenario.start,
    horizonEnd: horizonEndOf(scenario.start, scenario.horizonMonths),
    initial: { amount: goal.target, date: goal.date },
    onSave: (saved) => actions.setGoal(saved),
  });
}

/** What to say about a goal date the calculator can't project. */
function outsideMessage(goal: GoalSummary): string {
  return goal.status === "before-start"
    ? messages.goalCard.beforeStart
    : messages.goalCard.afterProjection(PLAN_LIMITS.maxHorizonYears);
}

function renderGoalDetails(scenario: ScenarioView, goal: GoalSummary): HTMLElement[] {
  if (goal.status !== "ok") return [h("p", { class: "card__meta goal__message" }, outsideMessage(goal))];

  const deposit = requiredDepositText(goal.requiredMonthly, scenario.monthlyDeposit);
  const reached =
    goal.reachedMonth === null
      ? messages.goalCard.notWithin(PLAN_LIMITS.maxHorizonYears)
      : formatYearMonth(addMonths(scenario.start, goal.reachedMonth));
  return [
    renderGauge(goal),
    h(
      "dl",
      { class: "stats" },
      stat(messages.goalCard.projected, formatMoney(goal.balanceAtGoal)),
      stat(messages.goalCard.depositNeeded, deposit.value),
      stat(messages.goalCard.reached, reached),
      stat(messages.goalCard.adjusted, formatMoney(goal.targetInflationAdjusted)),
    ),
    h("p", { class: "card__meta goal__message" }, deposit.note),
    goal.withinHorizon ? null : h("p", { class: "card__meta goal__message" }, messages.goalCard.afterEndYear),
  ].filter((element): element is HTMLElement => element !== null);
}

/** The goal card: a prompt to set a goal, or how the plan stands against it with buttons to edit or remove it. */
export function renderGoalCard(scenario: ScenarioView, actions: Actions): HTMLElement {
  const { goal } = scenario;

  if (goal === null) {
    const setGoalButton = renderButton({
      label: messages.goalCard.setButton,
      onClick: () =>
        openGoalDialog({
          start: scenario.start,
          horizonEnd: horizonEndOf(scenario.start, scenario.horizonMonths),
          onSave: (saved) => actions.setGoal(saved),
        }),
    });
    setGoalButton.setAttribute("data-key", "goal-set");
    setGoalButton.setAttribute("data-focus-next", "goal-edit");
    return h(
      "section",
      { class: "card", "aria-labelledby": "goal-heading", role: "group" },
      h("div", { class: "card__head" }, h("h2", { id: "goal-heading" }, messages.goalCard.heading)),
      h("p", { class: "card__meta goal__message" }, messages.goalCard.prompt),
      setGoalButton,
    );
  }

  const chip =
    goal.status !== "ok" ? null : h("span", { class: "status" }, goal.shortfall === 0 ? messages.goalCard.onTrack : messages.goalCard.short(formatMoneyCompact(goal.shortfall)));
  return h(
    "section",
    { class: "card", "aria-labelledby": "goal-heading", role: "group" },
    h(
      "div",
      { class: "card__head" },
      h("h2", { id: "goal-heading" }, messages.goalCard.title(monthLabel(scenario, goal.month))),
      h(
        "div",
        { class: "card__head-side" },
        chip,
        h(
          "button",
          { class: "btn-text", type: "button", "data-key": "goal-edit", onclick: () => editGoal(scenario, goal, actions) },
          messages.common.edit,
        ),
        h(
          "button",
          {
            class: "btn-text btn-text--danger",
            type: "button",
            "data-key": "goal-remove",
            "data-focus-next": "goal-set",
            "aria-label": messages.goalCard.removeAria,
            onclick: () => actions.clearGoal(),
          },
          messages.common.remove,
        ),
      ),
    ),
    ...renderGoalDetails(scenario, goal),
  );
}
