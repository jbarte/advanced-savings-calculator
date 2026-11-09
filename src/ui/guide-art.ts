import { s } from "./dom";

type Art = () => SVGSVGElement;

const art = (...children: SVGElement[]): SVGSVGElement =>
  s("svg", { class: "gart", viewBox: "0 0 240 120", "aria-hidden": "true", focusable: "false" }, ...children);

const axes = (d = "M20 10V100H228"): SVGElement => s("path", { class: "gart__axis", d });
const line = (d: string, extra = ""): SVGElement => s("path", { class: `gart__line${extra}`, d, pathLength: 1 });
const badge = (x: number, y: number, kind: string, label: string): SVGElement =>
  s(
    "g",
    { class: "gart__event" },
    s("line", { class: "gart__axis", x1: x, y1: y + 9, x2: x, y2: 100 }),
    s("circle", { class: `gart__badge gart__badge--${kind}`, cx: x, cy: y, r: 9 }),
    s("text", { class: "gart__badge-text", x, y: y + 3.5, "text-anchor": "middle" }, label),
  );
const track = (y: number, thumbX: number): SVGElement[] => [
  s("rect", { class: "gart__track", x: 70, y: y - 3, width: 150, height: 6, rx: 3 }),
  s("rect", { class: "gart__fill", x: 70, y: y - 3, width: thumbX - 70, height: 6, rx: 3 }),
  s("circle", { class: "gart__thumb", cx: thumbX, cy: y, r: 8 }),
  s("rect", { class: "gart__label", x: 20, y: y - 4, width: 36, height: 8, rx: 4 }),
];

/** What the tool is about: a savings curve and the dip one withdrawal makes in it. */
const intro: Art = () =>
  art(
    axes(),
    line("M20 96 C60 90 90 74 120 58 L120 76 C150 62 190 38 226 18"),
    line("M120 58 C160 46 195 28 226 10", " gart__line--ghost"),
    s("circle", { class: "gart__badge gart__badge--withdrawal", cx: 120, cy: 67, r: 5 }),
  );

/** The Plan card: four fields with a slider each. */
const plan: Art = () => art(...track(18, 110), ...track(46, 160), ...track(74, 90), ...track(102, 190));

/** The chart and its horizon switch. */
const chart: Art = () =>
  art(
    axes("M20 6V84H228"),
    line("M20 80 C70 74 110 56 150 36 C180 22 205 14 226 8"),
    s("line", { class: "gart__cursor", x1: 150, y1: 6, x2: 150, y2: 84 }),
    s("circle", { class: "gart__thumb", cx: 150, cy: 36, r: 5 }),
    ...[0, 1, 2, 3].map((i) =>
      s("rect", { class: i === 0 ? "gart__pill gart__pill--on" : "gart__pill", x: 62 + i * 30, y: 98, width: 26, height: 14, rx: 7 }),
    ),
  );

/** Events: three kinds, numbered like the list. */
const events: Art = () =>
  art(
    axes(),
    s("rect", { class: "gart__band", x: 150, y: 10, width: 36, height: 90 }),
    line("M20 94 C50 88 70 80 90 70 L90 82 C120 74 150 70 186 62 C200 52 214 40 226 28"),
    badge(90, 24, "withdrawal", "1"),
    badge(150, 24, "deposit-change", "2"),
    badge(204, 24, "one-time", "3"),
  );

/** A goal: a dashed line at the amount that the curve climbs towards. */
const goal: Art = () =>
  art(
    axes(),
    s("line", { class: "gart__goal", x1: 20, y1: 30, x2: 228, y2: 30 }),
    line("M20 96 C70 90 120 74 170 52 C190 42 205 34 214 30"),
    s("circle", { class: "gart__thumb", cx: 214, cy: 30, r: 6 }),
    s("path", { class: "gart__flag", d: "M214 30V12L232 18L214 24" }),
  );

/** Compare, share and save: three plan lines and a link. */
const share: Art = () =>
  art(
    axes("M20 6V84H150"),
    line("M20 80 C50 76 90 60 150 30", " gart__line--one"),
    line("M20 80 C50 78 90 70 150 54", " gart__line--two"),
    line("M20 80 C50 80 90 78 150 68", " gart__line--three"),
    s("rect", { class: "gart__link", x: 172, y: 34, width: 40, height: 22, rx: 11 }),
    s("rect", { class: "gart__link", x: 192, y: 48, width: 40, height: 22, rx: 11 }),
    s("rect", { class: "gart__pill gart__pill--on", x: 172, y: 92, width: 56, height: 14, rx: 7 }),
  );

/** One illustration per step, in the order of `messages.guide.steps`. */
export const GUIDE_ART: readonly Art[] = [intro, plan, chart, events, goal, share];
