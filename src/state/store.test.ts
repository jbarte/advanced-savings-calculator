import { describe, expect, it } from "vitest";
import { createBlankPlan } from "./plan-document";
import { createStore } from "./store";
import { createTestState } from "./test-support";

const initial = createTestState(createBlankPlan({ year: 2026, month: 1 }), "example");

describe("createStore", () => {
  it("returns the initial state", () => {
    expect(createStore(initial).get()).toBe(initial);
  });

  it("merges an update into the state and leaves the rest", () => {
    const store = createStore(initial);
    store.update({ chartMonth: 10 });
    expect(store.get()).toEqual({ ...initial, chartMonth: 10 });
    expect(initial.chartMonth).toBeNull();
  });

  it("tells every subscriber about each update, with the new state", () => {
    const store = createStore(initial);
    const seen: (number | null)[] = [];
    store.subscribe((state) => seen.push(state.chartMonth));
    store.subscribe((state) => seen.push((state.chartMonth ?? 0) * 10));
    store.update({ chartMonth: 20 });
    expect(seen).toEqual([20, 200]);
  });
});
