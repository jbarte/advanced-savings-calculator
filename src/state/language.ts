/** The languages of the interface. */
export const LANGUAGES = ["en", "sv"] as const;
export type Language = (typeof LANGUAGES)[number];

/** Named after the app, like the plan and theme keys. */
const STORAGE_KEY = "advanced-savings-calculator:language";

function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((language) => language === value);
}

/** The language the user picked with the switch, or null when they have not picked one. */
export function loadLanguagePreference(): Language | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return isLanguage(value) ? value : null;
  } catch {
    return null;
  }
}

/** Remembers the user's choice. If storage is blocked the choice is lost on the next visit, which is the best we can do. */
export function saveLanguagePreference(language: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Storage blocked (private mode etc.). The choice just won't persist.
  }
}

/** The languages the browser asks for, most wanted first. Empty when it can't tell. */
export function browserLanguages(): readonly string[] {
  try {
    return navigator.languages.length > 0 ? navigator.languages : [navigator.language];
  } catch {
    return [];
  }
}

/**
 * The language to open in: the user's own choice, else the first language the browser asks for that the app has
 * ("sv-SE" counts as Swedish), else English.
 */
export function chooseLanguage(preference: Language | null, wanted: readonly string[]): Language {
  if (preference !== null) return preference;
  for (const tag of wanted) {
    const base = tag.toLowerCase().split("-")[0];
    const found = LANGUAGES.find((language) => language === base);
    if (found) return found;
  }
  return "en";
}
