import { PLAN_LIMITS } from "./plan-document";
import type { PlanDocument } from "./plan-document";
import { failWith, problemOf } from "./plan-problem";
import type { AppState, PlanEntry, PlanSet } from "./types";

/*
 * Pure changes to the set of plans. Every function takes a `PlanSet` and returns a new one, or throws a PlanError
 * (`too-many-plans`). Names for new plans come from the caller, since the words belong to the UI.
 */

/** The open plan. The set is never empty, and an unknown id falls back to the first plan. */
export function activeEntry(set: PlanSet): PlanEntry {
  const entry = set.plans.find((candidate) => candidate.id === set.activeId) ?? set.plans[0];
  if (!entry) throw new Error("A plan set must hold at least one plan");
  return entry;
}

/** How many of the plans count toward the limit: everything except a plan opened from a link. */
export function ownCount(plans: readonly PlanEntry[]): number {
  return plans.filter((entry) => entry.origin !== "shared").length;
}

export function canAddPlan(set: PlanSet): boolean {
  return ownCount(set.plans) < PLAN_LIMITS.maxPlans;
}

function nextId(plans: readonly PlanEntry[]): number {
  return Math.max(0, ...plans.map((entry) => entry.id)) + 1;
}

/** Any change that adds to or reorders the user's plans makes the untouched example theirs, so it gets saved. */
function adopt(plans: readonly PlanEntry[]): PlanEntry[] {
  return plans.map((entry) => (entry.origin === "example" ? { ...entry, origin: "own" } : entry));
}

function assertRoom(set: PlanSet): void {
  if (!canAddPlan(set)) failWith({ code: "too-many-plans", max: PLAN_LIMITS.maxPlans }, `You can have at most ${PLAN_LIMITS.maxPlans} plans`);
}

/** Opens another of the plans. An id that does not exist changes nothing. */
export function selectPlan(set: PlanSet, id: number): PlanSet {
  return set.plans.some((entry) => entry.id === id) ? { ...set, activeId: id } : set;
}

/** Adds a plan as the user's own and opens it. */
export function addPlan(set: PlanSet, plan: PlanDocument): PlanSet {
  assertRoom(set);
  const entry: PlanEntry = { id: nextId(set.plans), plan, origin: "own" };
  return { ...set, plans: [...adopt(set.plans), entry], activeId: entry.id };
}

/** Replaces the open plan with a changed one. The example becomes the user's own; a shared plan stays shared. */
export function updateActivePlan(set: PlanSet, plan: PlanDocument): PlanSet {
  const current = activeEntry(set);
  if (plan === current.plan) return set;
  const origin = current.origin === "shared" ? "shared" : "own";
  return { ...set, plans: set.plans.map((entry) => (entry.id === current.id ? { ...entry, plan, origin } : entry)) };
}

/**
 * Removes one of the user's own plans. The last one can't be removed. The open plan moves to its neighbour when it
 * is the one removed.
 */
export function deletePlan(set: PlanSet, id: number): PlanSet {
  const index = set.plans.findIndex((entry) => entry.id === id);
  const target = set.plans[index];
  if (!target || target.origin === "shared" || ownCount(set.plans) <= 1) return set;
  const plans = set.plans.filter((entry) => entry.id !== id);
  if (set.activeId !== id) return { ...set, plans: adopt(plans) };
  const neighbour = plans[Math.min(index, plans.length - 1)];
  return { ...set, plans: adopt(plans), activeId: neighbour ? neighbour.id : set.activeId };
}

/** Opens a plan from a share link as an extra, unsaved plan. A shared plan that was already open is replaced. */
export function openSharedPlan(set: PlanSet, plan: PlanDocument): PlanSet {
  const kept = set.plans.filter((entry) => entry.origin !== "shared");
  const entry: PlanEntry = { id: nextId(set.plans), plan, origin: "shared" };
  const returnTo = activeEntry(set).origin === "shared" ? set.returnId : set.activeId;
  const stillThere = kept.some((candidate) => candidate.id === returnTo);
  return { plans: [...kept, entry], activeId: entry.id, returnId: stillThere ? returnTo : (kept[0]?.id ?? null) };
}

/** Turns the open shared plan into one of the user's own, next to the others. Throws when there is no room. */
export function keepSharedPlan(set: PlanSet): PlanSet {
  const current = activeEntry(set);
  if (current.origin !== "shared") return set;
  assertRoom(set);
  const plans = set.plans.map((entry) => (entry.id === current.id ? { ...entry, origin: "own" as const } : entry));
  return { ...set, plans, returnId: null };
}

/** Drops the shared plan and goes back to the plan that was open before it. */
export function leaveSharedPlan(set: PlanSet): PlanSet {
  const plans = set.plans.filter((entry) => entry.origin !== "shared");
  if (plans.length === set.plans.length) return set;
  const back = plans.find((entry) => entry.id === set.returnId) ?? plans[0];
  return { plans, activeId: back ? back.id : set.activeId, returnId: null };
}

/**
 * Applies a change to the set of plans. A change that throws a RangeError (for example too many plans) leaves
 * everything as it was and sets a notice. The selected event and the chart cursor belong to the open plan, so a
 * change that opens another plan resets them. Any other error is a bug and is not hidden.
 */
export function withPlanSetChange(state: AppState, change: (set: PlanSet) => PlanSet): AppState {
  try {
    const next = change(state);
    if (next === state) return { ...state, notice: null };
    const switched = next.activeId !== state.activeId;
    return {
      ...state,
      plans: next.plans,
      activeId: next.activeId,
      returnId: next.returnId,
      notice: null,
      ...(switched ? { selectedEvent: null, chartMonth: null } : {}),
    };
  } catch (error) {
    if (error instanceof RangeError) return { ...state, notice: { kind: "change-rejected", problem: problemOf(error) } };
    throw error;
  }
}
