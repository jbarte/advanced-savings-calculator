import type { YearMonth } from "../core/year-month";
import type { Ore } from "../state/types";
import { messages } from "./i18n";

/** The parts of the interface text that decide how numbers, months and the currency are written. */
export interface FormatSettings {
  /** Locales for whole amounts, numbers with decimals, compact amounts ("1.7M") and month names. */
  readonly locale: { readonly numbers: string; readonly decimals: string; readonly compact: string; readonly dates: string };
  readonly currency: string;
}

/** A minus sign for a loss, a plus for a gain, nothing for 0. */
function signOf(amount: Ore): string {
  return amount > 0 ? "+" : amount < 0 ? "−" : "";
}

/**
 * The formatting functions for one language. They are made from settings, not read from `messages` directly, so a
 * test can format in a language other than the one in use. The ones used by the app are exported below.
 */
export function createFormatters({ locale, currency }: FormatSettings) {
  const fullFormat = new Intl.NumberFormat(locale.numbers, { maximumFractionDigits: 0 });
  const percentFormat = new Intl.NumberFormat(locale.decimals, { maximumFractionDigits: 2 });
  const compactFormat = new Intl.NumberFormat(locale.compact, { notation: "compact", maximumFractionDigits: 1 });
  // UTC on both sides, so the month never shifts with the user's time zone.
  const monthFormat = new Intl.DateTimeFormat(locale.dates, { month: "short", year: "numeric", timeZone: "UTC" });

  /** 171609335 öre → "1 716 093" (whole kronor, no unit) */
  const formatKronor = (amount: Ore): string => fullFormat.format(Math.round(amount / 100));

  /** 171609335 öre → "1 716 093 kr" */
  const formatMoney = (amount: Ore): string => `${formatKronor(amount)} ${currency}`;

  /** 171609335 öre → "1.7M kr" in English, "1,7 mn kr" in Swedish. */
  const formatMoneyCompact = (amount: Ore): string => `${compactFormat.format(amount / 100)} ${currency}`;

  /** −81411474 öre → "−814 115 kr", 54274305 → "+542 743 kr". For effects, where the sign is the point. */
  const formatSignedMoney = (amount: Ore): string => `${signOf(amount)}${formatMoney(Math.abs(amount))}`;

  /** −81411474 öre → "−814.1K kr", 54274305 → "+542.7K kr". */
  const formatSignedMoneyCompact = (amount: Ore): string => `${signOf(amount)}${formatMoneyCompact(Math.abs(amount))}`;

  /** 6.5 → "6.5" in English and "6,5" in Swedish, as it is shown in a field. At most two decimals. */
  const formatPercent = (value: number): string => percentFormat.format(value);

  /** { year: 2031, month: 4 } → "Apr 2031", with the month name in the language in use. */
  const formatYearMonth = (ym: YearMonth): string => monthFormat.format(Date.UTC(ym.year, ym.month - 1));

  return { formatKronor, formatMoney, formatMoneyCompact, formatSignedMoney, formatSignedMoneyCompact, formatPercent, formatYearMonth };
}

export const { formatKronor, formatMoney, formatMoneyCompact, formatSignedMoney, formatSignedMoneyCompact, formatPercent, formatYearMonth } =
  createFormatters({ locale: messages.locale, currency: messages.units.currency });
