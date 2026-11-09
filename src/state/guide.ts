/** Named after the app, like the plan, theme and language keys. */
const STORAGE_KEY = "advanced-savings-calculator:guide-seen";

/** Whether saved text says the guide has been shown. Anything but the marker counts as not seen. */
export function readGuideSeen(text: string | null): boolean {
  return text === "1";
}

/** True when the guide was shown on an earlier visit. Storage that can't be read counts as seen, so it never nags. */
export function loadGuideSeen(): boolean {
  try {
    return readGuideSeen(localStorage.getItem(STORAGE_KEY));
  } catch {
    // Without storage the choice can't be remembered, and showing the guide on every visit would be a nuisance.
    return true;
  }
}

export function saveGuideSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Storage blocked (private mode etc.): the guide stays reachable from the app bar.
  }
}
