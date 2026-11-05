import { s } from "./dom";

/** x, top and height of each bar on the 32 × 32 grid. */
const BARS = [
  { x: 6, y: 17, height: 9 },
  { x: 11.5, y: 9, height: 17 },
  { x: 22.5, y: 13, height: 13 },
] as const;
const BAR_WIDTH = 4;

/**
 * The Life Ledger mark: rising ledger bars on a green tile, with one bar cut down to a stub in the withdrawal
 * colour and the next one restarting lower. It shows what the tool is about, the later cost of one decision.
 * Decorative: the wordmark beside it carries the name. `public/favicon.svg` draws the same shape.
 */
export function renderLogo(): SVGSVGElement {
  return s(
    "svg",
    { class: "logo", viewBox: "0 0 32 32", "aria-hidden": "true", focusable: "false" },
    s("rect", { class: "logo__tile", width: 32, height: 32, rx: 8 }),
    ...BARS.map((bar) => s("rect", { class: "logo__bar", x: bar.x, y: bar.y, width: BAR_WIDTH, height: bar.height })),
    s("rect", { class: "logo__gap", x: 17, y: 22.5, width: BAR_WIDTH, height: 3.5 }),
  );
}
