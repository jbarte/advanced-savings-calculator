import { describe, expect, it } from "vitest";
import { appendEvent, nextId, removeEvent, replaceEvent } from "./event-list";
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

  it("never changes the list it was given", () => {
    const list = [item(1)];
    appendEvent(list, 5, names, item);
    replaceEvent(list, 1, names, (id) => item(id, "y"));
    removeEvent(list, 1);
    expect(list).toEqual([item(1)]);
  });
});
