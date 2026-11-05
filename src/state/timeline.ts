import type { PlannedDepositChange, PlannedWithdrawal } from "./types";

/** Identifies one event across both kinds, since withdrawals and deposit changes number their ids apart. */
export type EventKey = string;

export const withdrawalKey = (id: number): EventKey => `withdrawal-${id}`;
export const depositChangeKey = (id: number): EventKey => `deposit-change-${id}`;

interface EntryBase {
  readonly key: EventKey;
  /** Position in date order, from 1. This is the number shown on the event. */
  readonly number: number;
  /** Months after the plan start (negative before it). */
  readonly month: number;
}

export type TimelineEntry =
  | (EntryBase & { readonly kind: "withdrawal"; readonly withdrawal: PlannedWithdrawal })
  | (EntryBase & { readonly kind: "deposit-change"; readonly change: PlannedDepositChange });

type Unnumbered =
  | Omit<Extract<TimelineEntry, { kind: "withdrawal" }>, "number">
  | Omit<Extract<TimelineEntry, { kind: "deposit-change" }>, "number">;

/** A deposit change sorts before a withdrawal of the same month: it sets how the month is saved. */
const KIND_ORDER = { "deposit-change": 0, withdrawal: 1 } as const;

function eventId(entry: Unnumbered): number {
  return entry.kind === "withdrawal" ? entry.withdrawal.id : entry.change.id;
}

/** Both kinds of event in one list, in date order and numbered, so the list and the chart can share numbers. */
export function buildTimeline(
  withdrawals: readonly PlannedWithdrawal[],
  depositChanges: readonly PlannedDepositChange[],
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
  ];
  entries.sort((a, b) => a.month - b.month || KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || eventId(a) - eventId(b));
  return entries.map((entry, index) => ({ ...entry, number: index + 1 }));
}
