import { problemOf } from "./plan-problem";
import type { PlanProblem } from "./plan-problem";
import { readPlanText } from "./read-plan";
import { readWorkspaceText, serializeWorkspace, workspaceFromPlan } from "./read-workspace";
import type { SavedWorkspace } from "./read-workspace";
import type { PlanSet } from "./types";

/** The part of `Storage` we use, so tests can pass a fake. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/*
 * Storage on jbarte.github.io is shared by every Pages site of the account, so the keys name the app. The set of plans
 * has its own key. A single plan saved before there could be several (under `PLAN_STORAGE_KEY`, or the earlier, short
 * `LEGACY_PLAN_STORAGE_KEY`) is still read, and both old keys are removed by the next save.
 */
export const PLANS_STORAGE_KEY = "advanced-savings-calculator:plans";
export const PLAN_STORAGE_KEY = "advanced-savings-calculator:plan";
export const LEGACY_PLAN_STORAGE_KEY = "asc-plan";

export type LoadResult =
  | { readonly kind: "none" }
  | { readonly kind: "loaded"; readonly workspace: SavedWorkspace }
  | { readonly kind: "invalid"; readonly problem: PlanProblem }
  | { readonly kind: "unavailable" };

/** Even touching `localStorage` can throw (blocked site data), so it is read inside a try. */
function browserStorage(): StorageLike | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

/**
 * Reads the saved plans. Saved text is untrusted: it goes through the same checks as a form, so a corrupted or
 * hand-edited save can never reach the engine. A bad save is left in place until the next change replaces it.
 */
export function loadSavedPlans(storage: StorageLike | null = browserStorage()): LoadResult {
  if (storage === null) return { kind: "unavailable" };
  let text: string | null;
  let single: string | null;
  try {
    text = storage.getItem(PLANS_STORAGE_KEY);
    single = text === null ? (storage.getItem(PLAN_STORAGE_KEY) ?? storage.getItem(LEGACY_PLAN_STORAGE_KEY)) : null;
  } catch {
    return { kind: "unavailable" };
  }
  if (text === null && single === null) return { kind: "none" };
  try {
    const workspace = text !== null ? readWorkspaceText(text) : workspaceFromPlan(readPlanText(single ?? ""));
    return { kind: "loaded", workspace };
  } catch (error) {
    if (error instanceof RangeError) return { kind: "invalid", problem: problemOf(error) };
    throw error;
  }
}

/** Saves the user's own plans. Returns false when the browser refuses (blocked or full), so the app can say so. */
export function savePlans(set: PlanSet, storage: StorageLike | null = browserStorage()): boolean {
  if (storage === null) return false;
  try {
    storage.setItem(PLANS_STORAGE_KEY, serializeWorkspace(set));
    storage.removeItem(PLAN_STORAGE_KEY);
    storage.removeItem(LEGACY_PLAN_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

/** Removes every saved plan. Returns false when the browser refuses. */
export function clearSavedPlans(storage: StorageLike | null = browserStorage()): boolean {
  if (storage === null) return false;
  try {
    storage.removeItem(PLANS_STORAGE_KEY);
    storage.removeItem(PLAN_STORAGE_KEY);
    storage.removeItem(LEGACY_PLAN_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
