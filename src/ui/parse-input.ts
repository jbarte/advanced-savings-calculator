import type { Ore } from "../core/types";
import { MONTHS_PER_YEAR, formatYearMonth, monthsBetween } from "../core/year-month";
import type { YearMonth } from "../core/year-month";
import { PLAN_LIMITS } from "../state/plan-document";
import { formatKronor } from "./format";

export type ParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly message: string };

/** Turns a parser into what a text field wants: an error message, or null when the text is valid. */
export function errorMessage<T>(parse: (text: string) => ParseResult<T>): (text: string) => string | null {
  return (text) => {
    const result = parse(text);
    return result.ok ? null : result.message;
  };
}

const fail = (message: string): { ok: false; message: string } => ({ ok: false, message });

/** Longest whole-kronor number we look at, so Number() never loses precision. */
const MAX_DIGITS = 12;

/**
 * Reads whole kronor typed by a person ("50 000", "3000 kr", "1 500,00") into öre. The conversion
 * works on the digits, never on a float. Fractions other than zero are rejected.
 */
export function parseKronor(text: string, maxOre: Ore): ParseResult<Ore> {
  const cleaned = text.replace(/[\s  ]/g, "").replace(/kr$/i, "");
  if (cleaned === "") return fail("Enter an amount");
  if (cleaned.startsWith("-")) return /^-\d/.test(cleaned) ? fail("Enter 0 or more") : fail("Enter a number, for example 50 000");

  const match = /^(\d+)(?:[.,](\d*))?$/.exec(cleaned);
  if (!match) return fail("Enter a number, for example 50 000");
  const whole = (match[1] ?? "").replace(/^0+(?=\d)/, "");
  const fraction = match[2] ?? "";
  if (/[1-9]/.test(fraction)) return fail("Use whole kronor, for example 1 500");

  const maxMessage = `Use ${formatKronor(maxOre)} kr or less`;
  if (whole.length > MAX_DIGITS) return fail(maxMessage);
  const ore = Number(whole) * 100;
  return ore > maxOre ? fail(maxMessage) : { ok: true, value: ore };
}

/** Reads a yearly return like "7", "6,5" or "7 %". */
export function parseReturnPct(text: string): ParseResult<number> {
  const cleaned = text.replace(/\s/g, "").replace(/%$/, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return fail("Enter a percentage, for example 7 or 6,5");
  const value = Number(cleaned) || 0; // turns -0 into 0
  if (value < PLAN_LIMITS.minReturnPct) return fail(`Use ${PLAN_LIMITS.minReturnPct} % or more`);
  if (value > PLAN_LIMITS.maxReturnPct) return fail(`Use ${PLAN_LIMITS.maxReturnPct} % or less`);
  return { ok: true, value };
}

/** Reads "YYYY-MM", the value of <input type="month"> and the fallback text box. Events may reach `maxYear`. */
export function parseYearMonth(text: string, maxYear: number = PLAN_LIMITS.maxStartYear): ParseResult<YearMonth> {
  const match = /^(\d{4})-(\d{2})$/.exec(text.trim());
  if (!match) return fail("Use the format YYYY-MM, for example 2026-01");
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > MONTHS_PER_YEAR) return fail("The month must be between 01 and 12");
  if (year < PLAN_LIMITS.minStartYear || year > maxYear) {
    return fail(`Use a year between ${PLAN_LIMITS.minStartYear} and ${maxYear}`);
  }
  return { ok: true, value: { year, month } };
}

/** The "YYYY-MM" string for a month input. */
export function monthInputValue(ym: YearMonth): string {
  return `${ym.year}-${String(ym.month).padStart(2, "0")}`;
}

/** A withdrawal amount: whole kronor, above 0. */
export function parseWithdrawalAmount(text: string): ParseResult<Ore> {
  const result = parseKronor(text, PLAN_LIMITS.maxStartAmount);
  return result.ok && result.value === 0 ? fail("Enter an amount above 0") : result;
}

/** A one-time deposit amount: whole kronor, above 0, up to the one-time deposit limit. */
export function parseOneTimeDepositAmount(text: string): ParseResult<Ore> {
  const result = parseKronor(text, PLAN_LIMITS.maxOneTimeDepositAmount);
  return result.ok && result.value === 0 ? fail("Enter an amount above 0") : result;
}

/** A short name for an event. Empty text becomes `fallback`. */
export function parseLabel(text: string, fallback = "Withdrawal"): ParseResult<string> {
  const label = text.trim();
  if (label === "") return { ok: true, value: fallback };
  if (label.length > PLAN_LIMITS.maxLabelLength) return fail(`Use ${PLAN_LIMITS.maxLabelLength} characters or fewer`);
  return { ok: true, value: label };
}

/** An event's month that is not before `start`. */
export function parseMonthOnOrAfter(text: string, start: YearMonth): ParseResult<YearMonth> {
  const result = parseYearMonth(text, PLAN_LIMITS.maxEventYear);
  if (!result.ok) return result;
  return monthsBetween(start, result.value) < 0 ? fail(`Pick ${formatYearMonth(start)} or later`) : result;
}

/** A monthly deposit: whole kronor from 0 (which pauses saving) up to the monthly limit. */
export function parseDepositAmount(text: string): ParseResult<Ore> {
  return parseKronor(text, PLAN_LIMITS.maxMonthlyDeposit);
}

/** An optional end month: empty means no end. Not before `start` when the start is known. */
export function parseOptionalMonthNotBefore(text: string, start: YearMonth | null): ParseResult<YearMonth | null> {
  if (text.trim() === "") return { ok: true, value: null };
  const result = parseYearMonth(text, PLAN_LIMITS.maxEventYear);
  if (!result.ok) return result;
  return start !== null && monthsBetween(start, result.value) < 0 ? fail("The end month can't be before the start month") : result;
}
