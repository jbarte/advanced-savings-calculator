import type { ThemePreference } from "./types";

/** Named after the app, like the plan key; the earlier short key is still read. */
const STORAGE_KEY = "advanced-savings-calculator:theme";
const LEGACY_STORAGE_KEY = "asc-theme";

/** Reads the saved theme. Falls back to "system" if storage is unavailable. */
export function loadThemePreference(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

export function saveThemePreference(theme: ThemePreference): void {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    if (theme === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage blocked (private mode etc.). The choice just won't persist.
  }
}

/** Whether the system asks for dark mode. False when the browser can't tell. */
export function systemPrefersDark(): boolean {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    // matchMedia unavailable (very old or sandboxed browser): the light theme is the safe default.
    return false;
  }
}

/** Calls `onChange` when the system switches between light and dark. Does nothing if the browser can't tell. */
export function onSystemThemeChange(onChange: () => void): void {
  try {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", onChange);
  } catch {
    // No matchMedia: the theme then only changes through the toggle.
  }
}
