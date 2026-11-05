import type { Ore } from "../state/types";
import { formatMoney } from "./format";

export interface RequiredDepositText {
  /** The headline: the deposit needed, or why there is none. */
  readonly value: string;
  /** A line under it that compares with what the plan saves now. */
  readonly note: string;
}

/**
 * Words for "the monthly deposit needed" (see `requiredMonthlyDeposit`) next to what the plan saves now.
 * `required` is null when even the largest allowed deposit isn't enough.
 */
export function requiredDepositText(required: Ore | null, current: Ore): RequiredDepositText {
  if (required === null) return { value: "Not reachable", note: "Not even the largest allowed deposit is enough by then" };
  if (required === 0) return { value: "Nothing", note: "You reach the goal without a monthly deposit" };
  const value = `${formatMoney(required)}/mo`;
  if (required === current) return { value, note: "The same as your deposit now" };
  const difference = `${formatMoney(Math.abs(required - current))}/mo`;
  return { value, note: required > current ? `${difference} more than your deposit now` : `${difference} less than your deposit now` };
}
