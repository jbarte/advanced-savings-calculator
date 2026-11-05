import type { YearMonth } from "../core/year-month";
import { DEFAULT_HORIZON_YEARS, DEFAULT_INFLATION_PCT, PLAN_LIMITS } from "./plan-document";
import type { DepositChangeEvent, GoalPlan, OneTimeDepositEvent, PlanDocument, WithdrawalEvent } from "./plan-document";
import { validatePlanDocument } from "./validate-plan";

/*
 * Turns untrusted data (a saved plan now, a shared link later) into a PlanDocument. It checks the shape field
 * by field and copies only the fields it knows, then runs the same value check as every other plan. Anything
 * wrong throws a RangeError that says what, so the caller can fall back to a safe plan.
 */

type Raw = Readonly<Record<string, unknown>>;

function fail(message: string): never {
  throw new RangeError(message);
}

function isRaw(value: unknown): value is Raw {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function raw(value: unknown, what: string): Raw {
  return isRaw(value) ? value : fail(`${what} is not an object`);
}

function numberField(from: Raw, key: string, what: string): number {
  const value = from[key];
  return typeof value === "number" ? value : fail(`${what}: "${key}" must be a number`);
}

function textField(from: Raw, key: string, what: string): string {
  const value = from[key];
  return typeof value === "string" ? value : fail(`${what}: "${key}" must be text`);
}

function yearMonth(value: unknown, what: string): YearMonth {
  const date = raw(value, what);
  return { year: numberField(date, "year", what), month: numberField(date, "month", what) };
}

/** An array no longer than `max`. The length is checked first so a huge list is never walked. */
function list(from: Raw, key: string, max: number, what: string): readonly unknown[] {
  const value = from[key];
  if (!Array.isArray(value)) return fail(`${what} must be a list`);
  return value.length > max ? fail(`A plan can have at most ${max} ${what}`) : (value as unknown[]);
}

function readWithdrawal(value: unknown): WithdrawalEvent {
  const w = raw(value, "A withdrawal");
  return {
    id: numberField(w, "id", "A withdrawal"),
    date: yearMonth(w["date"], "A withdrawal's date"),
    amount: numberField(w, "amount", "A withdrawal"),
    label: textField(w, "label", "A withdrawal").trim(),
  };
}

function readDepositChange(value: unknown): DepositChangeEvent {
  const c = raw(value, "A deposit change");
  const end = c["endDate"];
  return {
    id: numberField(c, "id", "A deposit change"),
    startDate: yearMonth(c["startDate"], "A deposit change's start"),
    endDate: end === null ? null : yearMonth(end, "A deposit change's end"),
    amount: numberField(c, "amount", "A deposit change"),
    label: textField(c, "label", "A deposit change").trim(),
  };
}

function readOneTimeDeposit(value: unknown): OneTimeDepositEvent {
  const d = raw(value, "A one-time deposit");
  return {
    id: numberField(d, "id", "A one-time deposit"),
    date: yearMonth(d["date"], "A one-time deposit's date"),
    amount: numberField(d, "amount", "A one-time deposit"),
    label: textField(d, "label", "A one-time deposit").trim(),
  };
}

/** The newest plan format. Older formats are upgraded when read; newer ones can't be read. */
const CURRENT_VERSION = 3;

function readGoal(value: unknown): GoalPlan | null {
  if (value === null) return null;
  const g = raw(value, "The goal");
  return { amount: numberField(g, "amount", "The goal"), date: yearMonth(g["date"], "The goal's date") };
}

/**
 * The fields that were added after version 1, read from a newer plan or filled in for an older one. A version 1 plan
 * had no horizon of its own (the page showed 30 years) and no inflation rate; a version 1 or 2 plan had no goal.
 */
function readVersionFields(doc: Raw, version: number): Pick<PlanDocument, "horizonYears" | "inflationPct" | "goal"> {
  const horizon =
    version === 1
      ? { horizonYears: DEFAULT_HORIZON_YEARS, inflationPct: DEFAULT_INFLATION_PCT }
      : { horizonYears: numberField(doc, "horizonYears", "The plan"), inflationPct: numberField(doc, "inflationPct", "The plan") };
  if (version < 3) return { ...horizon, goal: null };
  if (!("goal" in doc)) return fail('The plan: "goal" must be an object or null');
  return { ...horizon, goal: readGoal(doc["goal"]) };
}

/**
 * Reads a plan from parsed JSON. An older plan (saved or shared before the horizon, the inflation rate or the
 * goal became part of the plan) is upgraded to version 3 here, before the check, so old saves and old links keep opening.
 */
export function readPlanDocument(value: unknown): PlanDocument {
  const doc = raw(value, "The plan");
  const version = doc["version"];
  if (typeof version === "number" && version > CURRENT_VERSION) fail("This plan was made by a newer version of the app");
  if (version !== 1 && version !== 2 && version !== 3) fail(`Unknown plan version ${String(version)}`);

  const plan: PlanDocument = {
    version: 3,
    start: yearMonth(doc["start"], "The start date"),
    startAmount: numberField(doc, "startAmount", "The plan"),
    monthlyDeposit: numberField(doc, "monthlyDeposit", "The plan"),
    annualReturnPct: numberField(doc, "annualReturnPct", "The plan"),
    ...readVersionFields(doc, version),
    withdrawals: list(doc, "withdrawals", PLAN_LIMITS.maxWithdrawals, "withdrawals").map(readWithdrawal),
    depositChanges: list(doc, "depositChanges", PLAN_LIMITS.maxDepositChanges, "deposit changes").map(readDepositChange),
    oneTimeDeposits: list(doc, "oneTimeDeposits", PLAN_LIMITS.maxOneTimeDeposits, "one-time deposits").map(readOneTimeDeposit),
  };
  validatePlanDocument(plan);
  return plan;
}

/** Reads a plan from JSON text. */
export function readPlanText(text: string): PlanDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return fail("The saved text is not valid JSON");
  }
  return readPlanDocument(parsed);
}

/** The text that gets saved or shared for a plan. */
export function serializePlan(plan: PlanDocument): string {
  return JSON.stringify(plan);
}
