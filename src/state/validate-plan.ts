import { MONTHS_PER_YEAR } from "../core/year-month";
import type { YearMonth } from "../core/year-month";
import { PLAN_LIMITS } from "./plan-document";
import type { PlanDocument, PlanFields, WithdrawalDraft } from "./plan-document";

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

function assertYearMonth(date: YearMonth, name: string): void {
  if (!Number.isInteger(date.month) || date.month < 1 || date.month > MONTHS_PER_YEAR) {
    fail(`${name} must have a month from 1 to ${MONTHS_PER_YEAR}, got ${date.month}`);
  }
  if (!Number.isInteger(date.year) || date.year < PLAN_LIMITS.minStartYear || date.year > PLAN_LIMITS.maxStartYear) {
    fail(`${name} must have a year from ${PLAN_LIMITS.minStartYear} to ${PLAN_LIMITS.maxStartYear}, got ${date.year}`);
  }
}

export function validatePlanFields(fields: PlanFields): void {
  assertYearMonth(fields.start, "Start date");
  assertWholeOre(fields.startAmount, "Start amount", 0, PLAN_LIMITS.maxStartAmount);
  assertWholeOre(fields.monthlyDeposit, "Monthly deposit", 0, PLAN_LIMITS.maxMonthlyDeposit);
  const { annualReturnPct } = fields;
  if (!Number.isFinite(annualReturnPct) || annualReturnPct < PLAN_LIMITS.minReturnPct || annualReturnPct > PLAN_LIMITS.maxReturnPct) {
    fail(`Expected return must be from ${PLAN_LIMITS.minReturnPct} % to ${PLAN_LIMITS.maxReturnPct} %, got ${annualReturnPct}`);
  }
}

export function validateWithdrawalDraft(draft: WithdrawalDraft): void {
  assertYearMonth(draft.date, "Withdrawal date");
  assertWholeOre(draft.amount, "Withdrawal amount", 1, PLAN_LIMITS.maxStartAmount);
  const label = draft.label.trim();
  if (label === "" || label.length > PLAN_LIMITS.maxLabelLength) {
    fail(`Withdrawal label must be 1 to ${PLAN_LIMITS.maxLabelLength} characters`);
  }
}

export function validatePlanDocument(plan: PlanDocument): void {
  if (plan.version !== 1) fail(`Unknown plan version ${String(plan.version)}`);
  validatePlanFields(plan);
  if (plan.withdrawals.length > PLAN_LIMITS.maxWithdrawals) {
    fail(`A plan can have at most ${PLAN_LIMITS.maxWithdrawals} withdrawals`);
  }
  const seen = new Set<number>();
  for (const withdrawal of plan.withdrawals) {
    if (!Number.isInteger(withdrawal.id) || withdrawal.id < 1) fail(`Withdrawal id must be a positive whole number, got ${withdrawal.id}`);
    if (seen.has(withdrawal.id)) fail(`Two withdrawals have the id ${withdrawal.id}`);
    seen.add(withdrawal.id);
    validateWithdrawalDraft(withdrawal);
  }
}
