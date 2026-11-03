import type { YearMonth } from "../core/year-month";

/** The current month. The only place in the app that reads the clock. */
export function currentYearMonth(): YearMonth {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}
