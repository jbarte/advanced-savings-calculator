import { MONTHS_PER_YEAR, addMonths } from "../core/year-month";
import type { YearMonth } from "../core/year-month";
import type { Metric, Ore, ScenarioView } from "./types";

/*
 * What the Compare card shows: one line per plan, and a row of end figures per plan. Plans can start at different
 * months and look different distances ahead, so the lines share a calendar axis, and each plan is compared at the
 * end of its own horizon (the table says when that is).
 */

/** A month as a count from the year 0, so months of different plans can be put on one axis. */
export function monthIndex(date: YearMonth): number {
  return date.year * MONTHS_PER_YEAR + date.month - 1;
}

/** The year and month for a `monthIndex`. */
export function yearMonthOf(index: number): YearMonth {
  return addMonths({ year: 0, month: 1 }, index);
}

/** One plan's line: its values from its start month through its horizon. */
export interface ComparisonLine {
  readonly id: string;
  readonly name: string;
  /** The `monthIndex` of the first value. */
  readonly firstMonth: number;
  readonly values: readonly Ore[];
}

/** One plan's end figures, with how its balance differs from the open plan's. */
export interface ComparisonRow {
  readonly id: string;
  readonly name: string;
  readonly open: boolean;
  /** The month the figures are for: the end of the plan's own horizon. */
  readonly endDate: YearMonth;
  readonly balance: Ore;
  readonly deposited: Ore;
  readonly growth: Ore;
  readonly withdrawn: Ore;
  /** This plan's balance minus the open plan's. 0 for the open plan itself. */
  readonly difference: Ore;
}

export interface Comparison {
  readonly metric: Metric;
  readonly lines: readonly ComparisonLine[];
  readonly rows: readonly ComparisonRow[];
  /** The months the chart spans, as `monthIndex`: from the earliest start to the latest end. */
  readonly firstMonth: number;
  readonly lastMonth: number;
}

function lineOf(view: ScenarioView, metric: Metric): ComparisonLine {
  const values = view.points.filter((point) => point.month <= view.horizonMonths).map((point) => point[metric]);
  return { id: view.id, name: view.name, firstMonth: monthIndex(view.start), values };
}

/** The value of a line in a month (a `monthIndex`), or null when the plan doesn't cover that month. */
export function valueAtMonth(line: ComparisonLine, month: number): Ore | null {
  return line.values[month - line.firstMonth] ?? null;
}

/**
 * Builds the comparison of the given plans for the chart's metric. `openId` is the id of the open plan, which the
 * differences are measured from.
 */
export function buildComparison(views: readonly ScenarioView[], openId: string, metric: Metric): Comparison {
  const lines = views.map((view) => lineOf(view, metric));
  const ends = views.map((view) => view.points.find((point) => point.month === view.horizonMonths));
  const openIndex = views.findIndex((view) => view.id === openId);
  const openBalance = ends[openIndex]?.balance ?? 0;

  const rows = views.flatMap((view, i): ComparisonRow[] => {
    const end = ends[i];
    if (!end) return [];
    return [
      {
        id: view.id,
        name: view.name,
        open: view.id === openId,
        endDate: addMonths(view.start, view.horizonMonths),
        balance: end.balance,
        deposited: end.deposited,
        growth: end.growth,
        withdrawn: end.withdrawn,
        difference: view.id === openId ? 0 : end.balance - openBalance,
      },
    ];
  });

  const firsts = lines.map((line) => line.firstMonth);
  const lasts = lines.map((line) => line.firstMonth + line.values.length - 1);
  return { metric, lines, rows, firstMonth: Math.min(...firsts), lastMonth: Math.max(...lasts) };
}
