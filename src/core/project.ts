import { depositInMonth } from "./deposit-schedule";
import { monthlyRate, roundToOre } from "./money";
import type { AppliedWithdrawal, OneTimeDepositInput, Ore, PlanInput, Projection, ProjectionPoint, WithdrawalInput } from "./types";

function assertWholeOre(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a whole number of öre, 0 or more, got ${value}`);
  }
}

function assertValidPlan(plan: PlanInput): void {
  assertWholeOre(plan.startAmount, "Start amount");
  assertWholeOre(plan.monthlyDeposit, "Monthly deposit");
  if (!Number.isSafeInteger(plan.months) || plan.months < 0) {
    throw new RangeError(`Months must be a whole number, 0 or more, got ${plan.months}`);
  }
  for (const change of plan.depositChanges) {
    assertWholeOre(change.amount, `Deposit change "${change.label}"`);
    if (!Number.isSafeInteger(change.startMonth)) {
      throw new RangeError(`Deposit change "${change.label}" must start in a whole month, got ${change.startMonth}`);
    }
    if (change.endMonth !== null && !Number.isSafeInteger(change.endMonth)) {
      throw new RangeError(`Deposit change "${change.label}" must end in a whole month, got ${change.endMonth}`);
    }
  }
  for (const deposit of plan.oneTimeDeposits) {
    assertWholeOre(deposit.amount, `One-time deposit "${deposit.label}"`);
    if (!Number.isSafeInteger(deposit.month) || deposit.month < 0) {
      throw new RangeError(`One-time deposit "${deposit.label}" is dated before the start (month ${deposit.month})`);
    }
  }
  for (const withdrawal of plan.withdrawals) {
    assertWholeOre(withdrawal.amount, `Withdrawal "${withdrawal.label}"`);
    if (!Number.isSafeInteger(withdrawal.month) || withdrawal.month < 0) {
      throw new RangeError(`Withdrawal "${withdrawal.label}" is dated before the start (month ${withdrawal.month})`);
    }
  }
}

function assertSafeBalance(balance: number, month: number): void {
  if (!Number.isSafeInteger(balance)) {
    throw new RangeError(`The balance in month ${month} is too large to calculate exactly`);
  }
}

interface IndexedWithdrawal {
  readonly withdrawal: WithdrawalInput;
  readonly index: number;
}

/** The withdrawals dated in `month`, in list order, with their position in the list. */
function withdrawalsInMonth(withdrawals: readonly WithdrawalInput[], month: number): IndexedWithdrawal[] {
  return withdrawals.flatMap((withdrawal, index) => (withdrawal.month === month ? [{ withdrawal, index }] : []));
}

/** Takes one withdrawal out of `balance`, never going below 0. */
function applyWithdrawal(
  balance: Ore,
  { withdrawal, index }: IndexedWithdrawal,
): { balance: Ore; applied: AppliedWithdrawal } {
  const taken = Math.min(withdrawal.amount, balance);
  return {
    balance: balance - taken,
    applied: {
      index,
      month: withdrawal.month,
      requested: withdrawal.amount,
      applied: taken,
      shortfall: withdrawal.amount - taken,
    },
  };
}

/** The sum of the one-time deposits dated in `month`. */
function oneTimeDepositsInMonth(deposits: readonly OneTimeDepositInput[], month: number): Ore {
  return deposits.reduce((sum, deposit) => (deposit.month === month ? sum + deposit.amount : sum), 0);
}

/**
 * Projects the balance month by month. Month 0 holds the start amount (and any one-time deposit dated
 * there). Each later month the balance grows by the monthly rate (rounded to whole öre), then the deposit
 * (see `depositInMonth`) is added. Then, in every month, that month's one-time deposits are added and its
 * withdrawals are taken out in list order, each capped at what is left.
 */
export function project(plan: PlanInput): Projection {
  assertValidPlan(plan);
  const rate = monthlyRate(plan.annualReturnPct);

  const points: ProjectionPoint[] = [];
  const appliedWithdrawals: AppliedWithdrawal[] = [];
  let balance = plan.startAmount;
  let deposited = plan.startAmount;
  let withdrawn = 0;

  for (let month = 0; month <= plan.months; month++) {
    if (month > 0) {
      const deposit = depositInMonth(plan.monthlyDeposit, plan.depositChanges, month);
      balance = roundToOre(balance * (1 + rate)) + deposit;
      deposited += deposit;
      assertSafeBalance(balance, month);
    }

    const extra = oneTimeDepositsInMonth(plan.oneTimeDeposits, month);
    balance += extra;
    deposited += extra;
    assertSafeBalance(balance, month);

    for (const withdrawal of withdrawalsInMonth(plan.withdrawals, month)) {
      const result = applyWithdrawal(balance, withdrawal);
      balance = result.balance;
      withdrawn += result.applied.applied;
      appliedWithdrawals.push(result.applied);
    }

    points.push({ month, balance, deposited, withdrawn, growth: balance + withdrawn - deposited });
  }

  return { points, withdrawals: appliedWithdrawals };
}
