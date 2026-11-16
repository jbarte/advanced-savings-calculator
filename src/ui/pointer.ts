/** True on a device whose main pointer is a finger: there is no hover, and a tap is how the chart is read. */
export function hasCoarsePointer(): boolean {
  try {
    return window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
}

/**
 * Whether a click came from a finger. Browsers that report it say so on the event; for the rest the device's main
 * pointer decides.
 */
export function isTouchClick(event: MouseEvent): boolean {
  return "pointerType" in event && typeof event.pointerType === "string" && event.pointerType !== "" ? event.pointerType === "touch" : hasCoarsePointer();
}
