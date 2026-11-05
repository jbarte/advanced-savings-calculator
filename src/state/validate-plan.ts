import { MONTHS_PER_YEAR, monthsBetween } from "../core/year-month";
import type { YearMonth } from "../core/year-month";
import { PLAN_LIMITS } from "./plan-document";
import type { DepositChangeDraft, OneTimeDepositDraft, PlanDocument, PlanFields, WithdrawalDraft } from "./plan-document";

/*
 * Hand-written checks of everything a plan is built from. They throw a RangeError that says what is wrong,
 * so a bad value can never reach the engine, whether it came from a form, a saved plan or a link. The form
 * parsers in src/ui/ give friendlier messages while typing, but this is the check that counts.
 */

function fail(message: string): never {
  throw new RangeError(message);
}

function assertWholeOre(value: number, name: string, min: number, max: number): void {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    fail(`${name} must be a whole number of öre from ${min} to ${max}, got ${value}`);
  }
}

function assertYearMonth(date: YearMonth, name: string, maxYear: number = PLAN_LIMITS.maxStartYear): void {
  if (!Number.isInteger(date.month) || date.month < 1 || date.month > MONTHS_PER_YEAR) {
    fail(`${name} must have a month from 1 to ${MONTHS_PER_YEAR}, got ${date.month}`);
  }
  if (!Number.isInteger(date.year) || date.year < PLAN_LIMITS.minStartYear || date.year > maxYear) {
    fail(`${name} must have a year from ${PLAN_LIMITS.minStartYear} to ${maxYear}, got ${date.year}`);
  }
}

/** Checks the plan's single values (start, amounts, return, horizon, inflation). Throws a RangeError for the first problem. */
export function validatePlanFields(fields: PlanFields): void {
  assertYearMonth(fields.start, "Start date");
  assertWholeOre(fields.startAmount, "Start amount", 0, PLAN_LIMITS.maxStartAmount);
  assertWholeOre(fields.monthlyDeposit, "Monthly deposit", 0, PLAN_LIMITS.maxMonthlyDeposit);
  const { annualReturnPct } = fields;
  if (!Number.isFinite(annualReturnPct) || annualReturnPct < PLAN_LIMITS.minReturnPct || annualReturnPct > PLAN_LIMITS.maxReturnPct) {
    fail(`Expected return must be from ${PLAN_LIMITS.minReturnPct} % to ${PLAN_LIMITS.maxReturnPct} %, got ${annualReturnPct}`);
  }
  const { horizonYears, inflationPct } = fields;
  if (!Number.isInteger(horizonYears) || horizonYears < PLAN_LIMITS.minHorizonYears || horizonYears > PLAN_LIMITS.maxHorizonYears) {
    fail(`The horizon must be ${PLAN_LIMITS.minHorizonYears} to ${PLAN_LIMITS.maxHorizonYears} whole years, got ${horizonYears}`);
  }
  if (!Number.isFinite(inflationPct) || inflationPct < PLAN_LIMITS.minInflationPct || inflationPct > PLAN_LIMITS.maxInflationPct) {
    fail(`Inflation must be from ${PLAN_LIMITS.minInflationPct} % to ${PLAN_LIMITS.maxInflationPct} %, got ${inflationPct}`);
  }
}

/** Checks a withdrawal. Its amount is capped like the start amount, since it can't take out more than there is. */
export function validateWithdrawalDraft(draft: WithdrawalDraft): void {
  assertYearMonth(draft.date, "Withdrawal date", PLAN_LIMITS.maxEventYear);
  assertWholeOre(draft.amount, "Withdrawal amount", 1, PLAN_LIMITS.maxStartAmount);
  assertLabel(draft.label, "Withdrawal");
}

function assertLabel(label: string, name: string): void {
  const trimmed = label.trim();
  if (trimmed === "" || trimmed.length > PLAN_LIMITS.maxLabelLength) {
    fail(`${name} label must be 1 to ${PLAN_LIMITS.maxLabelLength} characters`);
  }
}

/** Checks a deposit change, including that it doesn't end before it starts. */
export function validateDepositChangeDraft(draft: DepositChangeDraft): void {
  assertYearMonth(draft.startDate, "Deposit change start", PLAN_LIMITS.maxEventYear);
  assertWholeOre(draft.amount, "Deposit change amount", 0, PLAN_LIMITS.maxMonthlyDeposit);
  assertLabel(draft.label, "Deposit change");
  if (draft.endDate !== null) {
    assertYearMonth(draft.endDate, "Deposit change end", PLAN_LIMITS.maxEventYear);
    if (monthsBetween(draft.startDate, draft.endDate) < 0) fail("The end month can't be before the start month");
  }
}

/** Checks a one-time deposit against its own, smaller limits (see `PLAN_LIMITS`). */
export function validateOneTimeDepositDraft(draft: OneTimeDepositDraft): void {
  assertYearMonth(draft.date, "One-time deposit date", PLAN_LIMITS.maxEventYear);
  assertWholeOre(draft.amount, "One-time deposit amount", 1, PLAN_LIMITS.maxOneTimeDepositAmount);
  assertLabel(draft.label, "One-time deposit");
}

function assertUniqueIds(ids: readonly number[], what: string): void {
  const seen = new Set<number>();
  for (const id of ids) {
    // Below the largest safe integer, so the next id (one above the highest) is still exact and unique.
    if (!Number.isSafeInteger(id) || id < 1 || id >= Number.MAX_SAFE_INTEGER) {
      fail(`A ${what} id must be a positive whole number, got ${id}`);
    }
    if (seen.has(id)) fail(`Two ${what}s have the id ${id}`);
    seen.add(id);
  }
}

/** Checks one event list of a whole document: its length, its ids and every event in it. */
function assertEventList<T extends { readonly id: number }>(
  list: readonly T[],
  max: number,
  names: { readonly one: string; readonly many: string },
  validate: (event: T) => void,
): void {
  if (list.length > max) fail(`A plan can have at most ${max} ${names.many}`);
  assertUniqueIds(list.map((event) => event.id), names.one);
  list.forEach(validate);
}

/** Checks a whole plan, for example one read from a save or a link. Throws a RangeError for the first problem. */
export function validatePlanDocument(plan: PlanDocument): void {
  if (plan.version !== 2) fail(`Unknown plan version ${String(plan.version)}`);
  validatePlanFields(plan);
  assertEventList(plan.withdrawals, PLAN_LIMITS.maxWithdrawals, { one: "withdrawal", many: "withdrawals" }, validateWithdrawalDraft);
  assertEventList(
    plan.depositChanges,
    PLAN_LIMITS.maxDepositChanges,
    { one: "deposit change", many: "deposit changes" },
    validateDepositChangeDraft,
  );
  assertEventList(
    plan.oneTimeDeposits,
    PLAN_LIMITS.maxOneTimeDeposits,
    { one: "one-time deposit", many: "one-time deposits" },
    validateOneTimeDepositDraft,
  );
}
