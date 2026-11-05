import type { PlanDocument } from "./plan-document";
import { readPlanText, serializePlan } from "./read-plan";

/** The part of `Storage` we use, so tests can pass a fake. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/*
 * Storage on jbarte.github.io is shared by every Pages site of the account, so the key names the app. Plans saved
 * under the earlier, short key are still read, and moved to the new key by the next save.
 */
export const PLAN_STORAGE_KEY = "advanced-savings-calculator:plan";
export const LEGACY_PLAN_STORAGE_KEY = "asc-plan";

export type LoadResult =
  | { readonly kind: "none" }
  | { readonly kind: "loaded"; readonly plan: PlanDocument }
  | { readonly kind: "invalid"; readonly reason: string }
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
 * Reads the saved plan. Saved text is untrusted: it goes through the same checks as a form, so a corrupted or
 * hand-edited save can never reach the engine. A bad save is left in place until the next change replaces it.
 */
export function loadSavedPlan(storage: StorageLike | null = browserStorage()): LoadResult {
  if (storage === null) return { kind: "unavailable" };
  let text: string | null;
  try {
    text = storage.getItem(PLAN_STORAGE_KEY) ?? storage.getItem(LEGACY_PLAN_STORAGE_KEY);
  } catch {
    return { kind: "unavailable" };
  }
  if (text === null) return { kind: "none" };
  try {
    return { kind: "loaded", plan: readPlanText(text) };
  } catch (error) {
    if (error instanceof RangeError) return { kind: "invalid", reason: error.message };
    throw error;
  }
}

/** Saves the plan. Returns false when the browser refuses (blocked or full), so the app can say so. */
export function savePlan(plan: PlanDocument, storage: StorageLike | null = browserStorage()): boolean {
  if (storage === null) return false;
  try {
    storage.setItem(PLAN_STORAGE_KEY, serializePlan(plan));
    storage.removeItem(LEGACY_PLAN_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

/** Removes the saved plan. Returns false when the browser refuses. */
export function clearSavedPlan(storage: StorageLike | null = browserStorage()): boolean {
  if (storage === null) return false;
  try {
    storage.removeItem(PLAN_STORAGE_KEY);
    storage.removeItem(LEGACY_PLAN_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
