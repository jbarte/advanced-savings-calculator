import { describe, expect, it } from "vitest";
import { createExamplePlan } from "./plan-document";
import { MAX_PLAN_FILE_CHARS, planFileText, readPlanFile } from "./plan-file";
import { PlanError } from "./plan-problem";
import type { PlanProblem } from "./plan-problem";

const plan = { ...createExamplePlan({ year: 2026, month: 1 }), name: "House 2031" };

function problemFrom(run: () => unknown): PlanProblem {
  try {
    run();
  } catch (error) {
    if (error instanceof PlanError) return error.problem;
    throw error;
  }
  throw new Error("Expected a PlanError");
}

describe("planFileText and readPlanFile", () => {
  it("round-trips a plan, name and events included", () => {
    expect(readPlanFile(planFileText(plan))).toEqual(plan);
  });

  it("writes readable, indented JSON that ends with a line break", () => {
    const text = planFileText(plan);
    expect(text).toContain('\n  "version": 4,');
    expect(text.endsWith("}\n")).toBe(true);
  });

  it("reads a file from an older version of the app, like a saved plan", () => {
    const { name: _name, ...v3 } = plan;
    expect(readPlanFile(JSON.stringify({ ...v3, version: 3 }))).toEqual({ ...plan, name: null });
  });

  it("refuses text that is not a plan, a plan with a bad value, and one from a newer app", () => {
    expect(problemFrom(() => readPlanFile("not json"))).toEqual({ code: "damaged" });
    expect(problemFrom(() => readPlanFile('{"hello": 1}'))).toEqual({ code: "damaged" });
    expect(problemFrom(() => readPlanFile(planFileText({ ...plan, startAmount: -1 })))).toMatchObject({ code: "amount", field: "startAmount" });
    expect(problemFrom(() => readPlanFile(JSON.stringify({ ...plan, version: 99 })))).toEqual({ code: "newer-version" });
  });

  it("refuses a file that is far too large before reading it", () => {
    expect(problemFrom(() => readPlanFile(" ".repeat(MAX_PLAN_FILE_CHARS + 1)))).toEqual({ code: "file-too-large" });
  });
});
