import type { Ore, ProjectionPoint } from "../core/types";
import type { YearMonth } from "../core/year-month";

export type { Ore, ProjectionPoint };

export const HORIZONS = [10, 20, 30] as const;
export type HorizonYears = (typeof HORIZONS)[number];

export const METRICS = ["balance", "deposited", "growth", "withdrawn"] as const;
export type Metric = (typeof METRICS)[number];

export type ThemePreference = "system" | "light" | "dark";

export interface PlannedWithdrawal {
  readonly month: number;
  readonly amount: Ore;
  readonly label: string;
  /** Growth the withdrawn money would have earned by the end of each horizon. */
  readonly costByHorizon: Readonly<Record<HorizonYears, Ore>>;
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
  readonly goal: GoalSummary;
  readonly points: readonly ProjectionPoint[];
}

export interface AppState {
  readonly scenarioId: string;
  readonly horizon: HorizonYears;
  readonly metric: Metric;
  readonly theme: ThemePreference;
}
