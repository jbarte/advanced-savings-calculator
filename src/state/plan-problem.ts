import type { Ore } from "../core/types";

/*
 * What is wrong with a plan, as data rather than a sentence, so the UI can say it in the user's language and format
 * the amounts its own way. A `PlanError` carries one, next to an English message for developers and tests.
 */

export type PlanEventKind = "withdrawal" | "deposit-change" | "one-time-deposit";

export type AmountField =
  | "startAmount"
  | "monthlyDeposit"
  | "withdrawalAmount"
  | "depositChangeAmount"
  | "oneTimeDepositAmount"
  | "goalAmount";

export type DateField =
  | "startDate"
  | "withdrawalDate"
  | "depositChangeStart"
  | "depositChangeEnd"
  | "oneTimeDepositDate"
  | "goalDate";

export type PercentField = "annualReturn" | "inflation";

export type PlanProblem =
  | { readonly code: "amount"; readonly field: AmountField; readonly min: Ore; readonly max: Ore }
  | { readonly code: "date"; readonly field: DateField; readonly minYear: number; readonly maxYear: number }
  | { readonly code: "percent"; readonly field: PercentField; readonly min: number; readonly max: number }
  | { readonly code: "horizon"; readonly min: number; readonly max: number }
  | { readonly code: "label"; readonly kind: PlanEventKind; readonly max: number }
  | { readonly code: "too-many"; readonly kind: PlanEventKind; readonly max: number }
  | { readonly code: "end-before-start" }
  | { readonly code: "newer-version" }
  /** Saved or shared data that is not a plan: wrong shape, unknown version, broken ids, not JSON. */
  | { readonly code: "damaged" }
  | { readonly code: "link-damaged" }
  | { readonly code: "link-too-large" }
  | { readonly code: "link-unsupported" }
  | { readonly code: "not-a-plan-link" };

/** A RangeError that says what is wrong with a plan as a `PlanProblem`. */
export class PlanError extends RangeError {
  readonly problem: PlanProblem;

  constructor(message: string, problem: PlanProblem) {
    super(message);
    this.name = "PlanError";
    this.problem = problem;
  }
}

/** Throws a `PlanError`. */
export function failWith(problem: PlanProblem, message: string): never {
  throw new PlanError(message, problem);
}

/** The problem behind a RangeError. One that is not a `PlanError` (for example from the engine) counts as damaged data. */
export function problemOf(error: RangeError): PlanProblem {
  return error instanceof PlanError ? error.problem : { code: "damaged" };
}
