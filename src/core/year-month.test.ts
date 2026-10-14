import { describe, expect, it } from "vitest";
import { addMonths, formatYearMonth } from "./year-month";

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
