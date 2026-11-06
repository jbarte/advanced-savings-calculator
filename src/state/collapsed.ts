/** The parts of the page that can be collapsed to their heading. */
export const COLLAPSIBLE = ["compare"] as const;
export type CollapsibleId = (typeof COLLAPSIBLE)[number];

/** Named after the app, like the plan, theme and language keys. */
const STORAGE_KEY = "advanced-savings-calculator:collapsed";

/** The collapsed parts in saved text: a JSON list of ids. Anything else, or an unknown id, is left out. */
export function readCollapsed(text: string | null): CollapsibleId[] {
  if (text === null) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    // A broken value is a view preference, not a plan: everything is simply shown expanded.
    return [];
  }
  return Array.isArray(parsed) ? COLLAPSIBLE.filter((id) => parsed.includes(id)) : [];
}

/** Collapses the part when it is open, and opens it when it is collapsed. */
export function toggleCollapsed(collapsed: readonly CollapsibleId[], id: CollapsibleId): CollapsibleId[] {
  return collapsed.includes(id) ? collapsed.filter((other) => other !== id) : COLLAPSIBLE.filter((other) => other === id || collapsed.includes(other));
}

/** The parts collapsed on an earlier visit. Nothing when storage is unavailable. */
export function loadCollapsed(): CollapsibleId[] {
  try {
    return readCollapsed(localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

export function saveCollapsed(collapsed: readonly CollapsibleId[]): void {
  try {
    if (collapsed.length === 0) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsed));
  } catch {
    // Storage blocked (private mode etc.). The choice just won't persist.
  }
}
