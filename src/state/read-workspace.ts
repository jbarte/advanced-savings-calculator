import { PLAN_LIMITS } from "./plan-document";
import type { PlanDocument } from "./plan-document";
import { failWith } from "./plan-problem";
import { readPlanDocument } from "./read-plan";
import type { PlanSet } from "./types";

/*
 * The plans as they are saved: one versioned document with every plan of the user's own and which one was open.
 * Saved text is untrusted, so it is read like a single plan is (shape first, then the same checks for every plan).
 * Plans saved before there could be several are a single `PlanDocument`: `workspaceFromPlan` makes a set of one.
 */

/** The format of the saved set of plans. Newer formats can't be read. */
const WORKSPACE_VERSION = 1;

export interface SavedPlan {
  readonly id: number;
  readonly plan: PlanDocument;
}

export interface SavedWorkspace {
  readonly plans: readonly SavedPlan[];
  readonly activeId: number;
}

function damaged(message: string): never {
  return failWith({ code: "damaged" }, message);
}

function isObject(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readSavedPlan(value: unknown): SavedPlan {
  if (!isObject(value)) return damaged("A saved plan is not an object");
  const id = value["id"];
  // Below the largest safe integer, so the next id (one above the highest) is still exact.
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id < 1 || id >= Number.MAX_SAFE_INTEGER) {
    return damaged("A saved plan needs an id that is a positive whole number");
  }
  return { id, plan: readPlanDocument(value["plan"]) };
}

/** Reads the saved set of plans from parsed JSON. */
export function readWorkspaceDocument(value: unknown): SavedWorkspace {
  if (!isObject(value)) return damaged("The saved plans are not an object");
  const version = value["version"];
  if (typeof version === "number" && version > WORKSPACE_VERSION) {
    return failWith({ code: "newer-version" }, "These plans were saved by a newer version of the app");
  }
  if (version !== WORKSPACE_VERSION) return damaged(`Unknown format ${String(version)}`);

  const list = value["plans"];
  if (!Array.isArray(list) || list.length === 0) return damaged("The saved plans must be a list with at least one plan");
  if (list.length > PLAN_LIMITS.maxPlans) {
    return failWith({ code: "too-many-plans", max: PLAN_LIMITS.maxPlans }, `You can have at most ${PLAN_LIMITS.maxPlans} plans`);
  }
  const plans = (list as unknown[]).map(readSavedPlan);
  if (new Set(plans.map((saved) => saved.id)).size !== plans.length) return damaged("Two saved plans have the same id");

  const activeId = value["activeId"];
  const open = plans.find((saved) => saved.id === activeId) ?? plans[0];
  return { plans, activeId: open ? open.id : 1 };
}

/** Reads the saved set of plans from JSON text. */
export function readWorkspaceText(text: string): SavedWorkspace {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return damaged("The saved text is not valid JSON");
  }
  return readWorkspaceDocument(parsed);
}

/** The set of plans for someone who saved a single plan before there could be several. */
export function workspaceFromPlan(plan: PlanDocument): SavedWorkspace {
  return { plans: [{ id: 1, plan }], activeId: 1 };
}

/**
 * The text that gets saved. Only the user's own plans are in it, never one opened from a link. When a shared plan is
 * open, the plan to go back to is the one saved as open.
 */
export function serializeWorkspace(set: PlanSet): string {
  const own = set.plans.filter((entry) => entry.origin !== "shared");
  const open = set.plans.find((entry) => entry.id === set.activeId);
  const activeId = open && open.origin !== "shared" ? open.id : (own.find((entry) => entry.id === set.returnId) ?? own[0])?.id;
  const document = { version: WORKSPACE_VERSION, activeId, plans: own.map(({ id, plan }) => ({ id, plan })) };
  return JSON.stringify(document);
}
