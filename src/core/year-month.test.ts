import { describe, expect, it } from "vitest";
import { MONTHS_PER_YEAR, addMonths, formatYearMonth, monthsBetween, yearsToMonths } from "./year-month";

describe("addMonths", () => {
  it("returns the start month for offset 0", () => {
    expect(addMonths({ year: 2026, month: 1 }, 0)).toEqual({ year: 2026, month: 1 });
  });

  it("rolls over into the next year", () => {
    expect(addMonths({ year: 2026, month: 11 }, 3)).toEqual({ year: 2027, month: 2 });
  });

  it("handles multi-year offsets", () => {
    expect(addMonths({ year: 2026, month: 1 }, 63)).toEqual({ year: 2031, month: 4 });
  });

  it("handles negative offsets", () => {
    expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });
});

describe("formatYearMonth", () => {
  it("formats as short month name and year", () => {
    expect(formatYearMonth({ year: 2031, month: 4 })).toBe("Apr 2031");
  });
});

describe("monthsBetween", () => {
  it("is 0 for the same month", () => {
    expect(monthsBetween({ year: 2026, month: 5 }, { year: 2026, month: 5 })).toBe(0);
  });

  it("counts months within a year and across years", () => {
    expect(monthsBetween({ year: 2026, month: 1 }, { year: 2026, month: 4 })).toBe(3);
    expect(monthsBetween({ year: 2026, month: 11 }, { year: 2027, month: 2 })).toBe(3);
    expect(monthsBetween({ year: 2026, month: 1 }, { year: 2031, month: 4 })).toBe(63);
  });

  it("is negative when the second month is earlier", () => {
    expect(monthsBetween({ year: 2026, month: 3 }, { year: 2026, month: 1 })).toBe(-2);
  });

  it("is the inverse of addMonths", () => {
    const start = { year: 2026, month: 8 };
    for (const offset of [-30, -1, 0, 1, 17, 360]) {
      expect(monthsBetween(start, addMonths(start, offset))).toBe(offset);
    }
  });
});

describe("MONTHS_PER_YEAR and yearsToMonths", () => {
  it("has twelve months in a year", () => {
    expect(MONTHS_PER_YEAR).toBe(12);
  });

  it("converts whole years to months", () => {
    expect(yearsToMonths(0)).toBe(0);
    expect(yearsToMonths(1)).toBe(12);
    expect(yearsToMonths(30)).toBe(360);
  });
});
