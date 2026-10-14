import type { HorizonYears, Metric } from "../state/types";

/** Everything the UI can ask the app to do. Wired to the store in main.ts. */
export interface Actions {
  selectScenario(id: string): void;
  selectMetric(metric: Metric): void;
  setHorizon(horizon: HorizonYears): void;
  toggleTheme(): void;
  copyShareLink(): Promise<boolean>;
}
