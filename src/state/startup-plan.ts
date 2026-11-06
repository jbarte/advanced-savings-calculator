import type { PlanDocument } from "./plan-document";
import type { LoadResult } from "./plan-storage";
import type { Notice, PlanEntry, PlanSet, StorageStatus } from "./types";

export interface StartupPlans extends PlanSet {
  readonly storage: StorageStatus;
  readonly notice: Notice | null;
}

export const STORAGE_BLOCKED_NOTICE: Notice = { kind: "storage-blocked" };

function exampleSet(example: PlanDocument): PlanSet {
  return { plans: [{ id: 1, plan: example, origin: "example" }], activeId: 1, returnId: null };
}

/** Decides what to show when the page opens, from what was found in storage. */
export function resolveStartupPlan(loaded: LoadResult, example: PlanDocument): StartupPlans {
  switch (loaded.kind) {
    case "loaded": {
      const plans: PlanEntry[] = loaded.workspace.plans.map(({ id, plan }) => ({ id, plan, origin: "own" }));
      return { plans, activeId: loaded.workspace.activeId, returnId: null, storage: "saved", notice: null };
    }
    case "none":
      return { ...exampleSet(example), storage: "idle", notice: null };
    case "invalid":
      return { ...exampleSet(example), storage: "idle", notice: { kind: "saved-plan-unreadable", problem: loaded.problem } };
    case "unavailable":
      return { ...exampleSet(example), storage: "blocked", notice: STORAGE_BLOCKED_NOTICE };
  }
}
