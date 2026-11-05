import { describe, expect, it } from "vitest";
import { PLAN_LIMITS, createBlankPlan, createExamplePlan } from "./plan-document";
import type { PlanDocument } from "./plan-document";
import { buildShareUrl, decodePlan, encodePlan, planTokenFromHash } from "./share-link";

const start = { year: 2026, month: 1 };

const withEvents: PlanDocument = {
  ...createExamplePlan(start),
  withdrawals: [{ id: 1, date: { year: 2031, month: 3 }, amount: 15_000_000, label: "Bilköp åäö 🚗" }],
  depositChanges: [{ id: 1, startDate: { year: 2027, month: 1 }, endDate: { year: 2028, month: 1 }, amount: 0, label: "Pause" }],
  oneTimeDeposits: [{ id: 1, date: { year: 2029, month: 3 }, amount: 1_000_000, label: "Bonus" }],
};

/** The largest plan the limits allow, with the longest labels. */
function largestPlan(): PlanDocument {
  const label = "L".repeat(PLAN_LIMITS.maxLabelLength);
  const date = { year: 2099, month: 12 };
  const many = <T>(n: number, make: (id: number) => T): T[] => Array.from({ length: n }, (_, i) => make(i + 1));
  return {
    version: 3,
    start: { year: 2000, month: 1 },
    startAmount: PLAN_LIMITS.maxStartAmount,
    monthlyDeposit: PLAN_LIMITS.maxMonthlyDeposit,
    annualReturnPct: -99.99,
    horizonYears: PLAN_LIMITS.maxHorizonYears,
    inflationPct: -4.75,
    withdrawals: many(PLAN_LIMITS.maxWithdrawals, (id) => ({ id, date, amount: 9_999_999_999 - id, label })),
    depositChanges: many(PLAN_LIMITS.maxDepositChanges, (id) => ({
      id,
      startDate: date,
      endDate: date,
      amount: 999_999_999 - id,
      label,
    })),
    oneTimeDeposits: many(PLAN_LIMITS.maxOneTimeDeposits, (id) => ({ id, date, amount: 499_999_999 - id, label })),
    goal: { amount: PLAN_LIMITS.maxGoalAmount, date },
  };
}

async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([new Uint8Array(bytes)]).stream().pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const text = (value: string): Uint8Array => new TextEncoder().encode(value);

describe("encodePlan and decodePlan", () => {
  it("round-trips a plan unchanged, including every kind of event and non-ASCII labels", async () => {
    for (const plan of [withEvents, createBlankPlan(start), createExamplePlan(start)]) {
      expect(await decodePlan(await encodePlan(plan))).toEqual(plan);
    }
  });

  it("round-trips the largest allowed plan", async () => {
    const plan = largestPlan();
    expect(await decodePlan(await encodePlan(plan))).toEqual(plan);
  });

  it("makes a URL-safe token, compressed by default", async () => {
    const token = await encodePlan(withEvents);
    expect(token).toMatch(/^z\.[A-Za-z0-9_-]+$/);
  });

  it("can also write and read an uncompressed token, for browsers without CompressionStream", async () => {
    const token = await encodePlan(withEvents, { compress: false });
    expect(token).toMatch(/^u\.[A-Za-z0-9_-]+$/);
    expect(await decodePlan(token)).toEqual(withEvents);
  });

  it("keeps the link of the largest plan short enough to paste", async () => {
    const compressed = await encodePlan(largestPlan());
    expect(compressed.length).toBeLessThan(4000);
  });
});

describe("decodePlan rejects bad links", () => {
  it("rejects a token that is too long, without trying to read it", async () => {
    await expect(decodePlan("z." + "A".repeat(40_000))).rejects.toThrow(RangeError);
  });

  it("rejects an unknown prefix and an empty token", async () => {
    await expect(decodePlan("x.abc")).rejects.toThrow(/not a plan link/);
    await expect(decodePlan("")).rejects.toThrow(RangeError);
  });

  it("rejects characters that are not base64url, and a broken length", async () => {
    await expect(decodePlan("z.ab$d")).rejects.toThrow(RangeError);
    await expect(decodePlan("z.a")).rejects.toThrow(RangeError);
  });

  it("rejects a cut-off link", async () => {
    const token = await encodePlan(withEvents);
    await expect(decodePlan(token.slice(0, Math.floor(token.length / 2)))).rejects.toThrow(RangeError);
  });

  it("rejects data that is not deflate", async () => {
    await expect(decodePlan("z." + base64Url(text("this is not deflate data")))).rejects.toThrow(RangeError);
  });

  it("rejects valid data that is not JSON, or JSON that is not a plan", async () => {
    await expect(decodePlan("z." + base64Url(await deflate(text("hello"))))).rejects.toThrow(RangeError);
    await expect(decodePlan("z." + base64Url(await deflate(text('{"version":1}'))))).rejects.toThrow(RangeError);
    await expect(decodePlan("u." + base64Url(text('{"a":1}')))).rejects.toThrow(RangeError);
  });

  it("rejects a plan with values outside the limits", async () => {
    const bad = JSON.stringify({ ...withEvents, startAmount: -1 });
    await expect(decodePlan("z." + base64Url(await deflate(text(bad))))).rejects.toThrow(RangeError);
  });

  it("rejects a small token that would expand into something huge", async () => {
    const bomb = await deflate(new Uint8Array(8_000_000));
    expect(bomb.length).toBeLessThan(30_000);
    await expect(decodePlan("z." + base64Url(bomb))).rejects.toThrow(/too large/i);
  });

  it("rejects bytes that are not valid UTF-8", async () => {
    await expect(decodePlan("u." + base64Url(new Uint8Array([0xff, 0xfe, 0xfd])))).rejects.toThrow(RangeError);
  });
});

describe("planTokenFromHash", () => {
  it("returns the token after #plan=", () => {
    expect(planTokenFromHash("#plan=z.abc_-")).toBe("z.abc_-");
  });

  it("is null for other hashes", () => {
    expect(planTokenFromHash("")).toBeNull();
    expect(planTokenFromHash("#design-system")).toBeNull();
    expect(planTokenFromHash("#other=plan=1")).toBeNull();
  });

  it("returns an empty token for a bare #plan=, which then fails to decode", () => {
    expect(planTokenFromHash("#plan=")).toBe("");
  });
});

describe("buildShareUrl", () => {
  it("puts the token in the hash and replaces any hash already there", () => {
    expect(buildShareUrl("https://x.example/app/", "z.abc")).toBe("https://x.example/app/#plan=z.abc");
    expect(buildShareUrl("https://x.example/app/#plan=old", "z.abc")).toBe("https://x.example/app/#plan=z.abc");
    expect(buildShareUrl("https://x.example/app/?a=1#design-system", "z.abc")).toBe("https://x.example/app/?a=1#plan=z.abc");
  });
});

describe("links made before the horizon was part of the plan", () => {
  it("opens a version 1 link as a version 2 plan with a 30-year horizon and 2 % inflation", async () => {
    const { horizonYears: _h, inflationPct: _i, ...rest } = withEvents;
    const oldToken = "z." + base64Url(await deflate(text(JSON.stringify({ ...rest, version: 1 }))));
    expect(await decodePlan(oldToken)).toEqual({ ...withEvents, horizonYears: 30, inflationPct: 2 });
  });
});

