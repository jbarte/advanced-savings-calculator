import type { LoadResult } from "./plan-storage";
import type { PlanDocument } from "./plan-document";
import type { PlanOrigin, StorageStatus } from "./types";

export interface StartupPlan {
  readonly plan: PlanDocument;
  readonly planOrigin: PlanOrigin;
  readonly storage: StorageStatus;
  readonly notice: string | null;
}

export const STORAGE_BLOCKED_NOTICE = "Your browser is blocking storage, so your changes will not be kept after you close this page.";

/** Decides what to show when the page opens, from what was found in storage. */
export function resolveStartupPlan(loaded: LoadResult, example: PlanDocument): StartupPlan {
  switch (loaded.kind) {
    case "loaded":
      return { plan: loaded.plan, planOrigin: "own", storage: "saved", notice: null };
    case "none":
      return { plan: example, planOrigin: "example", storage: "idle", notice: null };
    case "invalid":
      return {
        plan: example,
        planOrigin: "example",
        storage: "idle",
        notice: `Your saved plan could not be read, so the example plan is shown. ${loaded.reason}. Your next change replaces the saved plan.`,
      };
    case "unavailable":
      return {
        plan: example,
        planOrigin: "example",
        storage: "blocked",
        notice: STORAGE_BLOCKED_NOTICE,
      };
  }
}
