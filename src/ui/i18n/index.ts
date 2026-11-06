import { browserLanguages, chooseLanguage, loadLanguagePreference } from "../../state/language";
import type { Language } from "../../state/language";
import { en } from "./en";
import type { Messages } from "./messages";
import { sv } from "./sv";

export type { Messages } from "./messages";

const TEXTS: Readonly<Record<Language, Messages>> = { en, sv };

/**
 * The language in use: the user's own choice, else the browser's, else English. It is decided once when the page
 * loads (the switch saves the choice and reloads), so the texts are plain constants and nothing here changes later.
 */
export const language: Language = chooseLanguage(loadLanguagePreference(), browserLanguages());

/**
 * The interface text in use (named `messages`, since `text` is a common local name for typed input). This is the one
 * place that picks the language. Another language is a file next to `en.ts` that satisfies `Messages`, added to `TEXTS`.
 */
export const messages: Messages = TEXTS[language];
