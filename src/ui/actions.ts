import type { DepositChangeDraft, OneTimeDepositDraft, PlanFields, WithdrawalDraft } from "../state/plan-document";
import type { EventKey } from "../state/timeline";
import type { HorizonYears, Metric } from "../state/types";

/** Everything the UI can ask the app to do. Wired to the store in main.ts. */
export interface Actions {
  selectScenario(id: string): void;
  selectMetric(metric: Metric): void;
  setHorizon(horizon: HorizonYears): void;
  selectEvent(key: EventKey | null): void;
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
  copyShareLink(): Promise<boolean>;
}
