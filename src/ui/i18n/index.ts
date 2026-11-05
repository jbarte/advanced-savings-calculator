import { en } from "./en";
import type { Messages } from "./messages";

export type { Messages } from "./messages";

/**
 * The interface text in use (named `messages`, since `text` is a common local name for typed input). This is the one place that picks the language (there is only English so far), so adding
 * a language later means adding a file next to `en.ts` that satisfies `Messages`, and choosing here.
 */
export const messages: Messages = en;
