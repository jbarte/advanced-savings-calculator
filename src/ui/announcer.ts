/**
 * Reads a message out to screen readers through one live region that is not part of the re-rendered page.
 * A region rebuilt on every render would be read out again each time; this one changes only when the text does.
 */
export function announce(message: string): void {
  const region = document.getElementById("announcer");
  if (region && region.textContent !== message) region.textContent = message;
}
