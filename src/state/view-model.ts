import { depositLevelChanges } from "../core/deposit-schedule";
import { lostGrowth } from "../core/lost-growth";
import { project } from "../core/project";
import type { DepositChangeInput, PlanInput, WithdrawalInput } from "../core/types";
import { monthsBetween, yearsToMonths } from "../core/year-month";
import type { PlanDocument } from "./plan-document";
import { HORIZONS } from "./types";
import type { EventStatus, PlannedDepositChange, PlannedWithdrawal, ScenarioView } from "./types";

/** The id of the single plan shown today. Scenario comparison will add more. */
export const PLAN_SCENARIO_ID = "plan";

/** Always project as far as the longest horizon the UI can show. */
export const PROJECTION_MONTHS = yearsToMonths(Math.max(...HORIZONS));

interface MappedPlan {
  readonly input: PlanInput;
  /** The id of the plan's withdrawal behind each entry of `input.withdrawals`. */
  readonly ids: readonly number[];
}

/** A change that ends before the plan starts never applies, so it is left out of the engine input. */
function endsBeforePlanStart(endMonth: number | null): boolean {
  return endMonth !== null && endMonth < 1;
}

function mapDepositChanges(plan: PlanDocument): DepositChangeInput[] {
  return plan.depositChanges.flatMap((change) => {
    const startMonth = monthsBetween(plan.start, change.startDate);
    const endMonth = change.endDate === null ? null : monthsBetween(plan.start, change.endDate);
    if (endsBeforePlanStart(endMonth)) return [];
    return [{ startMonth, endMonth, amount: change.amount, label: change.label }];
  });
}

/** Dates become months after the start. A withdrawal before the start can't be projected, so it is left out. */
function mapPlan(plan: PlanDocument, months: number): MappedPlan {
  const included = plan.withdrawals.flatMap((withdrawal) => {
    const month = monthsBetween(plan.start, withdrawal.date);
    if (month < 0) return [];
    const input: WithdrawalInput = { month, amount: withdrawal.amount, label: withdrawal.label };
    return [{ id: withdrawal.id, input }];
  });
  return {
    input: {
      start: plan.start,
      startAmount: plan.startAmount,
      monthlyDeposit: plan.monthlyDeposit,
      annualReturnPct: plan.annualReturnPct,
      withdrawals: included.map((entry) => entry.input),
      depositChanges: mapDepositChanges(plan),
      months,
    },
    ids: included.map((entry) => entry.id),
  };
}

export function toPlanInput(plan: PlanDocument, months: number): PlanInput {
  return mapPlan(plan, months).input;
}

function statusOf(month: number, horizonMonths: number): EventStatus {
  if (month < 0) return "before-start";
  return month > horizonMonths ? "after-horizon" : "planned";
}

/** Runs the engine and shapes the result for the UI. `horizonMonths` is how far lost growth is measured. */
export function buildScenarioView(plan: PlanDocument, name: string, horizonMonths: number): ScenarioView {
  const { input, ids } = mapPlan(plan, PROJECTION_MONTHS);
  const { points, withdrawals: applied } = project(input);

  const withdrawals: PlannedWithdrawal[] = plan.withdrawals
    .map((withdrawal) => {
      const month = monthsBetween(plan.start, withdrawal.date);
      const status = statusOf(month, horizonMonths);
      const engineIndex = ids.indexOf(withdrawal.id);
      const result = applied.find((entry) => entry.index === engineIndex);
      return {
        id: withdrawal.id,
        date: withdrawal.date,
        month,
        amount: withdrawal.amount,
        applied: result?.applied ?? 0,
        shortfall: result?.shortfall ?? 0,
        label: withdrawal.label,
        status,
        lostGrowth: status === "planned" && engineIndex >= 0 ? lostGrowth(input, engineIndex, horizonMonths) : 0,
      };
    })
    .sort((a, b) => a.month - b.month || a.id - b.id);

  const depositChanges: PlannedDepositChange[] = plan.depositChanges
    .map((change) => {
      const startMonth = monthsBetween(plan.start, change.startDate);
      const endMonth = change.endDate === null ? null : monthsBetween(plan.start, change.endDate);
      const status: EventStatus = endsBeforePlanStart(endMonth) ? "before-start" : startMonth > horizonMonths ? "after-horizon" : "planned";
      return { id: change.id, label: change.label, startDate: change.startDate, endDate: change.endDate, startMonth, endMonth, amount: change.amount, status };
    })
    .sort((a, b) => a.startMonth - b.startMonth || a.id - b.id);

  return {
    id: PLAN_SCENARIO_ID,
    name,
    start: plan.start,
    startAmount: plan.startAmount,
    monthlyDeposit: plan.monthlyDeposit,
    annualReturnPct: plan.annualReturnPct,
    withdrawals,
    depositChanges,
    depositLevels: depositLevelChanges(plan.monthlyDeposit, input.depositChanges, PROJECTION_MONTHS),
    goal: null,
    points,
  };
}
