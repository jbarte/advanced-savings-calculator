import { failWith } from "./plan-problem";
import type { PlanEventKind } from "./plan-problem";

/*
 * Shared add/update/remove for the plan's event lists (withdrawals, deposit changes, one-time deposits). Each
 * list numbers its own ids; validation of the event itself stays with the caller.
 */

interface WithId {
  readonly id: number;
}

/** Which kind of event a list holds, and how it is named in developer messages ("withdrawal", "withdrawals"). */
export interface EventNames {
  readonly kind: PlanEventKind;
  readonly one: string;
  readonly many: string;
}

/** One above the highest id in the list, or 1 for an empty list. */
export function nextId(list: readonly WithId[]): number {
  return Math.max(0, ...list.map((item) => item.id)) + 1;
}

/** Appends an event built with the next id. Throws a PlanError when the list is full. */
export function appendEvent<T extends WithId>(list: readonly T[], max: number, names: EventNames, make: (id: number) => T): T[] {
  if (list.length >= max) failWith({ code: "too-many", kind: names.kind, max }, `A plan can have at most ${max} ${names.many}`);
  return [...list, make(nextId(list))];
}

/** Replaces the event with `id`, keeping its place. Throws a RangeError when there is none. */
export function replaceEvent<T extends WithId>(list: readonly T[], id: number, names: EventNames, make: (id: number) => T): T[] {
  // The UI only edits events it shows, so a missing one means the plan changed underneath it.
  if (!list.some((item) => item.id === id)) failWith({ code: "damaged" }, `There is no ${names.one} with id ${id}`);
  return list.map((item) => (item.id === id ? make(id) : item));
}

/**
 * Puts a removed event back in its place by id. If a newer event has taken the id meanwhile, the event gets the next
 * free one. Throws a PlanError when the list is full.
 */
export function restoreEvent<T extends WithId>(list: readonly T[], event: T, max: number, names: EventNames): T[] {
  if (list.length >= max) failWith({ code: "too-many", kind: names.kind, max }, `A plan can have at most ${max} ${names.many}`);
  const restored = list.some((item) => item.id === event.id) ? { ...event, id: nextId(list) } : event;
  return [...list, restored].sort((a, b) => a.id - b.id);
}

/** Removes the event with `id`. Does nothing if it is already gone. */
export function removeEvent<T extends WithId>(list: readonly T[], id: number): T[] {
  return list.filter((item) => item.id !== id);
}
