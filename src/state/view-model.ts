import { lostGrowth } from "../core/lost-growth";
import { project } from "../core/project";
import type { PlanInput, WithdrawalInput } from "../core/types";
import { monthsBetween, yearsToMonths } from "../core/year-month";
import type { PlanDocument } from "./plan-document";
import { HORIZONS } from "./types";
import type { PlannedWithdrawal, ScenarioView, WithdrawalStatus } from "./types";

/** The id of the single plan shown today. Scenario comparison will add more. */
export const PLAN_SCENARIO_ID = "plan";

/** Always project as far as the longest horizon the UI can show. */
export const PROJECTION_MONTHS = yearsToMonths(Math.max(...HORIZONS));

interface MappedPlan {
  readonly input: PlanInput;
  /** The id of the plan's withdrawal behind each entry of `input.withdrawals`. */
  readonly ids: readonly number[];
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
      months,
    },
    ids: included.map((entry) => entry.id),
  };
}

export function toPlanInput(plan: PlanDocument, months: number): PlanInput {
  return mapPlan(plan, months).input;
}

function statusOf(month: number, horizonMonths: number): WithdrawalStatus {
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

  return {
    id: PLAN_SCENARIO_ID,
    name,
    start: plan.start,
    startAmount: plan.startAmount,
    monthlyDeposit: plan.monthlyDeposit,
    annualReturnPct: plan.annualReturnPct,
    withdrawals,
    goal: null,
    points,
  };
}
