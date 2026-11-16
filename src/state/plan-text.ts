/**
 * Text the user types that ends up in the plan (a name, an event label): control characters (a pasted tab or
 * line break) and the invisible controls that flip the direction of text (U+202A to U+202E and U+2066 to U+2069, which
 * can make a name in a shared link read backwards or hide what follows) become a space, and the ends are trimmed.
 * Cleaning rather than rejecting means pasted text and older saves still work.
 */
export function cleanText(text: string): string {
  return text.replace(/[\p{Cc}\u202a-\u202e\u2066-\u2069]/gu, " ").trim();
}
