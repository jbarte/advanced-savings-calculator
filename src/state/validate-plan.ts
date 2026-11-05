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
  assertLabel(draft.label, "Withdrawal");
}

function assertLabel(label: string, name: string): void {
  const trimmed = label.trim();
  if (trimmed === "" || trimmed.length > PLAN_LIMITS.maxLabelLength) {
    fail(`${name} label must be 1 to ${PLAN_LIMITS.maxLabelLength} characters`);
  }
}

export function validateDepositChangeDraft(draft: DepositChangeDraft): void {
  assertYearMonth(draft.startDate, "Deposit change start");
  assertWholeOre(draft.amount, "Deposit change amount", 0, PLAN_LIMITS.maxMonthlyDeposit);
  assertLabel(draft.label, "Deposit change");
  if (draft.endDate !== null) {
    assertYearMonth(draft.endDate, "Deposit change end");
    if (monthsBetween(draft.startDate, draft.endDate) < 0) fail("The end month can't be before the start month");
  }
}

export function validateOneTimeDepositDraft(draft: OneTimeDepositDraft): void {
  assertYearMonth(draft.date, "One-time deposit date");
  assertWholeOre(draft.amount, "One-time deposit amount", 1, PLAN_LIMITS.maxOneTimeDepositAmount);
  assertLabel(draft.label, "One-time deposit");
}

function assertUniqueIds(ids: readonly number[], what: string): void {
  const seen = new Set<number>();
  for (const id of ids) {
    if (!Number.isInteger(id) || id < 1) fail(`A ${what} id must be a positive whole number, got ${id}`);
    if (seen.has(id)) fail(`Two ${what}s have the id ${id}`);
    seen.add(id);
  }
}

export function validatePlanDocument(plan: PlanDocument): void {
  if (plan.version !== 1) fail(`Unknown plan version ${String(plan.version)}`);
  validatePlanFields(plan);
  if (plan.withdrawals.length > PLAN_LIMITS.maxWithdrawals) {
    fail(`A plan can have at most ${PLAN_LIMITS.maxWithdrawals} withdrawals`);
  }
  assertUniqueIds(plan.withdrawals.map((withdrawal) => withdrawal.id), "withdrawal");
  plan.withdrawals.forEach(validateWithdrawalDraft);

  if (plan.depositChanges.length > PLAN_LIMITS.maxDepositChanges) {
    fail(`A plan can have at most ${PLAN_LIMITS.maxDepositChanges} deposit changes`);
  }
  assertUniqueIds(plan.depositChanges.map((change) => change.id), "deposit change");
  plan.depositChanges.forEach(validateDepositChangeDraft);

  if (plan.oneTimeDeposits.length > PLAN_LIMITS.maxOneTimeDeposits) {
    fail(`A plan can have at most ${PLAN_LIMITS.maxOneTimeDeposits} one-time deposits`);
  }
  assertUniqueIds(plan.oneTimeDeposits.map((deposit) => deposit.id), "one-time deposit");
  plan.oneTimeDeposits.forEach(validateOneTimeDepositDraft);
}
