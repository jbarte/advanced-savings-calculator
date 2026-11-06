import { describe, expect, it } from "vitest";
import { appendEvent, nextId, removeEvent, replaceEvent, restoreEvent } from "./event-list";
import type { EventNames } from "./event-list";

const names: EventNames = { kind: "withdrawal", one: "thing", many: "things" };
const item = (id: number, label = "x"): { id: number; label: string } => ({ id, label });

describe("event list helpers", () => {
  it("numbers from 1, one above the highest id, gaps included", () => {
    expect(nextId([])).toBe(1);
    expect(nextId([item(1), item(7), item(3)])).toBe(8);
  });

  it("appends with the next id, and refuses a full list", () => {
    expect(appendEvent([item(2)], 5, names, (id) => item(id, "new"))).toEqual([item(2), item(3, "new")]);
    expect(() => appendEvent([item(1), item(2)], 2, names, item)).toThrow("A plan can have at most 2 things");
  });

  it("replaces in place, and refuses an unknown id", () => {
    expect(replaceEvent([item(1), item(2)], 1, names, (id) => item(id, "edited"))).toEqual([item(1, "edited"), item(2)]);
    expect(() => replaceEvent([item(1)], 9, names, item)).toThrow("There is no thing with id 9");
  });

  it("removes, and ignores an unknown id", () => {
    expect(removeEvent([item(1), item(2)], 1)).toEqual([item(2)]);
    expect(removeEvent([item(1)], 9)).toEqual([item(1)]);
  });

  it("restores an event in id order, with a new id when its own was taken", () => {
    expect(restoreEvent([item(1), item(3)], item(2, "back"), 5, names)).toEqual([item(1), item(2, "back"), item(3)]);
    expect(restoreEvent([item(1), item(2, "newer")], item(2, "back"), 5, names)).toEqual([item(1), item(2, "newer"), item(3, "back")]);
    expect(() => restoreEvent([item(1)], item(2), 1, names)).toThrow("A plan can have at most 1 things");
  });

  it("never changes the list it was given", () => {
    const list = [item(1)];
    appendEvent(list, 5, names, item);
    replaceEvent(list, 1, names, (id) => item(id, "y"));
    removeEvent(list, 1);
    expect(list).toEqual([item(1)]);
  });
});
