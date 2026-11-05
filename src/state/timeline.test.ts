import { describe, expect, it } from "vitest";
import type { PlannedDepositChange, PlannedOneTimeDeposit, PlannedWithdrawal } from "./types";
import { buildTimeline, chartMonthOf, depositChangeKey, eventsAtMonth, isPlanned, oneTimeDepositKey, withdrawalKey } from "./timeline";

function withdrawal(id: number, month: number): PlannedWithdrawal {
  return {
    id,
    date: { year: 2026 + Math.floor(month / 12), month: (month % 12) + 1 },
    month,
    amount: 100,
    applied: 100,
    shortfall: 0,
    label: `W${id}`,
    status: "planned",
    effect: 0,
    lostGrowth: 0,
  };
}

function depositChange(id: number, startMonth: number): PlannedDepositChange {
  return {
    id,
    label: `D${id}`,
    startDate: { year: 2026 + Math.floor(startMonth / 12), month: (startMonth % 12) + 1 },
    endDate: null,
    startMonth,
    endMonth: null,
    amount: 0,
    status: "planned",
    effect: 0,
  };
}

function oneTime(id: number, month: number): PlannedOneTimeDeposit {
  return {
    id,
    label: `O${id}`,
    date: { year: 2026 + Math.floor(month / 12), month: (month % 12) + 1 },
    month,
    amount: 100,
    status: "planned",
    effect: 0,
  };
}

describe("buildTimeline", () => {
  it("is empty without events", () => {
    expect(buildTimeline([], [], [])).toEqual([]);
  });

  it("mixes both kinds in date order and numbers them from 1", () => {
    const entries = buildTimeline([withdrawal(1, 60), withdrawal(2, 12)], [depositChange(1, 24)], []);
    expect(entries.map((e) => e.key)).toEqual([withdrawalKey(2), depositChangeKey(1), withdrawalKey(1)]);
    expect(entries.map((e) => e.number)).toEqual([1, 2, 3]);
  });

  it("puts a deposit change before a withdrawal in the same month, then orders by id", () => {
    const entries = buildTimeline([withdrawal(5, 12), withdrawal(3, 12)], [depositChange(9, 12)], []);
    expect(entries.map((e) => e.key)).toEqual([depositChangeKey(9), withdrawalKey(3), withdrawalKey(5)]);
  });

  it("keeps events before the start first, since their month is negative", () => {
    const entries = buildTimeline([withdrawal(1, 0)], [depositChange(1, -6)], []);
    expect(entries.map((e) => e.key)).toEqual([depositChangeKey(1), withdrawalKey(1)]);
  });

  it("does not change its input", () => {
    const withdrawals = [withdrawal(1, 30), withdrawal(2, 6)];
    buildTimeline(withdrawals, [], []);
    expect(withdrawals.map((w) => w.id)).toEqual([1, 2]);
  });

  it("gives every entry a key that is unique across kinds", () => {
    const entries = buildTimeline([withdrawal(1, 1)], [depositChange(1, 1)], [oneTime(1, 1)]);
    expect(new Set(entries.map((e) => e.key)).size).toBe(3);
  });

  it("orders one-time deposits between deposit changes and withdrawals in the same month", () => {
    const entries = buildTimeline([withdrawal(1, 12)], [depositChange(1, 12)], [oneTime(1, 12), oneTime(2, 6)]);
    expect(entries.map((e) => e.key)).toEqual([
      oneTimeDepositKey(2),
      depositChangeKey(1),
      oneTimeDepositKey(1),
      withdrawalKey(1),
    ]);
  });
});

describe("events on the chart", () => {
  const timeline = buildTimeline(
    [withdrawal(1, 60), { ...withdrawal(2, 60), status: "after-horizon" }],
    [depositChange(1, -6), depositChange(2, 60)],
    [oneTime(1, 61)],
  );

  it("counts only planned events", () => {
    expect(timeline.filter(isPlanned).map((e) => e.key)).not.toContain(withdrawalKey(2));
  });

  it("draws a change that began before the plan at month 0", () => {
    const early = timeline.find((e) => e.key === depositChangeKey(1));
    expect(early && chartMonthOf(early)).toBe(0);
  });

  it("finds the planned events of one month, in list order", () => {
    expect(eventsAtMonth(timeline, 60).map((e) => e.key)).toEqual([depositChangeKey(2), withdrawalKey(1)]);
    expect(eventsAtMonth(timeline, 0).map((e) => e.key)).toEqual([depositChangeKey(1)]);
    expect(eventsAtMonth(timeline, 5)).toEqual([]);
  });
});

