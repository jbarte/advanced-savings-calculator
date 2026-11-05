import { describe, expect, it } from "vitest";
import { createBlankPlan, createExamplePlan } from "./plan-document";
import { resolveStartupPlan } from "./startup-plan";

const example = createExamplePlan({ year: 2026, month: 1 });
const saved = createBlankPlan({ year: 2025, month: 5 });

describe("resolveStartupPlan", () => {
  it("opens a saved plan as the user's own, marked saved", () => {
    expect(resolveStartupPlan({ kind: "loaded", plan: saved }, example)).toEqual({
      plan: saved,
      planOrigin: "own",
      storage: "saved",
      notice: null,
    });
  });

  it("shows the example when nothing is saved, without a notice", () => {
    expect(resolveStartupPlan({ kind: "none" }, example)).toEqual({ plan: example, planOrigin: "example", storage: "idle", notice: null });
  });

  it("falls back to the example with a message that says why when the save is broken", () => {
    const problem = { code: "amount", field: "startAmount", min: 0, max: 100 } as const;
    const result = resolveStartupPlan({ kind: "invalid", problem }, example);
    expect(result.plan).toBe(example);
    expect(result.planOrigin).toBe("example");
    expect(result.notice).toEqual({ kind: "saved-plan-unreadable", problem });
  });

  it("warns once that changes will not be kept when storage is blocked", () => {
    const result = resolveStartupPlan({ kind: "unavailable" }, example);
    expect(result).toMatchObject({ plan: example, planOrigin: "example", storage: "blocked" });
    expect(result.notice).toEqual({ kind: "storage-blocked" });
  });
});
