import { describe, expect, it } from "vitest";
import { PLAN_LIMITS, createBlankPlan, createExamplePlan } from "./plan-document";
import { PlanError } from "./plan-problem";
import type { PlanProblem } from "./plan-problem";
import { readWorkspaceDocument, readWorkspaceText, serializeWorkspace, workspaceFromPlan } from "./read-workspace";
import type { PlanSet } from "./types";

const start = { year: 2026, month: 1 };
const a = createExamplePlan(start);
const b = { ...createBlankPlan(start), name: "B" };
const json = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

function problemOf(run: () => unknown): PlanProblem {
  try {
    run();
  } catch (error) {
    if (error instanceof PlanError) return error.problem;
    throw error;
  }
  throw new Error("Expected a PlanError");
}

const doc = { version: 1, activeId: 2, plans: [{ id: 1, plan: a }, { id: 2, plan: b }] };

describe("readWorkspaceDocument", () => {
  it("reads every plan, with its id, and which one was open", () => {
    expect(readWorkspaceDocument(json(doc))).toEqual({ plans: [{ id: 1, plan: a }, { id: 2, plan: b }], activeId: 2 });
  });

  it("opens the first plan when the open one is missing", () => {
    expect(readWorkspaceDocument(json({ ...doc, activeId: 99 })).activeId).toBe(1);
    expect(readWorkspaceDocument(json({ ...doc, activeId: "x" })).activeId).toBe(1);
  });

  it("checks every plan like a single plan, so a bad value in any of them is refused", () => {
    const bad = { ...doc, plans: [{ id: 1, plan: a }, { id: 2, plan: { ...b, startAmount: -1 } }] };
    expect(problemOf(() => readWorkspaceDocument(json(bad)))).toMatchObject({ code: "amount", field: "startAmount" });
  });

  it("refuses data that is not a set of plans as damaged", () => {
    for (const value of [null, 5, [], {}, { version: 1 }, { version: 1, plans: [] }, { version: 1, plans: "x" }, { ...doc, version: 0 }]) {
      expect(problemOf(() => readWorkspaceDocument(value))).toEqual({ code: "damaged" });
    }
  });

  it("refuses ids that are missing, not whole numbers, too large or used twice", () => {
    const withId = (id: unknown, second: unknown = 2): unknown => ({ ...doc, plans: [{ id, plan: a }, { id: second, plan: b }] });
    for (const value of [withId(undefined), withId(1.5), withId(0), withId(2 ** 53), withId(1, 1)]) {
      expect(problemOf(() => readWorkspaceDocument(json(value)))).toEqual({ code: "damaged" });
    }
  });

  it("refuses more plans than the limit before reading them, and a newer format", () => {
    const many = { ...doc, plans: Array.from({ length: PLAN_LIMITS.maxPlans + 1 }, (_, i) => ({ id: i + 1, plan: a })) };
    expect(problemOf(() => readWorkspaceDocument(json(many)))).toEqual({ code: "too-many-plans", max: PLAN_LIMITS.maxPlans });
    expect(problemOf(() => readWorkspaceDocument({ ...doc, version: 2 }))).toEqual({ code: "newer-version" });
  });

  it("reads text, and calls text that is not JSON damaged", () => {
    expect(readWorkspaceText(JSON.stringify(doc)).plans).toHaveLength(2);
    expect(problemOf(() => readWorkspaceText("{oops"))).toEqual({ code: "damaged" });
  });
});

describe("serializeWorkspace", () => {
  const set: PlanSet = { plans: [{ id: 1, plan: a, origin: "own" }, { id: 3, plan: b, origin: "own" }], activeId: 3, returnId: null };

  it("round-trips the plans and the open one", () => {
    expect(readWorkspaceText(serializeWorkspace(set))).toEqual({ plans: [{ id: 1, plan: a }, { id: 3, plan: b }], activeId: 3 });
  });

  it("leaves out a plan opened from a link, and saves the plan to go back to as the open one", () => {
    const shared: PlanSet = { plans: [...set.plans, { id: 4, plan: createBlankPlan(start), origin: "shared" }], activeId: 4, returnId: 1 };
    expect(readWorkspaceText(serializeWorkspace(shared))).toEqual({ plans: [{ id: 1, plan: a }, { id: 3, plan: b }], activeId: 1 });
  });
});

describe("workspaceFromPlan", () => {
  it("makes a set of one plan for someone who saved a single plan", () => {
    expect(workspaceFromPlan(a)).toEqual({ plans: [{ id: 1, plan: a }], activeId: 1 });
  });
});
