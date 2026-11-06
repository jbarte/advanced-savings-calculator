import { language } from "./i18n";

/** Tells the browser which language the page is in, for screen readers, hyphenation and translation offers. */
export function applyLanguage(): void {
  document.documentElement.lang = language;
}
