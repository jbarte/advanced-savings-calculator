import { MONTHS_PER_YEAR, monthsBetween } from "../core/year-month";
import type { YearMonth } from "../core/year-month";
import { PLAN_LIMITS } from "./plan-document";
import type { DepositChangeDraft, GoalPlan, OneTimeDepositDraft, PlanDocument, PlanFields, WithdrawalDraft } from "./plan-document";
import { cleanText } from "./plan-text";
import { failWith } from "./plan-problem";
import type { AmountField, DateField, PlanEventKind } from "./plan-problem";

/*
 * Hand-written checks of everything a plan is built from. They throw a PlanError (a RangeError) that says what is
 * wrong, as a problem code for the user and as English text for developers, so a bad value can never reach the engine, whether it came from a form, a saved plan or a link. The form
 * parsers in src/ui/ give friendlier messages while typing, but this is the check that counts.
 */

function fail(message: string): never {
  return failWith({ code: "damaged" }, message);
}

function assertWholeOre(value: number, name: string, field: AmountField, min: number, max: number): void {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    failWith({ code: "amount", field, min, max }, `${name} must be a whole number of öre from ${min} to ${max}, got ${value}`);
  }
}

function assertYearMonth(date: YearMonth, name: string, field: DateField, maxYear: number = PLAN_LIMITS.maxStartYear): void {
  const problem = { code: "date", field, minYear: PLAN_LIMITS.minStartYear, maxYear } as const;
  if (!Number.isInteger(date.month) || date.month < 1 || date.month > MONTHS_PER_YEAR) {
    failWith(problem, `${name} must have a month from 1 to ${MONTHS_PER_YEAR}, got ${date.month}`);
  }
  if (!Number.isInteger(date.year) || date.year < PLAN_LIMITS.minStartYear || date.year > maxYear) {
    failWith(problem, `${name} must have a year from ${PLAN_LIMITS.minStartYear} to ${maxYear}, got ${date.year}`);
  }
}

/** Checks the plan's single values (start, amounts, return, horizon, inflation). Throws a PlanError for the first problem. */
export function validatePlanFields(fields: PlanFields): void {
  assertYearMonth(fields.start, "Start date", "startDate");
  assertWholeOre(fields.startAmount, "Start amount", "startAmount", 0, PLAN_LIMITS.maxStartAmount);
  assertWholeOre(fields.monthlyDeposit, "Monthly deposit", "monthlyDeposit", 0, PLAN_LIMITS.maxMonthlyDeposit);
  const { annualReturnPct } = fields;
  if (!Number.isFinite(annualReturnPct) || annualReturnPct < PLAN_LIMITS.minReturnPct || annualReturnPct > PLAN_LIMITS.maxReturnPct) {
    failWith(
      { code: "percent", field: "annualReturn", min: PLAN_LIMITS.minReturnPct, max: PLAN_LIMITS.maxReturnPct },
      `Expected return must be from ${PLAN_LIMITS.minReturnPct} % to ${PLAN_LIMITS.maxReturnPct} %, got ${annualReturnPct}`,
    );
  }
  const { horizonYears, inflationPct } = fields;
  if (!Number.isInteger(horizonYears) || horizonYears < PLAN_LIMITS.minHorizonYears || horizonYears > PLAN_LIMITS.maxHorizonYears) {
    failWith(
      { code: "horizon", min: PLAN_LIMITS.minHorizonYears, max: PLAN_LIMITS.maxHorizonYears },
      `The horizon must be ${PLAN_LIMITS.minHorizonYears} to ${PLAN_LIMITS.maxHorizonYears} whole years, got ${horizonYears}`,
    );
  }
  if (!Number.isFinite(inflationPct) || inflationPct < PLAN_LIMITS.minInflationPct || inflationPct > PLAN_LIMITS.maxInflationPct) {
    failWith(
      { code: "percent", field: "inflation", min: PLAN_LIMITS.minInflationPct, max: PLAN_LIMITS.maxInflationPct },
      `Inflation must be from ${PLAN_LIMITS.minInflationPct} % to ${PLAN_LIMITS.maxInflationPct} %, got ${inflationPct}`,
    );
  }
}

/** Checks a plan's name: none, or 1 to `maxNameLength` characters that are already clean (see `cleanText`). */
export function validatePlanName(name: string | null): void {
  if (name === null) return;
  if (name === "" || name.length > PLAN_LIMITS.maxNameLength || cleanText(name) !== name) {
    failWith({ code: "plan-name", max: PLAN_LIMITS.maxNameLength }, `The plan name must be 1 to ${PLAN_LIMITS.maxNameLength} characters`);
  }
}

/** Checks a withdrawal. Its amount is capped like the start amount, since it can't take out more than there is. */
export function validateWithdrawalDraft(draft: WithdrawalDraft): void {
  assertYearMonth(draft.date, "Withdrawal date", "withdrawalDate", PLAN_LIMITS.maxEventYear);
  assertWholeOre(draft.amount, "Withdrawal amount", "withdrawalAmount", 1, PLAN_LIMITS.maxStartAmount);
  assertLabel(draft.label, "Withdrawal", "withdrawal");
}

function assertLabel(label: string, name: string, kind: PlanEventKind): void {
  const trimmed = cleanText(label);
  if (trimmed === "" || trimmed.length > PLAN_LIMITS.maxLabelLength) {
    failWith({ code: "label", kind, max: PLAN_LIMITS.maxLabelLength }, `${name} label must be 1 to ${PLAN_LIMITS.maxLabelLength} characters`);
  }
}

/** Checks a deposit change, including that it doesn't end before it starts. */
export function validateDepositChangeDraft(draft: DepositChangeDraft): void {
  assertYearMonth(draft.startDate, "Deposit change start", "depositChangeStart", PLAN_LIMITS.maxEventYear);
  assertWholeOre(draft.amount, "Deposit change amount", "depositChangeAmount", 0, PLAN_LIMITS.maxMonthlyDeposit);
  assertLabel(draft.label, "Deposit change", "deposit-change");
  if (draft.endDate !== null) {
    assertYearMonth(draft.endDate, "Deposit change end", "depositChangeEnd", PLAN_LIMITS.maxEventYear);
    if (monthsBetween(draft.startDate, draft.endDate) < 0) failWith({ code: "end-before-start" }, "The end month can't be before the start month");
  }
}

/** Checks a one-time deposit against its own, smaller limits (see `PLAN_LIMITS`). */
export function validateOneTimeDepositDraft(draft: OneTimeDepositDraft): void {
  assertYearMonth(draft.date, "One-time deposit date", "oneTimeDepositDate", PLAN_LIMITS.maxEventYear);
  assertWholeOre(draft.amount, "One-time deposit amount", "oneTimeDepositAmount", 1, PLAN_LIMITS.maxOneTimeDepositAmount);
  assertLabel(draft.label, "One-time deposit", "one-time-deposit");
}

/** Checks a savings goal: an amount of at least 1 öre up to the limit, and a date in the allowed years. */
export function validateGoal(goal: GoalPlan): void {
  assertYearMonth(goal.date, "Goal date", "goalDate", PLAN_LIMITS.maxEventYear);
  assertWholeOre(goal.amount, "Goal amount", "goalAmount", 1, PLAN_LIMITS.maxGoalAmount);
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
  names: { readonly kind: PlanEventKind; readonly one: string; readonly many: string },
  validate: (event: T) => void,
): void {
  if (list.length > max) failWith({ code: "too-many", kind: names.kind, max }, `A plan can have at most ${max} ${names.many}`);
  assertUniqueIds(list.map((event) => event.id), names.one);
  list.forEach(validate);
}

/** Checks a whole plan, for example one read from a save or a link. Throws a PlanError for the first problem. */
export function validatePlanDocument(plan: PlanDocument): void {
  if (plan.version !== 4) fail(`Unknown plan version ${String(plan.version)}`);
  validatePlanName(plan.name);
  validatePlanFields(plan);
  assertEventList(plan.withdrawals, PLAN_LIMITS.maxWithdrawals, { kind: "withdrawal", one: "withdrawal", many: "withdrawals" }, validateWithdrawalDraft);
  assertEventList(
    plan.depositChanges,
    PLAN_LIMITS.maxDepositChanges,
    { kind: "deposit-change", one: "deposit change", many: "deposit changes" },
    validateDepositChangeDraft,
  );
  assertEventList(
    plan.oneTimeDeposits,
    PLAN_LIMITS.maxOneTimeDeposits,
    { kind: "one-time-deposit", one: "one-time deposit", many: "one-time deposits" },
    validateOneTimeDepositDraft,
  );
  if (plan.goal !== null) validateGoal(plan.goal);
}
