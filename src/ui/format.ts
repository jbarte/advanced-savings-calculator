import type { Ore } from "../state/types";

const fullFormat = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 });
const compactFormat = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/** 171609335 öre → "1 716 093 kr" */
export function formatMoney(amount: Ore): string {
  return `${fullFormat.format(Math.round(amount / 100))} kr`;
}

/** 171609335 öre → "1.7M kr" */
export function formatMoneyCompact(amount: Ore): string {
  return `${compactFormat.format(amount / 100)} kr`;
}
