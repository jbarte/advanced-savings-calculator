/** A calendar month, e.g. { year: 2031, month: 4 } for April 2031. Month is 1–12. */
export interface YearMonth {
  readonly year: number;
  readonly month: number;
}

export const MONTHS_PER_YEAR = 12;

/** Whole years as a number of months. */
export function yearsToMonths(years: number): number {
  return years * MONTHS_PER_YEAR;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** Returns the year-month that lies `offset` months after `start`. */
export function addMonths(start: YearMonth, offset: number): YearMonth {
  const index = start.year * MONTHS_PER_YEAR + (start.month - 1) + offset;
  return { year: Math.floor(index / MONTHS_PER_YEAR), month: (index % MONTHS_PER_YEAR) + 1 };
}

/** Whole months from `from` to `to`. Negative when `to` is earlier. */
export function monthsBetween(from: YearMonth, to: YearMonth): number {
  return (to.year - from.year) * MONTHS_PER_YEAR + (to.month - from.month);
}

/** Formats a year-month as "Apr 2031". */
export function formatYearMonth(ym: YearMonth): string {
  return `${MONTH_NAMES[ym.month - 1]} ${ym.year}`;
}
