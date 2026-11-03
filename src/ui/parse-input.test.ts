import { describe, expect, it } from "vitest";
import { PLAN_LIMITS } from "../state/plan-document";
import { monthInputValue, parseKronor, parseReturnPct, parseYearMonth } from "./parse-input";

const max = PLAN_LIMITS.maxStartAmount;

describe("parseKronor", () => {
  it.each([
    ["50000", 5_000_000],
    ["50 000", 5_000_000],
    ["50 000", 5_000_000],
    ["50 000 kr", 5_000_000],
    ["  3000KR ", 300_000],
    ["0", 0],
    ["1 500,00", 150_000],
    ["1500.0", 150_000],
    ["007", 700],
  ])("accepts %j", (text, ore) => {
    expect(parseKronor(text, max)).toEqual({ ok: true, value: ore });
  });

  it.each([
    ["", "Enter an amount"],
    ["   ", "Enter an amount"],
    ["abc", "Enter a number, for example 50 000"],
    ["12abc", "Enter a number, for example 50 000"],
    ["-5", "Enter 0 or more"],
    ["1 500,50", "Use whole kronor, for example 1 500"],
    ["1,2,3", "Enter a number, for example 50 000"],
  ])("rejects %j with a message", (text, message) => {
    expect(parseKronor(text, max)).toEqual({ ok: false, message });
  });

  it("accepts exactly the maximum and rejects one krona above", () => {
    expect(parseKronor("100 000 000", max)).toEqual({ ok: true, value: max });
    const over = parseKronor("100 000 001", max);
    expect(over.ok).toBe(false);
    // The number uses a non-breaking space so it never wraps in the message.
    if (!over.ok) expect(over.message.replace(/\u00a0/g, " ")).toBe("Use 100 000 000 kr or less");
  });

  it("rejects very long numbers without losing precision", () => {
    expect(parseKronor("9".repeat(30), max).ok).toBe(false);
  });
});

describe("parseReturnPct", () => {
  it.each([
    ["7", 7],
    ["6,5", 6.5],
    ["6.5", 6.5],
    ["7 %", 7],
    ["-20", -20],
    ["0", 0],
    ["-0", 0],
    ["-100", -100],
    ["50", 50],
  ])("accepts %j", (text, value) => {
    const result = parseReturnPct(text);
    expect(result).toEqual({ ok: true, value });
    if (result.ok) expect(Object.is(result.value, -0)).toBe(false);
  });

  it.each([
    ["", "Enter a percentage, for example 7 or 6,5"],
    ["abc", "Enter a percentage, for example 7 or 6,5"],
    ["7%%", "Enter a percentage, for example 7 or 6,5"],
    ["-101", "Use -100 % or more"],
    ["50,1", "Use 50 % or less"],
  ])("rejects %j with a message", (text, message) => {
    expect(parseReturnPct(text)).toEqual({ ok: false, message });
  });
});

describe("parseYearMonth", () => {
  it("accepts YYYY-MM", () => {
    expect(parseYearMonth("2026-01")).toEqual({ ok: true, value: { year: 2026, month: 1 } });
    expect(parseYearMonth(" 2031-12 ")).toEqual({ ok: true, value: { year: 2031, month: 12 } });
  });

  it.each([
    ["", "Use the format YYYY-MM, for example 2026-01"],
    ["2026", "Use the format YYYY-MM, for example 2026-01"],
    ["2026-1", "Use the format YYYY-MM, for example 2026-01"],
    ["jan 2026", "Use the format YYYY-MM, for example 2026-01"],
    ["2026-00", "The month must be between 01 and 12"],
    ["2026-13", "The month must be between 01 and 12"],
    ["1999-12", "Use a year between 2000 and 2100"],
    ["2101-01", "Use a year between 2000 and 2100"],
  ])("rejects %j with a message", (text, message) => {
    expect(parseYearMonth(text)).toEqual({ ok: false, message });
  });
});

describe("monthInputValue", () => {
  it("formats as YYYY-MM with a leading zero", () => {
    expect(monthInputValue({ year: 2026, month: 1 })).toBe("2026-01");
    expect(monthInputValue({ year: 2031, month: 12 })).toBe("2031-12");
  });
});
