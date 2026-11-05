import { describe, expect, it } from "vitest";
import { PLAN_LIMITS } from "../state/plan-document";
import {
  errorMessage,
  monthInputValue,
  parseDepositAmount,
  parseKronor,
  parseLabel,
  parseMonthOnOrAfter,
  parseOptionalMonthNotBefore,
  parseReturnPct,
  parseOneTimeDepositAmount,
  parseWithdrawalAmount,
  parseYearMonth,
} from "./parse-input";

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

describe("parseWithdrawalAmount", () => {
  it("accepts whole kronor above 0", () => {
    expect(parseWithdrawalAmount("150 000")).toEqual({ ok: true, value: 15_000_000 });
    expect(parseWithdrawalAmount("1")).toEqual({ ok: true, value: 100 });
  });

  it("rejects 0 and the usual bad input", () => {
    expect(parseWithdrawalAmount("0")).toEqual({ ok: false, message: "Enter an amount above 0" });
    expect(parseWithdrawalAmount("")).toEqual({ ok: false, message: "Enter an amount" });
    expect(parseWithdrawalAmount("-5")).toEqual({ ok: false, message: "Enter 0 or more" });
    expect(parseWithdrawalAmount("abc").ok).toBe(false);
  });
});

describe("parseLabel", () => {
  it("trims the text", () => {
    expect(parseLabel("  New car ")).toEqual({ ok: true, value: "New car" });
  });

  it("falls back to a default when empty", () => {
    expect(parseLabel("")).toEqual({ ok: true, value: "Withdrawal" });
    expect(parseLabel("   ")).toEqual({ ok: true, value: "Withdrawal" });
  });

  it("accepts exactly 40 characters and rejects 41", () => {
    expect(parseLabel("x".repeat(40))).toEqual({ ok: true, value: "x".repeat(40) });
    expect(parseLabel("x".repeat(41))).toEqual({ ok: false, message: "Use 40 characters or fewer" });
  });
});

describe("parseMonthOnOrAfter", () => {
  const start = { year: 2026, month: 6 };

  it("accepts the start month and later", () => {
    expect(parseMonthOnOrAfter("2026-06", start)).toEqual({ ok: true, value: { year: 2026, month: 6 } });
    expect(parseMonthOnOrAfter("2031-01", start)).toEqual({ ok: true, value: { year: 2031, month: 1 } });
  });

  it("rejects an earlier month and names the start", () => {
    expect(parseMonthOnOrAfter("2026-05", start)).toEqual({ ok: false, message: "Pick Jun 2026 or later" });
  });

  it("passes on the format errors from parseYearMonth", () => {
    expect(parseMonthOnOrAfter("soon", start)).toEqual({ ok: false, message: "Use the format YYYY-MM, for example 2026-01" });
  });
});

describe("errorMessage", () => {
  it("is null for valid text", () => {
    expect(errorMessage((text) => parseKronor(text, max))("50 000")).toBeNull();
  });

  it("is the parser's message for invalid text", () => {
    expect(errorMessage((text) => parseKronor(text, max))("abc")).toBe("Enter a number, for example 50 000");
    expect(errorMessage(parseReturnPct)("-101")).toBe("Use -100 % or more");
  });
});

describe("parseDepositAmount", () => {
  it("accepts whole kronor including 0, which pauses saving", () => {
    expect(parseDepositAmount("0")).toEqual({ ok: true, value: 0 });
    expect(parseDepositAmount("5 000")).toEqual({ ok: true, value: 500_000 });
  });

  it("rejects negative amounts, text, and anything above the monthly limit", () => {
    expect(parseDepositAmount("-1")).toEqual({ ok: false, message: "Enter 0 or more" });
    expect(parseDepositAmount("abc").ok).toBe(false);
    expect(parseDepositAmount("10 000 000")).toEqual({ ok: true, value: 1_000_000_000 });
    const over = parseDepositAmount("10 000 001");
    expect(over.ok).toBe(false);
    if (!over.ok) expect(over.message.replace(/\u00a0/g, " ")).toBe("Use 10 000 000 kr or less");
  });
});

describe("parseOptionalMonthNotBefore", () => {
  const start = { year: 2027, month: 2 };

  it("accepts empty text as no end", () => {
    expect(parseOptionalMonthNotBefore("", start)).toEqual({ ok: true, value: null });
    expect(parseOptionalMonthNotBefore("   ", start)).toEqual({ ok: true, value: null });
  });

  it("accepts the start month and later", () => {
    expect(parseOptionalMonthNotBefore("2027-02", start)).toEqual({ ok: true, value: { year: 2027, month: 2 } });
    expect(parseOptionalMonthNotBefore("2028-01", start)).toEqual({ ok: true, value: { year: 2028, month: 1 } });
  });

  it("rejects an end before the start", () => {
    expect(parseOptionalMonthNotBefore("2027-01", start)).toEqual({ ok: false, message: "The end month can't be before the start month" });
  });

  it("does not compare when the start is not known yet", () => {
    expect(parseOptionalMonthNotBefore("2020-01", null)).toEqual({ ok: true, value: { year: 2020, month: 1 } });
  });

  it("passes on format errors", () => {
    expect(parseOptionalMonthNotBefore("later", start)).toEqual({ ok: false, message: "Use the format YYYY-MM, for example 2026-01" });
  });
});

describe("parseLabel with a fallback", () => {
  it("uses the given fallback for empty text", () => {
    expect(parseLabel("", "Deposit change")).toEqual({ ok: true, value: "Deposit change" });
    expect(parseLabel("Raise", "Deposit change")).toEqual({ ok: true, value: "Raise" });
  });
});

describe("parseOneTimeDepositAmount", () => {
  it("accepts whole kronor from 1 up to the limit", () => {
    expect(parseOneTimeDepositAmount("100 000")).toEqual({ ok: true, value: 10_000_000 });
    expect(parseOneTimeDepositAmount("5 000 000")).toEqual({ ok: true, value: 500_000_000 });
  });

  it("rejects 0, more than the limit, and text", () => {
    expect(parseOneTimeDepositAmount("0")).toEqual({ ok: false, message: "Enter an amount above 0" });
    expect(parseOneTimeDepositAmount("5 000 001").ok).toBe(false);
    expect(parseOneTimeDepositAmount("abc").ok).toBe(false);
  });
});
