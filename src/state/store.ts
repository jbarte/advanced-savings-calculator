import type { AppState } from "./types";

type Listener = (state: AppState) => void;

export interface Store {
  get(): AppState;
  update(patch: Partial<AppState>): void;
  subscribe(listener: Listener): void;
}

/** A minimal observable store. Each update notifies every subscriber. */
export function createStore(initial: AppState): Store {
  let state = initial;
  const listeners: Listener[] = [];

  return {
    get: () => state,
    update(patch) {
      state = { ...state, ...patch };
      listeners.forEach((listener) => listener(state));
    },
    subscribe(listener) {
      listeners.push(listener);
    },
  };
}
