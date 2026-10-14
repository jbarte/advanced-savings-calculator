/** A calendar month, e.g. { year: 2031, month: 4 } for April 2031. Month is 1–12. */
export interface YearMonth {
  readonly year: number;
  readonly month: number;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** Returns the year-month that lies `offset` months after `start`. */
export function addMonths(start: YearMonth, offset: number): YearMonth {
  const index = start.year * 12 + (start.month - 1) + offset;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** Formats a year-month as "Apr 2031". */
export function formatYearMonth(ym: YearMonth): string {
  return `${MONTH_NAMES[ym.month - 1]} ${ym.year}`;
}
