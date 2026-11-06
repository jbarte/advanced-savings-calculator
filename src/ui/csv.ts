import type { YearMonth } from "../core/year-month";
import type { Ore } from "../state/types";

/** One row of the yearly figures: the month, and the four amounts in öre. */
export interface FigureRow {
  readonly date: YearMonth;
  readonly balance: Ore;
  readonly deposited: Ore;
  readonly growth: Ore;
  readonly withdrawn: Ore;
}

/** A cell, quoted when it holds the separator, a quote or a line break, as CSV needs. */
function cell(value: string, separator: string): string {
  return value.includes(separator) || /["\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** "2031-04": a month a spreadsheet reads as a date in every language. */
function isoMonth({ year, month }: YearMonth): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Whole kronor with no grouping or unit, so a spreadsheet reads the cell as a number. */
function kronor(amount: Ore): string {
  return String(Math.round(amount / 100));
}

/**
 * The yearly figures as CSV text: a header row, then one row a year. It starts with a byte-order mark so Excel reads
 * "å", "ä" and "ö" right, and uses the separator the language's spreadsheets expect (a comma in English, a semicolon in
 * Swedish, where the comma is the decimal sign).
 */
export function figuresCsv(headers: readonly string[], rows: readonly FigureRow[], separator: string): string {
  const line = (cells: readonly string[]): string => cells.map((value) => cell(value, separator)).join(separator);
  const body = rows.map((row) => line([isoMonth(row.date), kronor(row.balance), kronor(row.deposited), kronor(row.growth), kronor(row.withdrawn)]));
  return `﻿${[line(headers), ...body].join("\r\n")}\r\n`;
}

/**
 * A file name from a plan's name: "Anna's house 2031" → "life-ledger-annas-house-2031". Letters with accents lose them
 * (å → a, é → e), anything else becomes a dash, and an empty result falls back to "plan".
 */
export function fileBaseName(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return `life-ledger-${slug === "" ? "plan" : slug}`;
}
