import type { Ore, ProjectionPoint } from "../core/types";
import type { PlanProblem } from "./plan-problem";
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

/**
 * Where the goal date falls: inside the projection, before the plan start, or after the end of the projection (the
 * longest horizon). Only an `ok` goal has numbers.
 */
export type GoalStatus = "ok" | "before-start" | "after-projection";

/** How the plan stands against its goal. The goal amount is nominal; `targetInflationAdjusted` is what it is worth at the start. */
export interface GoalSummary {
  readonly status: GoalStatus;
  readonly target: Ore;
  readonly date: YearMonth;
  /** Months after the plan start. Negative before the start. */
  readonly month: number;
  /** True when the goal date is on or before the end of the plan's horizon, so the chart can draw it. */
  readonly withinHorizon: boolean;
  /** The balance at the goal date. 0 unless `status` is `ok`. */
  readonly balanceAtGoal: Ore;
  /** How much of the goal the balance covers, 0 to 100 (rounded down). */
  readonly percentReached: number;
  /** What is missing at the goal date: 0 when the goal is reached. */
  readonly shortfall: Ore;
  /**
   * The base monthly deposit that reaches the goal with every planned event kept, in whole öre. 0 when no saving is
   * needed, null when the goal can't be reached even with the largest allowed deposit (or the status is not `ok`).
   */
  readonly requiredMonthly: Ore | null;
  /** First month the balance reaches the goal amount, or null if it never does within the projection. */
  readonly reachedMonth: number | null;
  /** The goal amount divided by the price level at the goal date (see `toInflationAdjusted`). */
  readonly targetInflationAdjusted: Ore;
}

/** Everything the UI needs to render one scenario, built from the engine's output by `buildScenarioView`. */
export interface ScenarioView {
  readonly id: string;
  readonly name: string;
  /** The name the user gave the plan, or null. `name` is what is shown: this, or a text for where the plan came from. */
  readonly planName: string | null;
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

/**
 * A message for the user, as data: the UI words it (`noticeText`). A change that was not applied, a saved plan or a
 * link that could not be read, or storage the browser blocks.
 */
export type Notice =
  | { readonly kind: "change-rejected"; readonly problem: PlanProblem }
  | { readonly kind: "saved-plan-unreadable"; readonly problem: PlanProblem }
  | { readonly kind: "link-unreadable"; readonly problem: PlanProblem }
  | { readonly kind: "file-unreadable"; readonly problem: PlanProblem }
  | { readonly kind: "download-failed" }
  | { readonly kind: "storage-blocked" };

/** One plan in the set, with an id that is local to this browser (never shared) and where the plan came from. */
export interface PlanEntry {
  readonly id: number;
  readonly plan: PlanDocument;
  readonly origin: PlanOrigin;
}

/**
 * The plans the user has side by side, and which one is open. At most `PLAN_LIMITS.maxPlans` of them are the
 * user's own (saved, or the untouched example); a plan opened from a share link is one more, never saved.
 */
export interface PlanSet {
  readonly plans: readonly PlanEntry[];
  readonly activeId: number;
  /** The plan to go back to when a shared plan is left, or null when none is open. */
  readonly returnId: number | null;
}

export interface AppState extends PlanSet {
  readonly storage: StorageStatus;
  readonly metric: Metric;
  /** The event highlighted in the list and on the chart, or null. */
  readonly selectedEvent: EventKey | null;
  /** Whether the table of yearly figures under the chart is open. A view setting: not saved, closed at each visit. */
  readonly yearTableOpen: boolean;
  /** Show results inflation adjusted (what they would buy at the start). A view setting: not saved, off at each visit. */
  readonly inflationAdjusted: boolean;
  /**
   * The month the chart cursor rests on, so it keeps its place when the page is drawn again. Set by the keyboard
   * and by selecting an event; null means the last month. Pointer moves don't change it.
   */
  readonly chartMonth: number | null;
  readonly theme: ThemePreference;
  /** Something the user should know (a change not applied, a bad save or link, blocked storage), until dismissed. */
  readonly notice: Notice | null;
}
