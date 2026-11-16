import { ORE_PER_KRONA } from "../core/money";
import type { Ore } from "../core/types";
import { MONTHS_PER_YEAR, monthsBetween } from "../core/year-month";
import type { YearMonth } from "../core/year-month";
import { DEFAULT_HORIZON_YEARS, PLAN_LIMITS } from "../state/plan-document";
import { formatKronor, formatYearMonth } from "./format";
import { messages } from "./i18n";

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
 * Splits a typed amount into its whole part and its fraction. A separator followed by exactly three digits, in groups
 * ("1,500", "1.500.000", "1.500,00"), is a thousands separator, so "1,500" is fifteen hundred and not one and a half.
 */
function splitAmount(text: string): { readonly whole: string; readonly fraction: string } | null {
  const grouped = /^(\d{1,3}(?:[.,]\d{3})+)(?:[.,](\d*))?$/.exec(text);
  if (grouped) return { whole: (grouped[1] ?? "").replace(/[.,]/g, ""), fraction: grouped[2] ?? "" };
  const plain = /^(\d+)(?:[.,](\d*))?$/.exec(text);
  return plain ? { whole: plain[1] ?? "", fraction: plain[2] ?? "" } : null;
}

/**
 * Reads whole kronor typed by a person ("50 000", "3000 kr", "1 500,00") into öre. The conversion
 * works on the digits, never on a float. Fractions other than zero are rejected.
 */
export function parseKronor(text: string, maxOre: Ore): ParseResult<Ore> {
  // \u00a0 and \u202f are the no-break spaces that grouped numbers are written with.
  const cleaned = text.replace(/[\s\u00a0\u202f]/g, "").replace(/kr$/i, "");
  if (cleaned === "") return fail(messages.inputErrors.enterAmount);
  if (cleaned.startsWith("-")) return /^-\d/.test(cleaned) ? fail(messages.inputErrors.enterZeroOrMore) : fail(messages.inputErrors.enterNumber);

  const parts = splitAmount(cleaned);
  if (!parts) return fail(messages.inputErrors.enterNumber);
  const whole = parts.whole.replace(/^0+(?=\d)/, "");
  const { fraction } = parts;
  if (/[1-9]/.test(fraction)) return fail(messages.inputErrors.wholeKronor);

  const maxMessage = messages.inputErrors.amountMax(formatKronor(maxOre));
  if (whole.length > MAX_DIGITS) return fail(maxMessage);
  const ore = Number(whole) * ORE_PER_KRONA;
  return ore > maxOre ? fail(maxMessage) : { ok: true, value: ore };
}

/** A percent typed like "7", "6,5", "7 %" or "-1 %", within `min` to `max`. `notANumber` is the message for text that isn't one. */
function parsePercent(text: string, min: number, max: number, notANumber: string): ParseResult<number> {
  const cleaned = text.replace(/\s/g, "").replace(/%$/, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return fail(notANumber);
  const value = Number(cleaned) || 0; // turns -0 into 0
  if (value < min) return fail(messages.inputErrors.percentMin(min));
  if (value > max) return fail(messages.inputErrors.percentMax(max));
  return { ok: true, value };
}

/** Reads a yearly return like "7", "6,5" or "7 %". */
export function parseReturnPct(text: string): ParseResult<number> {
  return parsePercent(text, PLAN_LIMITS.minReturnPct, PLAN_LIMITS.maxReturnPct, messages.inputErrors.percentReturn);
}

/** Reads an end year typed in the Plan card and returns the horizon in whole years after `startYear`. */
export function parseEndYear(text: string, startYear: number): ParseResult<number> {
  const first = startYear + PLAN_LIMITS.minHorizonYears;
  const last = startYear + PLAN_LIMITS.maxHorizonYears;
  const cleaned = text.trim();
  if (!/^\d{4}$/.test(cleaned)) return fail(messages.inputErrors.enterYear(startYear + DEFAULT_HORIZON_YEARS));
  const year = Number(cleaned);
  if (year < first || year > last) return fail(messages.inputErrors.pickYear(first, last));
  return { ok: true, value: year - startYear };
}

/** Reads a yearly inflation like "2", "2,5" or "-1 %". */
export function parseInflationPct(text: string): ParseResult<number> {
  return parsePercent(text, PLAN_LIMITS.minInflationPct, PLAN_LIMITS.maxInflationPct, messages.inputErrors.percentInflation);
}

/** Reads "YYYY-MM", the value of <input type="month"> and the fallback text box. Events may reach `maxYear`. */
export function parseYearMonth(text: string, maxYear: number = PLAN_LIMITS.maxStartYear): ParseResult<YearMonth> {
  const match = /^(\d{4})-(\d{2})$/.exec(text.trim());
  if (!match) return fail(messages.inputErrors.monthFormat);
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > MONTHS_PER_YEAR) return fail(messages.inputErrors.monthRange);
  if (year < PLAN_LIMITS.minStartYear || year > maxYear) {
    return fail(messages.inputErrors.yearBetween(PLAN_LIMITS.minStartYear, maxYear));
  }
  return { ok: true, value: { year, month } };
}

/** The "YYYY-MM" string for a month input. */
export function monthInputValue(ym: YearMonth): string {
  return `${ym.year}-${String(ym.month).padStart(2, "0")}`;
}

/** Whole kronor above 0, up to `maxOre`: what a withdrawal, a one-time deposit and a goal all take. */
function parsePositiveKronor(text: string, maxOre: Ore): ParseResult<Ore> {
  const result = parseKronor(text, maxOre);
  return result.ok && result.value === 0 ? fail(messages.inputErrors.amountAboveZero) : result;
}

/** A withdrawal amount: whole kronor, above 0. */
export function parseWithdrawalAmount(text: string): ParseResult<Ore> {
  return parsePositiveKronor(text, PLAN_LIMITS.maxStartAmount);
}

/** A one-time deposit amount: whole kronor, above 0, up to the one-time deposit limit. */
export function parseOneTimeDepositAmount(text: string): ParseResult<Ore> {
  return parsePositiveKronor(text, PLAN_LIMITS.maxOneTimeDepositAmount);
}

/** A goal amount: whole kronor, above 0, up to the goal limit. */
export function parseGoalAmount(text: string): ParseResult<Ore> {
  return parsePositiveKronor(text, PLAN_LIMITS.maxGoalAmount);
}

/** A short name for an event. Empty text becomes `fallback`. */
export function parseLabel(text: string, fallback: string): ParseResult<string> {
  const label = text.trim();
  if (label === "") return { ok: true, value: fallback };
  if (label.length > PLAN_LIMITS.maxLabelLength) return fail(messages.inputErrors.labelLength(PLAN_LIMITS.maxLabelLength));
  return { ok: true, value: label };
}

/** A plan's name: up to `maxNameLength` characters, and empty is fine (the plan has no name). */
export function parsePlanName(text: string): ParseResult<string> {
  const name = text.trim();
  if (name.length > PLAN_LIMITS.maxNameLength) return fail(messages.inputErrors.nameLength(PLAN_LIMITS.maxNameLength));
  return { ok: true, value: name };
}

/** An event's month that is not before `start`. */
export function parseMonthOnOrAfter(text: string, start: YearMonth): ParseResult<YearMonth> {
  const result = parseYearMonth(text, PLAN_LIMITS.maxEventYear);
  if (!result.ok) return result;
  return monthsBetween(start, result.value) < 0 ? fail(messages.inputErrors.pickOrLater(formatYearMonth(start))) : result;
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
  return start !== null && monthsBetween(start, result.value) < 0 ? fail(messages.inputErrors.endBeforeStart) : result;
}
