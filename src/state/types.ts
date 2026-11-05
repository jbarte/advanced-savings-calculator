import type { DepositLevel } from "../core/deposit-schedule";
import type { Ore, ProjectionPoint } from "../core/types";
import type { YearMonth } from "../core/year-month";
import type { PlanDocument } from "./plan-document";
import type { EventKey } from "./timeline";

export type { DepositLevel, Ore, ProjectionPoint };

export const HORIZONS = [10, 20, 30] as const;
export type HorizonYears = (typeof HORIZONS)[number];

export const METRICS = ["balance", "deposited", "growth", "withdrawn"] as const;
export type Metric = (typeof METRICS)[number];

export type ThemePreference = "system" | "light" | "dark";

/**
 * Where a withdrawal falls: within the chosen horizon, after it, or before the plan starts (such a
 * withdrawal is listed but left out of the projection).
 */
export type EventStatus = "planned" | "after-horizon" | "before-start";

export interface PlannedWithdrawal {
  readonly id: number;
  readonly date: YearMonth;
  /** Months after the plan start. Negative when the withdrawal is before the start. */
  readonly month: number;
  /** The amount asked for. */
  readonly amount: Ore;
  /** The part the balance could cover. */
  readonly applied: Ore;
  /** The part it could not cover. */
  readonly shortfall: Ore;
  readonly label: string;
  readonly status: EventStatus;
  /** Growth the withdrawn money would have earned by the end of the horizon. 0 unless `planned`. */
  readonly lostGrowth: Ore;
}

/** A deposit change as the UI shows it. Months are after the plan start, and can be negative. */
export interface PlannedDepositChange {
  readonly id: number;
  readonly label: string;
  readonly startDate: YearMonth;
  readonly endDate: YearMonth | null;
  readonly startMonth: number;
  readonly endMonth: number | null;
  readonly amount: Ore;
  readonly status: EventStatus;
}

/** A one-time deposit as the UI shows it. `month` is after the plan start, and can be negative. */
export interface PlannedOneTimeDeposit {
  readonly id: number;
  readonly label: string;
  readonly date: YearMonth;
  readonly month: number;
  readonly amount: Ore;
  readonly status: EventStatus;
}

export interface GoalSummary {
  readonly target: Ore;
  readonly month: number;
  readonly balanceAtGoal: Ore;
  readonly percentReached: number;
  readonly shortfall: Ore;
  readonly requiredMonthly: Ore;
  /** First month the balance reaches the target, or null if never within 30 years. */
  readonly reachedMonth: number | null;
}

/**
 * Everything the UI needs to render one scenario. Today this comes from static
 * sample data. Later, src/state/view-model.ts will build it from the engine's
 * output (the types in src/core/types.ts).
 */
export interface ScenarioView {
  readonly id: string;
  readonly name: string;
  readonly start: YearMonth;
  readonly startAmount: Ore;
  readonly monthlyDeposit: Ore;
  readonly annualReturnPct: number;
  readonly withdrawals: readonly PlannedWithdrawal[];
  readonly depositChanges: readonly PlannedDepositChange[];
  readonly oneTimeDeposits: readonly PlannedOneTimeDeposit[];
  /** The months where the monthly deposit changes, with the new amount. */
  readonly depositLevels: readonly DepositLevel[];
  /** Null until the user has set a goal. */
  readonly goal: GoalSummary | null;
  readonly points: readonly ProjectionPoint[];
}

/** Whether the plan is kept in this browser: not yet (the example), saved, or blocked by the browser. */
export type StorageStatus = "idle" | "saved" | "blocked";

/**
 * Whether the plan is the built-in example, one the user has started to fill in, or a plan opened from a share
 * link. A shared plan is a copy: it is never saved until the user chooses to keep it.
 */
export type PlanOrigin = "example" | "own" | "shared";

export interface AppState {
  readonly scenarioId: string;
  readonly plan: PlanDocument;
  readonly planOrigin: PlanOrigin;
  readonly storage: StorageStatus;
  readonly horizon: HorizonYears;
  readonly metric: Metric;
  /** The event highlighted in the list (and later on the chart), or null. */
  readonly selectedEvent: EventKey | null;
  readonly theme: ThemePreference;
  /** Why the last change was not applied, shown until the next change or until dismissed. */
  readonly notice: string | null;
}
