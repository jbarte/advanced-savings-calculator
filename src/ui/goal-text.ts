import type { Ore } from "../state/types";
import { formatMoney } from "./format";
import { messages } from "./i18n";

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
  const t = messages.goalDeposit;
  if (required === null) return { value: t.notReachable, note: t.notReachableNote };
  if (required === 0) return { value: t.nothing, note: t.nothingNote };
  const value = `${formatMoney(required)}${messages.units.perMonth}`;
  if (required === current) return { value, note: t.same };
  const difference = `${formatMoney(Math.abs(required - current))}${messages.units.perMonth}`;
  return { value, note: required > current ? t.more(difference) : t.less(difference) };
}
