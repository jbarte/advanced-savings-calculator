import { describe, expect, it } from "vitest";
import { PLAN_LIMITS, createBlankPlan, createExamplePlan } from "./plan-document";
import type { PlanDocument } from "./plan-document";
import { readPlanDocument, readPlanText, serializePlan } from "./read-plan";

const start = { year: 2026, month: 1 };
const full: PlanDocument = {
  ...createExamplePlan(start),
  depositChanges: [
    { id: 1, startDate: { year: 2027, month: 1 }, endDate: { year: 2028, month: 1 }, amount: 0, label: "Pause" },
    { id: 2, startDate: { year: 2030, month: 6 }, endDate: null, amount: 500_000, label: "Raise" },
  ],
  oneTimeDeposits: [{ id: 1, date: { year: 2029, month: 3 }, amount: 1_000_000, label: "Bonus" }],
};

/** A plan as plain JSON, so a test can break one field. */
const asJson = (plan: PlanDocument): Record<string, unknown> => JSON.parse(JSON.stringify(plan)) as Record<string, unknown>;

describe("readPlanDocument", () => {
  it("reads back what serializePlan wrote, for a plan with every kind of event", () => {
    expect(readPlanText(serializePlan(full))).toEqual(full);
    expect(readPlanText(serializePlan(createBlankPlan(start)))).toEqual(createBlankPlan(start));
  });

  it("drops fields it does not know", () => {
    const raw = { ...asJson(full), extra: "x" };
    expect(readPlanDocument(raw)).toEqual(full);
  });

  it("rejects things that are not a plan", () => {
    for (const raw of [null, undefined, 3, "plan", [], true]) expect(() => readPlanDocument(raw)).toThrow(RangeError);
  });

  it("says when a plan comes from a newer version, and rejects other versions", () => {
    expect(() => readPlanDocument({ ...asJson(full), version: 3 })).toThrow(/newer version/);
    expect(() => readPlanDocument({ ...asJson(full), version: "1" })).toThrow(RangeError);
    const { version: _version, ...noVersion } = asJson(full);
    expect(() => readPlanDocument(noVersion)).toThrow(RangeError);
  });

  it("rejects a missing or wrongly typed field", () => {
    for (const key of ["start", "startAmount", "monthlyDeposit", "annualReturnPct", "withdrawals", "depositChanges", "oneTimeDeposits"]) {
      const { [key]: _removed, ...without } = asJson(full);
      expect(() => readPlanDocument(without), `missing ${key}`).toThrow(RangeError);
    }
    expect(() => readPlanDocument({ ...asJson(full), startAmount: "5000" })).toThrow(RangeError);
    expect(() => readPlanDocument({ ...asJson(full), withdrawals: {} })).toThrow(RangeError);
    expect(() => readPlanDocument({ ...asJson(full), start: { year: "2026", month: 1 } })).toThrow(RangeError);
  });

  it("rejects badly shaped events", () => {
    expect(() => readPlanDocument({ ...asJson(full), withdrawals: [null] })).toThrow(RangeError);
    expect(() => readPlanDocument({ ...asJson(full), withdrawals: [{ id: 1, date: { year: 2030, month: 1 }, amount: 5 }] })).toThrow(RangeError);
    expect(() =>
      readPlanDocument({ ...asJson(full), depositChanges: [{ id: 1, startDate: { year: 2030, month: 1 }, amount: 0, label: "x" }] }),
    ).toThrow(RangeError);
  });

  it("rejects values outside the limits, since the plan check still applies", () => {
    expect(() => readPlanDocument({ ...asJson(full), startAmount: PLAN_LIMITS.maxStartAmount + 1 })).toThrow(RangeError);
    expect(() => readPlanDocument({ ...asJson(full), startAmount: 1.5 })).toThrow(RangeError);
    expect(() => readPlanDocument({ ...asJson(full), annualReturnPct: 1000 })).toThrow(RangeError);
    expect(() => readPlanDocument({ ...asJson(full), start: { year: 1900, month: 1 } })).toThrow(RangeError);
  });

  it("rejects a list that is longer than the limit before reading it", () => {
    const many = Array.from({ length: PLAN_LIMITS.maxWithdrawals + 1 }, (_, i) => ({
      id: i + 1,
      date: { year: 2030, month: 1 },
      amount: 100,
      label: "w",
    }));
    expect(() => readPlanDocument({ ...asJson(full), withdrawals: many })).toThrow(/at most/);
  });

  it("rejects duplicate ids", () => {
    const w = { id: 1, date: { year: 2030, month: 1 }, amount: 100, label: "w" };
    expect(() => readPlanDocument({ ...asJson(full), withdrawals: [w, w] })).toThrow(RangeError);
  });
});

describe("readPlanText", () => {
  it("rejects text that is not JSON", () => {
    expect(() => readPlanText("{not json")).toThrow(RangeError);
    expect(() => readPlanText("")).toThrow(RangeError);
  });

  it("does not trust a prototype-polluting payload", () => {
    const text = '{"__proto__": {"polluted": true}, "version": 1}';
    expect(() => readPlanText(text)).toThrow(RangeError);
    expect(({} as Record<string, unknown>)["polluted"]).toBeUndefined();
  });
});

describe("step 0a", () => {
  it("trims labels when reading, so padding can't hide a long label", () => {
    const padded = { ...asJson(full), withdrawals: [{ id: 1, date: { year: 2031, month: 1 }, amount: 100, label: " ".repeat(5000) + "Car  " }] };
    expect(readPlanDocument(padded).withdrawals[0]?.label).toBe("Car");
  });

  it("rejects an id of 2^53", () => {
    const raw = { ...asJson(full), withdrawals: [{ id: 2 ** 53, date: { year: 2031, month: 1 }, amount: 100, label: "x" }] };
    expect(() => readPlanDocument(raw)).toThrow(RangeError);
  });
});

describe("upgrading a version 1 plan", () => {
  /** A plan as version 1 wrote it: no horizon and no inflation. */
  function versionOne(plan: PlanDocument): Record<string, unknown> {
    const { horizonYears: _horizon, inflationPct: _inflation, ...rest } = asJson(plan);
    return { ...rest, version: 1 };
  }

  it("opens with a 30-year horizon and 2 % inflation, as the page showed before", () => {
    const upgraded = readPlanDocument(versionOne(full));
    expect(upgraded).toEqual({ ...full, version: 2, horizonYears: 30, inflationPct: 2 });
  });

  it("still checks everything else", () => {
    expect(() => readPlanDocument({ ...versionOne(full), startAmount: -1 })).toThrow(RangeError);
  });

  it("is rejected with a reason when its return is above the new 30 % limit", () => {
    expect(() => readPlanDocument({ ...versionOne(full), annualReturnPct: 45 })).toThrow(/Expected return/);
  });

  it("requires the new fields in a version 2 plan", () => {
    const { horizonYears: _horizon, ...noHorizon } = asJson(full);
    expect(() => readPlanDocument(noHorizon)).toThrow(RangeError);
  });

  it("rejects a horizon or inflation outside the limits", () => {
    expect(() => readPlanDocument({ ...asJson(full), horizonYears: 41 })).toThrow(RangeError);
    expect(() => readPlanDocument({ ...asJson(full), horizonYears: 2.5 })).toThrow(RangeError);
    expect(() => readPlanDocument({ ...asJson(full), inflationPct: 25 })).toThrow(RangeError);
  });
});

