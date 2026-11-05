import { describe, expect, it } from "vitest";
import { createBlankPlan } from "./plan-document";
import { withPlanChange } from "./plan-change";
import { updatePlanFields } from "./plan-fields";
import type { AppState } from "./types";

const state: AppState = {
  scenarioId: "plan",
  plan: createBlankPlan({ year: 2026, month: 1 }),
  planOrigin: "example",
  horizon: 30,
  metric: "balance",
  selectedEvent: null,
  theme: "system",
  notice: "An old notice",
};

describe("withPlanChange", () => {
  it("applies a valid change, marks the plan as the user's own and clears the notice", () => {
    const next = withPlanChange(state, (plan) => updatePlanFields(plan, { monthlyDeposit: 300_000 }));
    expect(next.plan.monthlyDeposit).toBe(300_000);
    expect(next.planOrigin).toBe("own");
    expect(next.notice).toBeNull();
  });

  it("keeps everything else in the state", () => {
    const next = withPlanChange(state, (plan) => plan);
    expect(next).toMatchObject({ scenarioId: "plan", horizon: 30, metric: "balance", theme: "system" });
  });

  it("leaves the plan alone and says why when the change is invalid", () => {
    const next = withPlanChange(state, (plan) => updatePlanFields(plan, { startAmount: -1 }));
    expect(next.plan).toBe(state.plan);
    expect(next.planOrigin).toBe("example");
    expect(next.notice).toMatch(/not applied/i);
    expect(next.notice).toMatch(/start amount/i);
  });

  it("does not hide errors that are not about invalid values", () => {
    expect(() =>
      withPlanChange(state, () => {
        throw new TypeError("a bug");
      }),
    ).toThrow(TypeError);
  });
});
