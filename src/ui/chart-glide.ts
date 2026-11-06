import { interpolatePath } from "./chart-geometry";

/** How long the chart takes to glide from the old shape to the new one. */
const GLIDE_MS = 280;

/** The paths drawn in every chart on the page, in page order: one list of `d` values for each chart's SVG. */
export type DrawnCharts = readonly (readonly string[])[];

function motionAllowed(): boolean {
  try {
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return true;
  }
}

/** What the charts on the page draw now, read before the page is drawn again. */
export function captureCharts(root: ParentNode): DrawnCharts {
  return [...root.querySelectorAll(".chart__svg")].map((svg) => [...svg.querySelectorAll("path")].map((path) => path.getAttribute("d") ?? ""));
}

const easeOut = (t: number): number => 1 - (1 - t) ** 3;

/**
 * Moves each chart line and area from where it was drawn before to where it is now, so a change in the plan glides
 * instead of jumping. A path whose number of points changed (another horizon) or that is new just appears, and nothing
 * moves when the system asks for less motion. It runs with the page's own frames and stops when its chart is gone.
 */
export function glideCharts(root: ParentNode, before: DrawnCharts): void {
  if (!motionAllowed()) return;
  const moves: { readonly path: Element; readonly from: string; readonly to: string }[] = [];
  [...root.querySelectorAll(".chart__svg")].forEach((svg, chart) => {
    const old = before[chart];
    if (!old) return;
    [...svg.querySelectorAll("path")].forEach((path, i) => {
      const from = old[i];
      const to = path.getAttribute("d");
      if (from !== undefined && to !== null && from !== to && interpolatePath(from, to, 0.5) !== null) moves.push({ path, from, to });
    });
  });
  if (moves.length === 0) return;

  const started = performance.now();
  const step = (now: number): void => {
    const t = Math.min(1, (now - started) / GLIDE_MS);
    let alive = false;
    for (const { path, from, to } of moves) {
      if (!path.isConnected) continue;
      alive = true;
      path.setAttribute("d", interpolatePath(from, to, easeOut(t)) ?? to);
    }
    if (alive && t < 1) requestAnimationFrame(step);
  };
  // Start from the old shape in the same frame the new one is put in, so there is no flash of the final shape.
  for (const { path, from } of moves) path.setAttribute("d", from);
  requestAnimationFrame(step);
}
