import type { YearMonth } from "./year-month";

/*
 * Input and output types for the calculation engine. They describe money and
 * time only, with nothing about how results are displayed. src/state/ maps the
 * output to the UI's ScenarioView.
 */

/** Money in minor units (öre). Always an integer. */
export type Ore = number;

export interface WithdrawalInput {
  /** Months after the plan start (0 = the start month). */
  readonly month: number;
  readonly amount: Ore;
  readonly label: string;
}

/**
 * A change to the monthly deposit, from `startMonth` through `endMonth` (both included, months after the
 * plan start). With no end it lasts until a later change replaces it. An amount of 0 pauses saving.
 */
export interface DepositChangeInput {
  readonly startMonth: number;
  readonly endMonth: number | null;
  readonly amount: Ore;
  readonly label: string;
}

export interface PlanInput {
  readonly start: YearMonth;
  readonly startAmount: Ore;
  readonly monthlyDeposit: Ore;
  /** Expected yearly return in percent, e.g. 7 for 7 %. */
  readonly annualReturnPct: number;
  readonly withdrawals: readonly WithdrawalInput[];
  readonly depositChanges: readonly DepositChangeInput[];
  /** How many months to project. */
  readonly months: number;
}

/** Balance and running totals at the end of a month. */
export interface ProjectionPoint {
  readonly month: number;
  readonly balance: Ore;
  readonly deposited: Ore;
  readonly withdrawn: Ore;
  readonly growth: Ore;
}

export interface GoalInput {
  readonly target: Ore;
  /** Months after the plan start when the target should be reached. */
  readonly month: number;
}

/** What happened to one planned withdrawal. `shortfall` is the part the balance couldn't cover. */
export interface AppliedWithdrawal {
  /** Position of the withdrawal in `PlanInput.withdrawals`. */
  readonly index: number;
  readonly month: number;
  readonly requested: Ore;
  readonly applied: Ore;
  readonly shortfall: Ore;
}

export interface Projection {
  /** One point per month, from month 0 to `PlanInput.months`. */
  readonly points: readonly ProjectionPoint[];
  /** Planned withdrawals within the projection, in the order they were applied. */
  readonly withdrawals: readonly AppliedWithdrawal[];
}
