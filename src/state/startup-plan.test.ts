import { describe, expect, it } from "vitest";
import { createBlankPlan, createExamplePlan } from "./plan-document";
import { resolveStartupPlan } from "./startup-plan";

const example = createExamplePlan({ year: 2026, month: 1 });
const saved = createBlankPlan({ year: 2025, month: 5 });
const other = createBlankPlan({ year: 2026, month: 9 });

describe("resolveStartupPlan", () => {
  it("opens the saved plans as the user's own, with the one that was open, marked saved", () => {
    const loaded = { kind: "loaded", workspace: { plans: [{ id: 4, plan: saved }, { id: 7, plan: other }], activeId: 7 } } as const;
    expect(resolveStartupPlan(loaded, example)).toEqual({
      plans: [{ id: 4, plan: saved, origin: "own" }, { id: 7, plan: other, origin: "own" }],
      activeId: 7,
      returnId: null,
      storage: "saved",
      notice: null,
    });
  });

  it("shows the example when nothing is saved, without a notice", () => {
    expect(resolveStartupPlan({ kind: "none" }, example)).toEqual({
      plans: [{ id: 1, plan: example, origin: "example" }],
      activeId: 1,
      returnId: null,
      storage: "idle",
      notice: null,
    });
  });

  it("falls back to the example with a notice that carries the problem when the save is broken", () => {
    const problem = { code: "amount", field: "startAmount", min: 0, max: 100 } as const;
    const result = resolveStartupPlan({ kind: "invalid", problem }, example);
    expect(result.plans).toEqual([{ id: 1, plan: example, origin: "example" }]);
    expect(result.notice).toEqual({ kind: "saved-plan-unreadable", problem });
  });

  it("warns once that changes will not be kept when storage is blocked", () => {
    const result = resolveStartupPlan({ kind: "unavailable" }, example);
    expect(result).toMatchObject({ activeId: 1, storage: "blocked" });
    expect(result.plans[0]?.origin).toBe("example");
    expect(result.notice).toEqual({ kind: "storage-blocked" });
  });
});
