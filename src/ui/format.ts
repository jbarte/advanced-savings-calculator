import type { Ore } from "../state/types";

const fullFormat = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 });
const compactFormat = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/** 171609335 öre → "1 716 093" (whole kronor, no unit) */
export function formatKronor(amount: Ore): string {
  return fullFormat.format(Math.round(amount / 100));
}

/** 171609335 öre → "1 716 093 kr" */
export function formatMoney(amount: Ore): string {
  return `${formatKronor(amount)} kr`;
}

/** 171609335 öre → "1.7M kr" */
export function formatMoneyCompact(amount: Ore): string {
  return `${compactFormat.format(amount / 100)} kr`;
}

/** A plus for a gain, a minus sign for a loss, nothing for 0. */
function signOf(amount: Ore): string {
  return amount > 0 ? "+" : amount < 0 ? "\u2212" : "";
}

/** −81411474 öre → "−814 115 kr", 54274305 → "+542 743 kr". For effects, where the sign is the point. */
export function formatSignedMoney(amount: Ore): string {
  return `${signOf(amount)}${formatMoney(Math.abs(amount))}`;
}

/** −81411474 öre → "−814.1K kr", 54274305 → "+542.7K kr". */
export function formatSignedMoneyCompact(amount: Ore): string {
  return `${signOf(amount)}${formatMoneyCompact(Math.abs(amount))}`;
}

