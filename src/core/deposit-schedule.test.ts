import { describe, expect, it } from "vitest";
import { depositInMonth, depositLevelChanges } from "./deposit-schedule";
import type { DepositChangeInput } from "./types";

const change = (startMonth: number, endMonth: number | null, amount: number, label = "c"): DepositChangeInput => ({
  startMonth,
  endMonth,
  amount,
  label,
});

describe("depositInMonth", () => {
  it("is the base deposit when there are no changes", () => {
    expect(depositInMonth(3_000, [], 1)).toBe(3_000);
    expect(depositInMonth(3_000, [], 360)).toBe(3_000);
  });

  it("uses a change from its start month onward when it has no end", () => {
    const changes = [change(12, null, 5_000)];
    expect(depositInMonth(3_000, changes, 11)).toBe(3_000);
    expect(depositInMonth(3_000, changes, 12)).toBe(5_000);
    expect(depositInMonth(3_000, changes, 360)).toBe(5_000);
  });

  it("uses a change with an end only from its start month through its end month, both included", () => {
    const changes = [change(13, 24, 0)];
    expect(depositInMonth(3_000, changes, 12)).toBe(3_000);
    expect(depositInMonth(3_000, changes, 13)).toBe(0);
    expect(depositInMonth(3_000, changes, 24)).toBe(0);
    expect(depositInMonth(3_000, changes, 25)).toBe(3_000);
  });

  it("goes back to an open-ended change when a period inside it ends", () => {
    const changes = [change(12, null, 5_000, "raise"), change(24, 35, 0, "pause")];
    expect(depositInMonth(3_000, changes, 23)).toBe(5_000);
    expect(depositInMonth(3_000, changes, 24)).toBe(0);
    expect(depositInMonth(3_000, changes, 35)).toBe(0);
    expect(depositInMonth(3_000, changes, 36)).toBe(5_000);
  });

  it("uses the change with the latest start when several are active", () => {
    const changes = [change(6, null, 2_000), change(12, null, 4_000)];
    expect(depositInMonth(1_000, changes, 11)).toBe(2_000);
    expect(depositInMonth(1_000, changes, 12)).toBe(4_000);
  });

  it("does not depend on the order of the list when the starts differ", () => {
    const changes = [change(12, null, 4_000), change(6, null, 2_000)];
    expect(depositInMonth(1_000, changes, 12)).toBe(4_000);
  });

  it("lets the one later in the list win when the start is the same", () => {
    expect(depositInMonth(1_000, [change(6, null, 2_000), change(6, null, 3_000)], 6)).toBe(3_000);
    expect(depositInMonth(1_000, [change(6, null, 3_000), change(6, null, 2_000)], 6)).toBe(2_000);
  });

  it("applies a change that started before the plan from the first month", () => {
    expect(depositInMonth(1_000, [change(-10, null, 700)], 1)).toBe(700);
    expect(depositInMonth(1_000, [change(-10, 3, 700)], 3)).toBe(700);
    expect(depositInMonth(1_000, [change(-10, 3, 700)], 4)).toBe(1_000);
  });

  it("never uses a change that ends before it starts", () => {
    const changes = [change(10, 5, 0)];
    for (const month of [1, 5, 7, 10, 20]) expect(depositInMonth(1_000, changes, month)).toBe(1_000);
  });

  it("allows a deposit of 0 to pause saving", () => {
    expect(depositInMonth(3_000, [change(1, null, 0)], 5)).toBe(0);
  });
});

describe("depositLevelChanges", () => {
  it("is empty when nothing changes", () => {
    expect(depositLevelChanges(3_000, [], 360)).toEqual([]);
    expect(depositLevelChanges(3_000, [change(5, null, 3_000)], 360)).toEqual([]);
  });

  it("lists the months where the level changes", () => {
    expect(depositLevelChanges(3_000, [change(13, 24, 0)], 36)).toEqual([
      { month: 13, amount: 0 },
      { month: 25, amount: 3_000 },
    ]);
  });

  it("follows a period inside an open-ended change", () => {
    const changes = [change(12, null, 5_000), change(24, 35, 0)];
    expect(depositLevelChanges(3_000, changes, 360)).toEqual([
      { month: 12, amount: 5_000 },
      { month: 24, amount: 0 },
      { month: 36, amount: 5_000 },
    ]);
  });

  it("reports a first month that differs from the base", () => {
    expect(depositLevelChanges(3_000, [change(-5, null, 1_000)], 12)).toEqual([{ month: 1, amount: 1_000 }]);
  });

  it("stops at the given number of months", () => {
    expect(depositLevelChanges(3_000, [change(50, null, 0)], 40)).toEqual([]);
  });
});
