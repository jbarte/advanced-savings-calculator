/*
 * Shared add/update/remove for the plan's event lists (withdrawals, deposit changes, one-time deposits). Each
 * list numbers its own ids; validation of the event itself stays with the caller.
 */

interface WithId {
  readonly id: number;
}

/** How an event kind is named in messages, for example { one: "withdrawal", many: "withdrawals" }. */
export interface EventNames {
  readonly one: string;
  readonly many: string;
}

/** One above the highest id in the list, or 1 for an empty list. */
export function nextId(list: readonly WithId[]): number {
  return Math.max(0, ...list.map((item) => item.id)) + 1;
}

/** Appends an event built with the next id. Throws a RangeError when the list is full. */
export function appendEvent<T extends WithId>(list: readonly T[], max: number, names: EventNames, make: (id: number) => T): T[] {
  if (list.length >= max) throw new RangeError(`A plan can have at most ${max} ${names.many}`);
  return [...list, make(nextId(list))];
}

/** Replaces the event with `id`, keeping its place. Throws a RangeError when there is none. */
export function replaceEvent<T extends WithId>(list: readonly T[], id: number, names: EventNames, make: (id: number) => T): T[] {
  if (!list.some((item) => item.id === id)) throw new RangeError(`There is no ${names.one} with id ${id}`);
  return list.map((item) => (item.id === id ? make(id) : item));
}

/** Removes the event with `id`. Does nothing if it is already gone. */
export function removeEvent<T extends WithId>(list: readonly T[], id: number): T[] {
  return list.filter((item) => item.id !== id);
}
