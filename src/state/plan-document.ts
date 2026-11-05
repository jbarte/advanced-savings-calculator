import type { Ore } from "../core/types";
import { addMonths } from "../core/year-month";
import type { YearMonth } from "../core/year-month";

/** A planned one-off withdrawal. `id` is unique within the plan and stays the same when it is edited. */
export interface WithdrawalEvent {
  readonly id: number;
  readonly date: YearMonth;
  readonly amount: Ore;
  readonly label: string;
}

/** A withdrawal before it has an id. */
export type WithdrawalDraft = Omit<WithdrawalEvent, "id">;

/**
 * A change to the monthly deposit, from `startDate` through `endDate` (both included). With no end it lasts
 * until a later change replaces it. An amount of 0 pauses saving. Ids are numbered apart from withdrawals.
 */
export interface DepositChangeEvent {
  readonly id: number;
  readonly startDate: YearMonth;
  readonly endDate: YearMonth | null;
  readonly amount: Ore;
  readonly label: string;
}

/** A deposit change before it has an id. */
export type DepositChangeDraft = Omit<DepositChangeEvent, "id">;

/** A single extra deposit in one month. Ids are numbered apart from the other kinds of event. */
export interface OneTimeDepositEvent {
  readonly id: number;
  readonly date: YearMonth;
  readonly amount: Ore;
  readonly label: string;
}

/** A one-time deposit before it has an id. */
export type OneTimeDepositDraft = Omit<OneTimeDepositEvent, "id">;

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
  readonly withdrawals: readonly WithdrawalEvent[];
  readonly depositChanges: readonly DepositChangeEvent[];
  readonly oneTimeDeposits: readonly OneTimeDepositEvent[];
}

/** The plan's single-value fields, edited in the Plan card. */
export type PlanFields = Omit<PlanDocument, "version" | "withdrawals" | "depositChanges" | "oneTimeDeposits">;

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
  // Events can be dated up to the end of the longest horizon (30 years) of a plan that starts in the last year.
  maxEventYear: 2130,
  maxWithdrawals: 50,
  maxDepositChanges: 50,
  // Smaller than the monthly deposit: a one-time deposit in month 0 compounds for all 30 years, and ten of
  // them at 5 000 000 kr still fit below Number.MAX_SAFE_INTEGER next to the largest start amount and deposit.
  maxOneTimeDeposits: 10,
  maxOneTimeDepositAmount: 500_000_000, // 5 000 000 kr
  maxLabelLength: 40,
} as const;

const DEFAULT_RETURN_PCT = 7;

/** A worked example for first-time visitors, starting this month, with a car purchase five years in. */
export function createExamplePlan(today: YearMonth): PlanDocument {
  return {
    version: 1,
    start: today,
    startAmount: 5_000_000,
    monthlyDeposit: 300_000,
    annualReturnPct: DEFAULT_RETURN_PCT,
    withdrawals: [{ id: 1, date: addMonths(today, 60), amount: 15_000_000, label: "New car" }],
    depositChanges: [],
    oneTimeDeposits: [],
  };
}

/** An empty plan: nothing saved yet, with a typical return so it works as soon as an amount is typed. */
export function createBlankPlan(today: YearMonth): PlanDocument {
  return { version: 1, start: today, startAmount: 0, monthlyDeposit: 0, annualReturnPct: DEFAULT_RETURN_PCT, withdrawals: [], depositChanges: [], oneTimeDeposits: [] };
}
