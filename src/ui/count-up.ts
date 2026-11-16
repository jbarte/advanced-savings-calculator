import { formatKronor } from "./format";
import { motionAllowed } from "./motion";

/** How long the headline takes to count to a new amount. */
const COUNT_MS = 520;

/** The amount (in öre) the headline shows now, read before the page is redrawn. Null when there is no headline. */
export function captureHeadline(root: ParentNode): number | null {
  const text = root.querySelector(".hero__number")?.getAttribute("data-value");
  const value = text === null || text === undefined ? Number.NaN : Number(text);
  return Number.isFinite(value) ? value : null;
}

/**
 * Counts the headline from the amount it showed before to the one it shows now, easing out, so a change to the plan is
 * seen as the number moving and not just being replaced. Skipped when nothing changed, when the system asks for less
 * motion, and stopped at once if the headline is redrawn meanwhile (a slider's live preview).
 */
export function countHeadline(root: ParentNode, from: number | null): void {
  const element = root.querySelector<HTMLElement>(".hero__number");
  const to = captureHeadline(root);
  if (element === null || to === null || from === null || from === to || !motionAllowed()) return;
  const start = performance.now();
  const step = (now: number): void => {
    if (!element.isConnected) return;
    const progress = Math.min(1, (now - start) / COUNT_MS);
    const eased = 1 - (1 - progress) ** 3;
    element.textContent = formatKronor(Math.round(from + (to - from) * eased));
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
