import type { Ore } from "../core/types";
import { addMonths, yearsToMonths } from "../core/year-month";
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
 * A savings goal: an amount to have by a month. Like everything the user enters, the amount is in nominal kronor.
 * The plan has at most one goal.
 */
export interface GoalPlan {
  readonly amount: Ore;
  readonly date: YearMonth;
}

/**
 * Everything that defines a plan, in a shape that can be saved and shared. Dates are real
 * year-months (not offsets), so changing the start date never moves an event.
 */
export interface PlanDocument {
  /** 4 since the plan got a name. Version 1, 2 and 3 plans are upgraded when read. */
  readonly version: 4;
  /** A name the user gave the plan, so it can be referred to, or null. */
  readonly name: string | null;
  readonly start: YearMonth;
  readonly startAmount: Ore;
  readonly monthlyDeposit: Ore;
  /** Expected yearly return in percent, e.g. 7 for 7 %. */
  readonly annualReturnPct: number;
  /** How many years the plan looks ahead, from the start month. */
  readonly horizonYears: number;
  /** Expected yearly inflation in percent, used for the inflation adjusted view. */
  readonly inflationPct: number;
  readonly withdrawals: readonly WithdrawalEvent[];
  readonly depositChanges: readonly DepositChangeEvent[];
  readonly oneTimeDeposits: readonly OneTimeDepositEvent[];
  /** The savings goal, or null when there is none. */
  readonly goal: GoalPlan | null;
}

/** The plan's single-value fields, edited in the Plan card. */
export type PlanFields = Omit<PlanDocument, "version" | "name" | "withdrawals" | "depositChanges" | "oneTimeDeposits" | "goal">;

/*
 * Input limits. Chosen so that even the largest allowed plan (maximum start amount, deposit and one-time deposits
 * at the maximum return for the longest horizon, 40 years) stays below Number.MAX_SAFE_INTEGER öre, so money stays
 * exact. The maximum return was lowered from 50 % to 30 % to allow 40 years: 1.5^40 alone would not fit.
 */
export const PLAN_LIMITS = {
  maxStartAmount: 10_000_000_000, // 100 000 000 kr
  maxMonthlyDeposit: 1_000_000_000, // 10 000 000 kr
  minReturnPct: -100,
  maxReturnPct: 30,
  minStartYear: 2000,
  maxStartYear: 2100,
  minHorizonYears: 1,
  maxHorizonYears: 40,
  // Events can be dated up to the end of the longest horizon (40 years) of a plan that starts in the last year.
  maxEventYear: 2140,
  minInflationPct: -5,
  maxInflationPct: 20,
  maxWithdrawals: 50,
  maxDepositChanges: 50,
  // Smaller than the monthly deposit: a one-time deposit in month 0 compounds for the whole horizon, and ten of
  // them at 5 000 000 kr still fit below Number.MAX_SAFE_INTEGER next to the largest start amount and deposit.
  maxOneTimeDeposits: 10,
  maxOneTimeDepositAmount: 500_000_000, // 5 000 000 kr
  maxGoalAmount: 10_000_000_000, // 100 000 000 kr, like the start amount
  maxLabelLength: 40,
  maxNameLength: 40,
  /** How many plans of their own a person can have side by side (the tabs and the comparison stay readable). */
  maxPlans: 5,
} as const;

const DEFAULT_RETURN_PCT = 7;
/** The horizon of a new plan, and of a version 1 plan, which had no horizon of its own (the page showed 30). */
export const DEFAULT_HORIZON_YEARS = 30;
/** The Riksbank's inflation target. */
export const DEFAULT_INFLATION_PCT = 2;

/** A worked example for first-time visitors, starting this month, with a car purchase five years in. */
export function createExamplePlan(today: YearMonth, carLabel: string = "New car"): PlanDocument {
  return {
    version: 4,
    name: null,
    start: today,
    startAmount: 5_000_000,
    monthlyDeposit: 300_000,
    annualReturnPct: DEFAULT_RETURN_PCT,
    horizonYears: DEFAULT_HORIZON_YEARS,
    inflationPct: DEFAULT_INFLATION_PCT,
    withdrawals: [{ id: 1, date: addMonths(today, yearsToMonths(5)), amount: 15_000_000, label: carLabel }],
    depositChanges: [],
    oneTimeDeposits: [],
    goal: null,
  };
}

/** An empty plan: nothing saved yet, with a typical return so it works as soon as an amount is typed. */
export function createBlankPlan(today: YearMonth): PlanDocument {
  return {
    version: 4,
    name: null,
    start: today,
    startAmount: 0,
    monthlyDeposit: 0,
    annualReturnPct: DEFAULT_RETURN_PCT,
    horizonYears: DEFAULT_HORIZON_YEARS,
    inflationPct: DEFAULT_INFLATION_PCT,
    withdrawals: [],
    depositChanges: [],
    oneTimeDeposits: [],
    goal: null,
  };
}
