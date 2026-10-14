import type { ThemePreference } from "../state/types";

/** Applies the theme to <html>. "system" removes the override so CSS follows the OS. */
export function applyTheme(theme: ThemePreference): void {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}
