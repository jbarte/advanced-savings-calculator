import type { PlanDocument } from "./plan-document";
import type { AppState, PlanOrigin } from "./types";

/** An app state with one plan open, for tests. Anything else can be overridden. */
export function createTestState(plan: PlanDocument, origin: PlanOrigin = "own", overrides: Partial<AppState> = {}): AppState {
  return {
    plans: [{ id: 1, plan, origin }],
    activeId: 1,
    returnId: null,
    storage: "idle",
    metric: "balance",
    selectedEvent: null,
    inflationAdjusted: false,
    chartMonth: null,
    theme: "system",
    notice: null,
    ...overrides,
  };
}
