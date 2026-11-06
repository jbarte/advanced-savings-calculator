import type { ThemePreference } from "../state/types";
import { motionAllowed } from "./motion";

/**
 * Applies the theme to <html>. "system" removes the override so CSS follows the OS. A change after the page has opened blends
 * the colours over a moment (`.theme-fading`) instead of flipping at once; the first call, and anyone who asks for less
 * motion, get no blend.
 */
export function applyTheme(theme: ThemePreference): void {
  const root = document.documentElement;
  const current = root.getAttribute("data-theme") ?? "system";
  const changed = current !== theme;
  if (changed && root.hasAttribute("data-themed") && motionAllowed()) {
    root.classList.add("theme-fading");
    setTimeout(() => root.classList.remove("theme-fading"), FADE_MS);
  }
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
  root.setAttribute("data-themed", "");
}

/** As long as the colour transition in `.theme-fading` (app.css), plus a little. */
const FADE_MS = 260;
