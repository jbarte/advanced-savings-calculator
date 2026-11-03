import { project } from "../core/project";
import type { PlanInput } from "../core/types";
import type { PlanDocument } from "./plan-document";
import { HORIZONS } from "./types";
import type { ScenarioView } from "./types";

/** The id of the single plan shown today. Scenario comparison will add more. */
export const PLAN_SCENARIO_ID = "plan";

/** Always project as far as the longest horizon the UI can show. */
export const PROJECTION_MONTHS = Math.max(...HORIZONS) * 12;

export function toPlanInput(plan: PlanDocument, months: number): PlanInput {
  return {
    start: plan.start,
    startAmount: plan.startAmount,
    monthlyDeposit: plan.monthlyDeposit,
    annualReturnPct: plan.annualReturnPct,
    withdrawals: [],
    months,
  };
}

/** Runs the engine and shapes the result for the UI. */
export function buildScenarioView(plan: PlanDocument, name: string): ScenarioView {
  const { points } = project(toPlanInput(plan, PROJECTION_MONTHS));
  return {
    id: PLAN_SCENARIO_ID,
    name,
    start: plan.start,
    startAmount: plan.startAmount,
    monthlyDeposit: plan.monthlyDeposit,
    annualReturnPct: plan.annualReturnPct,
    withdrawals: [],
    goal: null,
    points,
  };
}
