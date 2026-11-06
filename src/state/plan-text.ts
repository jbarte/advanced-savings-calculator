/**
 * Text the user types that ends up in the plan (a name, an event label): control characters (a pasted tab or
 * line break) become a space, and the ends are trimmed. Cleaning rather than rejecting means pasted text and
 * older saves still work.
 */
export function cleanText(text: string): string {
  return text.replace(/\p{Cc}/gu, " ").trim();
}
