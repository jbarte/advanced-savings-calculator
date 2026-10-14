import raw from "./sample-data.json";
import type { ScenarioView } from "./types";

/*
 * Static placeholder data so the UI can be built before the calculation engine.
 * The numbers were generated offline (7 % yearly return, monthly compounding,
 * quarterly points). Replace with engine output once src/core/ is in place.
 */

type RawPoint = [month: number, balance: number, deposited: number, withdrawn: number, growth: number];

export const SAMPLE_SCENARIOS: readonly ScenarioView[] = raw.scenarios.map((s) => ({
  id: s.id,
  name: s.name,
  start: { year: raw.startYear, month: 1 },
  startAmount: s.startAmount,
  monthlyDeposit: s.monthlyDeposit,
  annualReturnPct: s.annualReturnPct,
  withdrawals: s.withdrawals.map((w) => ({
    month: w.month,
    amount: w.amount,
    label: w.label,
    costByHorizon: { 10: w.costByHorizon["10"], 20: w.costByHorizon["20"], 30: w.costByHorizon["30"] },
  })),
  goal: s.goal,
  points: (s.points as RawPoint[]).map(([month, balance, deposited, withdrawn, growth]) => ({
    month,
    balance,
    deposited,
    withdrawn,
    growth,
  })),
}));
