/** False when the system asks for less motion; anything that moves on its own checks this first. */
export function motionAllowed(): boolean {
  try {
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return true;
  }
}
