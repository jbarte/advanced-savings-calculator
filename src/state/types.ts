import type { Ore, ProjectionPoint } from "../core/types";
import type { YearMonth } from "../core/year-month";
import type { PlanDocument } from "./plan-document";
import type { EventKey } from "./timeline";

export type { Ore, ProjectionPoint };

/** Horizons offered as one-click buttons. Any whole number of years within the limits can be typed as an end year. */
export const HORIZON_PRESETS = [10, 20, 30] as const;

export const METRICS = ["balance", "deposited", "growth", "withdrawn"] as const;
export type Metric = (typeof METRICS)[number];

export type ThemePreference = "system" | "light" | "dark";

/**
 * Where an event falls: within the chosen horizon, after it, or before the plan starts (such an event is
 * listed but left out of the projection).
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
  /**
   * How much the withdrawal changes the balance at the end of the horizon (negative): the amount withdrawn plus
   * the growth it would have earned. 0 unless `planned`.
   */
  readonly effect: Ore;
  /** The growth part of the effect: what the withdrawn money would have earned. 0 unless `planned`. */
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
  /** How much the change moves the balance at the end of the horizon: negative for a pause or a cut. */
  readonly effect: Ore;
}

/** A one-time deposit as the UI shows it. `month` is after the plan start, and can be negative. */
export interface PlannedOneTimeDeposit {
  readonly id: number;
  readonly label: string;
  readonly date: YearMonth;
  readonly month: number;
  readonly amount: Ore;
  readonly status: EventStatus;
  /** How much the deposit adds to the balance at the end of the horizon: the amount plus its growth. */
  readonly effect: Ore;
}

export interface GoalSummary {
  readonly target: Ore;
  readonly month: number;
  readonly balanceAtGoal: Ore;
  readonly percentReached: number;
  readonly shortfall: Ore;
  readonly requiredMonthly: Ore;
  /** First month the balance reaches the target, or null if it never does within the projection. */
  readonly reachedMonth: number | null;
}

/** Everything the UI needs to render one scenario, built from the engine's output by `buildScenarioView`. */
export interface ScenarioView {
  readonly id: string;
  readonly name: string;
  readonly start: YearMonth;
  readonly startAmount: Ore;
  readonly monthlyDeposit: Ore;
  readonly annualReturnPct: number;
  /** The plan's expected yearly inflation in percent, used for the inflation adjusted view. */
  readonly inflationPct: number;
  readonly withdrawals: readonly PlannedWithdrawal[];
  readonly depositChanges: readonly PlannedDepositChange[];
  readonly oneTimeDeposits: readonly PlannedOneTimeDeposit[];
  /** How much all events together change the balance at the end of the horizon, compared with none of them. */
  readonly totalEffect: Ore;
  /** The horizon in months: where effects are measured and where the chart ends. `points` reach further. */
  readonly horizonMonths: number;
  /**
   * True when `points`, the effects and the total are inflation adjusted (see `applyInflationAdjustment`). What the user
   * entered (amounts of events, start amount, deposit) is always in nominal kronor.
   */
  readonly inflationAdjusted: boolean;
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
  readonly metric: Metric;
  /** The event highlighted in the list and on the chart, or null. */
  readonly selectedEvent: EventKey | null;
  /** Show results inflation adjusted (what they would buy at the start). A view setting: not saved, off at each visit. */
  readonly inflationAdjusted: boolean;
  /**
   * The month the chart cursor rests on, so it keeps its place when the page is drawn again. Set by the keyboard
   * and by selecting an event; null means the last month. Pointer moves don't change it.
   */
  readonly chartMonth: number | null;
  readonly theme: ThemePreference;
  /** Why the last change was not applied, shown until the next change or until dismissed. */
  readonly notice: string | null;
}
