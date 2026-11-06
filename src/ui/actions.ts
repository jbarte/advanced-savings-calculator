import type { DepositChangeDraft, GoalPlan, OneTimeDepositDraft, PlanFields, WithdrawalDraft } from "../state/plan-document";
import type { Language } from "../state/language";
import type { EventKey } from "../state/timeline";
import type { Metric } from "../state/types";

/** Everything the UI can ask the app to do. Wired to the store in main.ts. */
export interface Actions {
  /** Opens another of the plans. */
  selectPlan(id: number): void;
  /** Adds an empty plan and opens it. */
  addBlankPlan(): void;
  /** Adds a copy of the open plan and opens it. */
  copyPlan(): void;
  /** Adds a copy of the open plan without one event ("what if I skipped this?") and opens it. */
  copyWithoutEvent(key: EventKey): void;
  deletePlan(id: number): void;
  selectMetric(metric: Metric): void;
  /** Selects an event (or none). `month` moves the chart cursor to the event. */
  selectEvent(key: EventKey | null, month?: number): void;
  /** Remembers where the chart cursor is, after a key press. */
  setChartMonth(month: number): void;
  setInflationAdjusted(on: boolean): void;
  updatePlan(patch: Partial<PlanFields>): void;
  /** Gives the plan a name, or removes it with empty text. */
  renamePlan(name: string): void;
  startFromScratch(): void;
  /** Forgets every saved plan and shows the example again. */
  startOver(): void;
  addWithdrawal(draft: WithdrawalDraft): void;
  updateWithdrawal(id: number, draft: WithdrawalDraft): void;
  removeWithdrawal(id: number): void;
  addDepositChange(draft: DepositChangeDraft): void;
  updateDepositChange(id: number, draft: DepositChangeDraft): void;
  removeDepositChange(id: number): void;
  setGoal(goal: GoalPlan): void;
  clearGoal(): void;
  addOneTimeDeposit(draft: OneTimeDepositDraft): void;
  updateOneTimeDeposit(id: number, draft: OneTimeDepositDraft): void;
  removeOneTimeDeposit(id: number): void;
  dismissNotice(): void;
  toggleTheme(): void;
  /** Switches the interface language. It is saved in this browser and the page reloads in the new language. */
  setLanguage(language: Language): void;
  /** The link that opens the current plan for anyone. */
  createShareLink(): Promise<string>;
  copyToClipboard(text: string): Promise<boolean>;
  /** Keeps the plan opened from a link as one of the user's own, next to the others. */
  keepSharedPlan(): void;
  /** Drops the plan opened from a link and goes back to the plan that was open before it. */
  leaveSharedPlan(): void;
}
