import { eventEffect, lostGrowthOf, totalEffect } from "../core/event-effect";
import type { EventRef } from "../core/event-effect";
import { project } from "../core/project";
import { inflationAdjustedPoints, toInflationAdjusted } from "../core/inflation-adjusted";
import type { DepositChangeInput, OneTimeDepositInput, Ore, PlanInput, WithdrawalInput } from "../core/types";
import { monthsBetween, yearsToMonths } from "../core/year-month";
import { PLAN_LIMITS } from "./plan-document";
import type { PlanDocument } from "./plan-document";
import type { EventStatus, PlannedDepositChange, PlannedOneTimeDeposit, PlannedWithdrawal, ScenarioView } from "./types";

/** The id of the single plan shown today. Scenario comparison will add more. */
export const PLAN_SCENARIO_ID = "plan";

/** Always project as far as the longest allowed horizon, so changing the horizon never needs a new projection. */
export const PROJECTION_MONTHS = yearsToMonths(PLAN_LIMITS.maxHorizonYears);

/** The engine input, plus the plan id behind each entry of each event list (events left out have no entry). */
interface MappedPlan {
  readonly input: PlanInput;
  readonly ids: Readonly<Record<EventRef["list"], readonly number[]>>;
}

/** A change that ends before the plan starts never applies, so it is left out of the engine input. */
function endsBeforePlanStart(endMonth: number | null): boolean {
  return endMonth !== null && endMonth < 1;
}

interface Included<T> {
  readonly id: number;
  readonly input: T;
}

function mapWithdrawals(plan: PlanDocument): Included<WithdrawalInput>[] {
  return plan.withdrawals.flatMap((withdrawal) => {
    const month = monthsBetween(plan.start, withdrawal.date);
    return month < 0 ? [] : [{ id: withdrawal.id, input: { month, amount: withdrawal.amount, label: withdrawal.label } }];
  });
}

function mapDepositChanges(plan: PlanDocument): Included<DepositChangeInput>[] {
  return plan.depositChanges.flatMap((change) => {
    const startMonth = monthsBetween(plan.start, change.startDate);
    const endMonth = change.endDate === null ? null : monthsBetween(plan.start, change.endDate);
    if (endsBeforePlanStart(endMonth)) return [];
    return [{ id: change.id, input: { startMonth, endMonth, amount: change.amount, label: change.label } }];
  });
}

function mapOneTimeDeposits(plan: PlanDocument): Included<OneTimeDepositInput>[] {
  return plan.oneTimeDeposits.flatMap((deposit) => {
    const month = monthsBetween(plan.start, deposit.date);
    return month < 0 ? [] : [{ id: deposit.id, input: { month, amount: deposit.amount, label: deposit.label } }];
  });
}

/** Dates become months after the start. Events before the start can't be projected, so they are left out. */
function mapPlan(plan: PlanDocument, months: number): MappedPlan {
  const withdrawals = mapWithdrawals(plan);
  const depositChanges = mapDepositChanges(plan);
  const oneTimeDeposits = mapOneTimeDeposits(plan);
  return {
    input: {
      start: plan.start,
      startAmount: plan.startAmount,
      monthlyDeposit: plan.monthlyDeposit,
      annualReturnPct: plan.annualReturnPct,
      withdrawals: withdrawals.map((entry) => entry.input),
      depositChanges: depositChanges.map((entry) => entry.input),
      oneTimeDeposits: oneTimeDeposits.map((entry) => entry.input),
      months,
    },
    ids: {
      withdrawals: withdrawals.map((entry) => entry.id),
      depositChanges: depositChanges.map((entry) => entry.id),
      oneTimeDeposits: oneTimeDeposits.map((entry) => entry.id),
    },
  };
}

export function toPlanInput(plan: PlanDocument, months: number): PlanInput {
  return mapPlan(plan, months).input;
}

function statusOf(month: number, horizonMonths: number): EventStatus {
  if (month < 0) return "before-start";
  return month > horizonMonths ? "after-horizon" : "planned";
}

/**
 * Runs the engine and shapes the result for the UI. `horizonMonths` is where the effect of each event is
 * measured: the balance at that month with the event minus the balance without it.
 */
export function buildScenarioView(
  plan: PlanDocument,
  name: string,
  horizonMonths: number = yearsToMonths(plan.horizonYears),
): ScenarioView {
  const { input, ids } = mapPlan(plan, PROJECTION_MONTHS);
  const { points, withdrawals: applied } = project(input);
  const balanceWith = points[horizonMonths]?.balance ?? 0;

  /** The effect of a planned event that reached the engine; 0 for one that was left out or is after the horizon. */
  const effectOf = (list: EventRef["list"], id: number, status: EventStatus): Ore => {
    const index = ids[list].indexOf(id);
    return status === "planned" && index >= 0 ? eventEffect(input, { list, index }, horizonMonths, balanceWith) : 0;
  };

  const withdrawals: PlannedWithdrawal[] = plan.withdrawals
    .map((withdrawal) => {
      const month = monthsBetween(plan.start, withdrawal.date);
      const status = statusOf(month, horizonMonths);
      const engineIndex = ids.withdrawals.indexOf(withdrawal.id);
      const result = applied.find((entry) => entry.index === engineIndex);
      const appliedAmount = result?.applied ?? 0;
      const effect = effectOf("withdrawals", withdrawal.id, status);
      return {
        id: withdrawal.id,
        date: withdrawal.date,
        month,
        amount: withdrawal.amount,
        applied: appliedAmount,
        shortfall: result?.shortfall ?? 0,
        label: withdrawal.label,
        status,
        effect,
        lostGrowth: status === "planned" ? lostGrowthOf(effect, appliedAmount) : 0,
      };
    })
    .sort((a, b) => a.month - b.month || a.id - b.id);

  const depositChanges: PlannedDepositChange[] = plan.depositChanges
    .map((change) => {
      const startMonth = monthsBetween(plan.start, change.startDate);
      const endMonth = change.endDate === null ? null : monthsBetween(plan.start, change.endDate);
      // A change that began before the plan still applies if it hasn't ended, so it counts from month 0.
      const status: EventStatus = endsBeforePlanStart(endMonth) ? "before-start" : statusOf(Math.max(0, startMonth), horizonMonths);
      return {
        id: change.id,
        label: change.label,
        startDate: change.startDate,
        endDate: change.endDate,
        startMonth,
        endMonth,
        amount: change.amount,
        status,
        effect: effectOf("depositChanges", change.id, status),
      };
    })
    .sort((a, b) => a.startMonth - b.startMonth || a.id - b.id);

  const oneTimeDeposits: PlannedOneTimeDeposit[] = plan.oneTimeDeposits
    .map((deposit) => {
      const month = monthsBetween(plan.start, deposit.date);
      const status = statusOf(month, horizonMonths);
      return {
        id: deposit.id,
        label: deposit.label,
        date: deposit.date,
        month,
        amount: deposit.amount,
        status,
        effect: effectOf("oneTimeDeposits", deposit.id, status),
      };
    })
    .sort((a, b) => a.month - b.month || a.id - b.id);

  return {
    id: PLAN_SCENARIO_ID,
    name,
    start: plan.start,
    startAmount: plan.startAmount,
    monthlyDeposit: plan.monthlyDeposit,
    annualReturnPct: plan.annualReturnPct,
    inflationPct: plan.inflationPct,
    withdrawals,
    depositChanges,
    oneTimeDeposits,
    totalEffect: totalEffect(input, horizonMonths, balanceWith),
    horizonMonths,
    inflationAdjusted: false,
    goal: null,
    points,
  };
}

/**
 * `buildScenarioView` with a memory of the last call: when the plan, name and horizon are the same as last time,
 * the same view comes back without running the engine. Selecting an event, switching the theme or dismissing a
 * notice changes none of them, so those re-renders cost nothing. The plan is compared by reference, which is safe
 * because plan changes always make a new plan object.
 */
export function createScenarioViewCache(): (plan: PlanDocument, name: string, horizonMonths: number) => ScenarioView {
  let last: { plan: PlanDocument; name: string; horizonMonths: number; view: ScenarioView } | null = null;
  return (plan, name, horizonMonths) => {
    if (last && last.plan === plan && last.name === name && last.horizonMonths === horizonMonths) return last.view;
    const view = buildScenarioView(plan, name, horizonMonths);
    last = { plan, name, horizonMonths, view };
    return view;
  };
}

/**
 * The view with the results inflation adjusted (divided by the price level of their month): the projection, the effect of each event and the total. Effects are
 * differences of two balances at the same month (the horizon), so they are divided by that month's price level.
 * What the user entered (event amounts, start amount, monthly deposit) and the engine's lost growth stay nominal.
 */
export function applyInflationAdjustment(view: ScenarioView, inflationPct: number): ScenarioView {
  const real = (effect: Ore): Ore => toInflationAdjusted(effect, view.horizonMonths, inflationPct);
  return {
    ...view,
    inflationAdjusted: true,
    points: inflationAdjustedPoints(view.points, inflationPct),
    totalEffect: real(view.totalEffect),
    withdrawals: view.withdrawals.map((event) => ({ ...event, effect: real(event.effect) })),
    depositChanges: view.depositChanges.map((event) => ({ ...event, effect: real(event.effect) })),
    oneTimeDeposits: view.oneTimeDeposits.map((event) => ({ ...event, effect: real(event.effect) })),
  };
}
