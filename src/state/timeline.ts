import type { PlannedDepositChange, PlannedOneTimeDeposit, PlannedWithdrawal } from "./types";

/** Identifies one event across all kinds, since each kind numbers its ids apart. */
export type EventKey = string;

export const withdrawalKey = (id: number): EventKey => `withdrawal-${id}`;
export const depositChangeKey = (id: number): EventKey => `deposit-change-${id}`;
export const oneTimeDepositKey = (id: number): EventKey => `one-time-deposit-${id}`;

interface EntryBase {
  readonly key: EventKey;
  /** Position in date order, from 1. This is the number shown on the event. */
  readonly number: number;
  /** Months after the plan start (negative before it). */
  readonly month: number;
}

export type TimelineEntry =
  | (EntryBase & { readonly kind: "withdrawal"; readonly withdrawal: PlannedWithdrawal })
  | (EntryBase & { readonly kind: "deposit-change"; readonly change: PlannedDepositChange })
  | (EntryBase & { readonly kind: "one-time-deposit"; readonly deposit: PlannedOneTimeDeposit });

type Unnumbered = TimelineEntry extends infer E ? (E extends TimelineEntry ? Omit<E, "number"> : never) : never;

/** In the same month, how the month is saved comes first, then extra money in, then money out. */
const KIND_ORDER = { "deposit-change": 0, "one-time-deposit": 1, withdrawal: 2 } as const;

function eventId(entry: Unnumbered): number {
  switch (entry.kind) {
    case "withdrawal":
      return entry.withdrawal.id;
    case "deposit-change":
      return entry.change.id;
    case "one-time-deposit":
      return entry.deposit.id;
  }
}

/** All kinds of event in one list, in date order and numbered, so the list and the chart can share numbers. */
export function buildTimeline(
  withdrawals: readonly PlannedWithdrawal[],
  depositChanges: readonly PlannedDepositChange[],
  oneTimeDeposits: readonly PlannedOneTimeDeposit[],
): readonly TimelineEntry[] {
  const entries: Unnumbered[] = [
    ...withdrawals.map((withdrawal) => ({
      kind: "withdrawal" as const,
      key: withdrawalKey(withdrawal.id),
      month: withdrawal.month,
      withdrawal,
    })),
    ...depositChanges.map((change) => ({
      kind: "deposit-change" as const,
      key: depositChangeKey(change.id),
      month: change.startMonth,
      change,
    })),
    ...oneTimeDeposits.map((deposit) => ({
      kind: "one-time-deposit" as const,
      key: oneTimeDepositKey(deposit.id),
      month: deposit.month,
      deposit,
    })),
  ];
  entries.sort((a, b) => a.month - b.month || KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || eventId(a) - eventId(b));
  return entries.map((entry, index) => ({ ...entry, number: index + 1 }) as TimelineEntry);
}

/** Whether an event is drawn on the chart: not before the plan start and not after the horizon. */
export function isPlanned(entry: TimelineEntry): boolean {
  switch (entry.kind) {
    case "withdrawal":
      return entry.withdrawal.status === "planned";
    case "deposit-change":
      return entry.change.status === "planned";
    case "one-time-deposit":
      return entry.deposit.status === "planned";
  }
}

/** The chart month of an event. A deposit change that began before the plan is drawn at month 0. */
export function chartMonthOf(entry: TimelineEntry): number {
  return Math.max(0, entry.month);
}

/** The events drawn at one month of the chart, in list order. */
export function eventsAtMonth(timeline: readonly TimelineEntry[], month: number): TimelineEntry[] {
  return timeline.filter((entry) => isPlanned(entry) && chartMonthOf(entry) === month);
}

/**
 * What a hover at a month of the chart should mention: the events at that month, plus every deposit change whose
 * period (start to end month, both inclusive) covers it, so the whole shaded band answers and not just its first month.
 */
export function eventsActiveAtMonth(timeline: readonly TimelineEntry[], month: number): TimelineEntry[] {
  return timeline.filter(
    (entry) =>
      isPlanned(entry) &&
      (chartMonthOf(entry) === month ||
        (entry.kind === "deposit-change" && entry.change.endMonth !== null && entry.change.startMonth <= month && month <= entry.change.endMonth)),
  );
}
