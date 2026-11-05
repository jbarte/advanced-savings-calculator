import { describe, expect, it } from "vitest";
import { createBlankPlan } from "./plan-document";
import { createStore } from "./store";
import type { AppState } from "./types";

const initial: AppState = {
  scenarioId: "plan",
  plan: createBlankPlan({ year: 2026, month: 1 }),
  planOrigin: "example",
  storage: "idle",
  horizon: 30,
  metric: "balance",
  selectedEvent: null,
  chartMonth: null,
  theme: "system",
  notice: null,
};

describe("createStore", () => {
  it("returns the initial state", () => {
    expect(createStore(initial).get()).toBe(initial);
  });

  it("merges an update into the state and leaves the rest", () => {
    const store = createStore(initial);
    store.update({ horizon: 10 });
    expect(store.get()).toEqual({ ...initial, horizon: 10 });
    expect(initial.horizon).toBe(30);
  });

  it("tells every subscriber about each update, with the new state", () => {
    const store = createStore(initial);
    const seen: number[] = [];
    store.subscribe((state) => seen.push(state.horizon));
    store.subscribe((state) => seen.push(state.horizon * 10));
    store.update({ horizon: 20 });
    expect(seen).toEqual([20, 200]);
  });
});
