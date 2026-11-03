import type { Ore } from "../core/types";
import type { YearMonth } from "../core/year-month";

/**
 * Everything that defines a plan, in a shape that can be saved and shared. Dates are real
 * year-months (not offsets), so changing the start date never moves an event.
 */
export interface PlanDocument {
  readonly version: 1;
  readonly start: YearMonth;
  readonly startAmount: Ore;
  readonly monthlyDeposit: Ore;
  /** Expected yearly return in percent, e.g. 7 for 7 %. */
  readonly annualReturnPct: number;
}

/** The editable fields of a plan. */
export type PlanFields = Omit<PlanDocument, "version">;

/*
 * Input limits. Chosen so that even the largest allowed plan (maximum start amount and deposit at the
 * maximum return for 30 years) stays below Number.MAX_SAFE_INTEGER öre, so money stays exact.
 */
export const PLAN_LIMITS = {
  maxStartAmount: 10_000_000_000, // 100 000 000 kr
  maxMonthlyDeposit: 1_000_000_000, // 10 000 000 kr
  minReturnPct: -100,
  maxReturnPct: 50,
  minStartYear: 2000,
  maxStartYear: 2100,
} as const;

const DEFAULT_RETURN_PCT = 7;

/** A worked example for first-time visitors, starting this month. */
export function createExamplePlan(today: YearMonth): PlanDocument {
  return { version: 1, start: today, startAmount: 5_000_000, monthlyDeposit: 300_000, annualReturnPct: DEFAULT_RETURN_PCT };
}

/** An empty plan: nothing saved yet, with a typical return so it works as soon as an amount is typed. */
export function createBlankPlan(today: YearMonth): PlanDocument {
  return { version: 1, start: today, startAmount: 0, monthlyDeposit: 0, annualReturnPct: DEFAULT_RETURN_PCT };
}
