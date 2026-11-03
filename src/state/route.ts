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
