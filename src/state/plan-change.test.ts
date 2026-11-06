import { describe, expect, it } from "vitest";
import { createBlankPlan } from "./plan-document";
import { withPlanChange } from "./plan-change";
import { updatePlanFields } from "./plan-fields";
import { createTestState } from "./test-support";
import type { AppState } from "./types";
import { activeEntry } from "./workspace";

const state = createTestState(createBlankPlan({ year: 2026, month: 1 }), "example", { notice: { kind: "storage-blocked" } });

describe("withPlanChange", () => {
  it("applies a valid change, marks the plan as the user's own and clears the notice", () => {
    const next = withPlanChange(state, (plan) => updatePlanFields(plan, { monthlyDeposit: 300_000 }));
    expect(activeEntry(next).plan.monthlyDeposit).toBe(300_000);
    expect(activeEntry(next).origin).toBe("own");
    expect(next.notice).toBeNull();
  });

  it("keeps everything else in the state", () => {
    const next = withPlanChange(state, (plan) => plan);
    expect(next).toMatchObject({ metric: "balance", theme: "system", activeId: 1 });
  });

  it("leaves the plan alone and says why when the change is invalid", () => {
    const next = withPlanChange(state, (plan) => updatePlanFields(plan, { startAmount: -1 }));
    expect(activeEntry(next).plan).toBe(activeEntry(state).plan);
    expect(activeEntry(next).origin).toBe("example");
    expect(next.notice).toEqual({ kind: "change-rejected", problem: { code: "amount", field: "startAmount", min: 0, max: 10_000_000_000 } });
  });

  it("does not hide errors that are not about invalid values", () => {
    expect(() =>
      withPlanChange(state, () => {
        throw new TypeError("a bug");
      }),
    ).toThrow(TypeError);
  });

  it("keeps a shared plan shared when it is changed, so it is not saved by accident", () => {
    const shared: AppState = createTestState(activeEntry(state).plan, "shared");
    const next = withPlanChange(shared, (plan) => updatePlanFields(plan, { monthlyDeposit: 100 }));
    expect(activeEntry(next).origin).toBe("shared");
    expect(activeEntry(next).plan.monthlyDeposit).toBe(100);
  });
});

describe("withPlanChange: changes that change nothing", () => {
  it("keeps the same plan object and origin, so the untouched example is not saved", () => {
    const next = withPlanChange(state, (plan) => updatePlanFields(plan, { monthlyDeposit: plan.monthlyDeposit }));
    expect(activeEntry(next).plan).toBe(activeEntry(state).plan);
    expect(activeEntry(next).origin).toBe("example");
  });

  it("still clears an old notice", () => {
    expect(withPlanChange(state, (plan) => ({ ...plan })).notice).toBeNull();
  });
});
