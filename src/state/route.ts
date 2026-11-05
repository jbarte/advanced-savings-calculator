import { planTokenFromHash } from "./share-link";

export type Route = "app" | "design-system";

/** The design-system reference page lives at #design-system; everything else is the calculator. */
export function currentRoute(): Route {
  try {
    return window.location.hash === "#design-system" ? "design-system" : "app";
  } catch {
    // Location unavailable (sandboxed frame). The calculator is the safe default.
    return "app";
  }
}

/** The token of a share link in the address (#plan=...), or null when the page was not opened from one. */
export function sharedPlanToken(): string | null {
  try {
    return planTokenFromHash(window.location.hash);
  } catch {
    // Location unavailable (sandboxed frame): there is no link to open.
    return null;
  }
}

/** The address of this page without the share token, so a reload doesn't open the link again. */
export function currentPageUrl(): string {
  try {
    return window.location.href;
  } catch {
    // Location unavailable: a link can't be built, and the caller reports that.
    return "";
  }
}

/** Removes the share token from the address without adding a history entry. */
export function clearShareHash(): void {
  try {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  } catch {
    // The address can't be changed (sandboxed frame). The link just stays in the bar.
  }
}
