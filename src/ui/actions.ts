import type { DepositChangeDraft, OneTimeDepositDraft, PlanFields, WithdrawalDraft } from "../state/plan-document";
import type { EventKey } from "../state/timeline";
import type { Metric } from "../state/types";

/** Everything the UI can ask the app to do. Wired to the store in main.ts. */
export interface Actions {
  selectScenario(id: string): void;
  selectMetric(metric: Metric): void;
  /** Selects an event (or none). `month` moves the chart cursor to the event. */
  selectEvent(key: EventKey | null, month?: number): void;
  /** Remembers where the chart cursor is, after a key press. */
  setChartMonth(month: number): void;
  setTodaysMoney(on: boolean): void;
  updatePlan(patch: Partial<PlanFields>): void;
  startFromScratch(): void;
  /** Forgets the saved plan and shows the example again. */
  startOver(): void;
  addWithdrawal(draft: WithdrawalDraft): void;
  updateWithdrawal(id: number, draft: WithdrawalDraft): void;
  removeWithdrawal(id: number): void;
  addDepositChange(draft: DepositChangeDraft): void;
  updateDepositChange(id: number, draft: DepositChangeDraft): void;
  removeDepositChange(id: number): void;
  addOneTimeDeposit(draft: OneTimeDepositDraft): void;
  updateOneTimeDeposit(id: number, draft: OneTimeDepositDraft): void;
  removeOneTimeDeposit(id: number): void;
  dismissNotice(): void;
  toggleTheme(): void;
  /** The link that opens the current plan for anyone. */
  createShareLink(): Promise<string>;
  copyToClipboard(text: string): Promise<boolean>;
  /** Saves the plan opened from a link as the user's own, replacing any saved plan. */
  keepSharedPlan(): void;
  /** Drops the plan opened from a link and goes back to the user's own plan. */
  leaveSharedPlan(): void;
}
