import type { Ore } from "../core/types";
import { MONTHS_PER_YEAR, monthsBetween } from "../core/year-month";
import type { YearMonth } from "../core/year-month";
import { PLAN_LIMITS } from "../state/plan-document";
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
 * Reads whole kronor typed by a person ("50 000", "3000 kr", "1 500,00") into öre. The conversion
 * works on the digits, never on a float. Fractions other than zero are rejected.
 */
export function parseKronor(text: string, maxOre: Ore): ParseResult<Ore> {
  const cleaned = text.replace(/[\s  ]/g, "").replace(/kr$/i, "");
  if (cleaned === "") return fail(messages.inputErrors.enterAmount);
  if (cleaned.startsWith("-")) return /^-\d/.test(cleaned) ? fail(messages.inputErrors.enterZeroOrMore) : fail(messages.inputErrors.enterNumber);

  const match = /^(\d+)(?:[.,](\d*))?$/.exec(cleaned);
  if (!match) return fail(messages.inputErrors.enterNumber);
  const whole = (match[1] ?? "").replace(/^0+(?=\d)/, "");
  const fraction = match[2] ?? "";
  if (/[1-9]/.test(fraction)) return fail(messages.inputErrors.wholeKronor);

  const maxMessage = messages.inputErrors.amountMax(formatKronor(maxOre));
  if (whole.length > MAX_DIGITS) return fail(maxMessage);
  const ore = Number(whole) * 100;
  return ore > maxOre ? fail(maxMessage) : { ok: true, value: ore };
}

/** Reads a yearly return like "7", "6,5" or "7 %". */
export function parseReturnPct(text: string): ParseResult<number> {
  const cleaned = text.replace(/\s/g, "").replace(/%$/, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return fail(messages.inputErrors.percentReturn);
  const value = Number(cleaned) || 0; // turns -0 into 0
  if (value < PLAN_LIMITS.minReturnPct) return fail(messages.inputErrors.percentMin(PLAN_LIMITS.minReturnPct));
  if (value > PLAN_LIMITS.maxReturnPct) return fail(messages.inputErrors.percentMax(PLAN_LIMITS.maxReturnPct));
  return { ok: true, value };
}

/** Reads an end year typed in the Plan card and returns the horizon in whole years after `startYear`. */
export function parseEndYear(text: string, startYear: number): ParseResult<number> {
  const first = startYear + PLAN_LIMITS.minHorizonYears;
  const last = startYear + PLAN_LIMITS.maxHorizonYears;
  const cleaned = text.trim();
  if (!/^\d{4}$/.test(cleaned)) return fail(messages.inputErrors.enterYear(startYear + 30));
  const year = Number(cleaned);
  if (year < first || year > last) return fail(messages.inputErrors.pickYear(first, last));
  return { ok: true, value: year - startYear };
}

/** Reads a yearly inflation like "2", "2,5" or "-1 %". */
export function parseInflationPct(text: string): ParseResult<number> {
  const cleaned = text.replace(/\s/g, "").replace(/%$/, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return fail(messages.inputErrors.percentInflation);
  const value = Number(cleaned) || 0; // turns -0 into 0
  if (value < PLAN_LIMITS.minInflationPct) return fail(messages.inputErrors.percentMin(PLAN_LIMITS.minInflationPct));
  if (value > PLAN_LIMITS.maxInflationPct) return fail(messages.inputErrors.percentMax(PLAN_LIMITS.maxInflationPct));
  return { ok: true, value };
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

/** A withdrawal amount: whole kronor, above 0. */
export function parseWithdrawalAmount(text: string): ParseResult<Ore> {
  const result = parseKronor(text, PLAN_LIMITS.maxStartAmount);
  return result.ok && result.value === 0 ? fail(messages.inputErrors.amountAboveZero) : result;
}

/** A one-time deposit amount: whole kronor, above 0, up to the one-time deposit limit. */
export function parseOneTimeDepositAmount(text: string): ParseResult<Ore> {
  const result = parseKronor(text, PLAN_LIMITS.maxOneTimeDepositAmount);
  return result.ok && result.value === 0 ? fail(messages.inputErrors.amountAboveZero) : result;
}

/** A goal amount: whole kronor, above 0, up to the goal limit. */
export function parseGoalAmount(text: string): ParseResult<Ore> {
  const result = parseKronor(text, PLAN_LIMITS.maxGoalAmount);
  return result.ok && result.value === 0 ? fail(messages.inputErrors.amountAboveZero) : result;
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
