import { describe, expect, it } from "vitest";
import { createBlankPlan } from "./plan-document";
import { withPlanChange } from "./plan-change";
import { updatePlanFields } from "./plan-fields";
import type { AppState } from "./types";

const state: AppState = {
  scenarioId: "plan",
  plan: createBlankPlan({ year: 2026, month: 1 }),
  planOrigin: "example",
  storage: "idle",
  metric: "balance",
  selectedEvent: null,
  inflationAdjusted: false,
  chartMonth: null,
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
    expect(next).toMatchObject({ scenarioId: "plan", metric: "balance", theme: "system" });
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

  it("keeps a shared plan shared when it is changed, so it is not saved by accident", () => {
    const shared: AppState = { ...state, planOrigin: "shared" };
    const next = withPlanChange(shared, (plan) => updatePlanFields(plan, { monthlyDeposit: 100 }));
    expect(next.planOrigin).toBe("shared");
    expect(next.plan.monthlyDeposit).toBe(100);
  });
});

describe("withPlanChange: changes that change nothing", () => {
  it("keeps the same plan object and origin, so the untouched example is not saved", () => {
    const next = withPlanChange(state, (plan) => updatePlanFields(plan, { monthlyDeposit: plan.monthlyDeposit }));
    expect(next.plan).toBe(state.plan);
    expect(next.planOrigin).toBe("example");
  });

  it("still clears an old notice", () => {
    expect(withPlanChange(state, (plan) => ({ ...plan })).notice).toBeNull();
  });
});
