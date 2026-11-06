import { describe, expect, it } from "vitest";
import tokensCss from "./tokens.css?raw";

/*
 * Checks the colour tokens against WCAG 2.2: 4.5 : 1 for text and 3 : 1 for the parts of the interface that are not
 * text (focus ring, lines, markers). It reads tokens.css as text, so a colour changed there is checked at once, in both
 * themes. Each pair is a real place where the two colours meet.
 */

type Tokens = Record<string, string>;

function tokensIn(block: string): Tokens {
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((match) => [match[1] ?? "", (match[2] ?? "").trim()]));
}

const darkStart = tokensCss.indexOf(':root[data-theme="dark"]');
const light = tokensIn(tokensCss.slice(tokensCss.indexOf(":root {"), tokensCss.indexOf("@media (prefers-color-scheme: dark)")));
// Tokens the dark theme doesn't redefine (shadows, shapes, the event colours that point at other tokens) come from the light block.
const dark: Tokens = { ...light, ...tokensIn(tokensCss.slice(darkStart)) };

type Rgb = readonly [number, number, number];

function oklchToRgb(l: number, c: number, hue: number): Rgb {
  const a = c * Math.cos((hue * Math.PI) / 180);
  const b = c * Math.sin((hue * Math.PI) / 180);
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;
  const [l3, m3, s3] = [l_ ** 3, m_ ** 3, s_ ** 3];
  const linear = [
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  ];
  const encode = (x: number): number => {
    const clamped = Math.max(0, Math.min(1, x));
    return Math.round((clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055) * 255);
  };
  return [encode(linear[0] ?? 0), encode(linear[1] ?? 0), encode(linear[2] ?? 0)];
}

/** A token's colour, following `var(--other)` references. Only the hex and oklch forms the file uses. */
function colour(tokens: Tokens, name: string): Rgb {
  const value = tokens[name];
  if (value === undefined) throw new Error(`No token --${name}`);
  const reference = value.match(/^var\(--([\w-]+)\)$/);
  if (reference) return colour(tokens, reference[1] ?? "");
  const hex = value.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const digits = hex[1] ?? "000000";
    return [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16)) as unknown as Rgb;
  }
  const oklch = value.match(/^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/);
  if (oklch) return oklchToRgb(Number(oklch[1]), Number(oklch[2]), Number(oklch[3]));
  throw new Error(`--${name} is not a colour this test reads: ${value}`);
}

function luminance([r, g, b]: Rgb): number {
  const channel = (value: number): number => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: Rgb, b: Rgb): number {
  const [light1, dark1] = [Math.max(luminance(a), luminance(b)), Math.min(luminance(a), luminance(b))];
  return (light1 + 0.05) / (dark1 + 0.05);
}

/** Text on a background: foreground token, background token. */
const TEXT_PAIRS: readonly (readonly [string, string])[] = [
  ["muted", "page"],
  ["muted", "frame"],
  ["muted", "surface"],
  ["muted", "fill"],
  ["ink2", "page"],
  ["ink2", "surface"],
  ["ink2", "fill"],
  ["ink", "page"],
  ["ink", "surface"],
  ["ink", "fill"],
  ["on-solid", "solid"],
  ["on-solid-muted", "solid"],
  ["on-solid", "solid-deep"],
  ["on-solid", "kind-withdrawal"],
  ["danger", "page"],
  ["danger", "surface"],
  ["danger", "fill"],
  ["effect-gain", "surface"],
  ["accent-ink", "accent-soft"],
];

/** Parts that are not text: the focus ring, the primary colour and the plan lines and event markers on the card. */
const GRAPHIC_PAIRS: readonly (readonly [string, string])[] = [
  ["focus", "surface"],
  ["focus", "page"],
  ["solid", "surface"],
  ["kind-withdrawal", "surface"],
  ["compare-1", "surface"],
  ["compare-2", "surface"],
  ["compare-3", "surface"],
  ["compare-4", "surface"],
  ["compare-5", "surface"],
  ["compare-6", "surface"],
];

it("reads the tokens, so the checks below are not run against nothing", () => {
  expect(Object.keys(light).length).toBeGreaterThan(30);
  expect(Object.keys(dark).length).toBeGreaterThan(30);
});

describe.each([
  ["light", light],
  ["dark", dark],
] as const)("colour contrast, %s theme", (_theme, tokens) => {
  it.each(TEXT_PAIRS)("keeps --%s readable on --%s (4.5 : 1)", (fg, bg) => {
    expect(contrast(colour(tokens, fg), colour(tokens, bg))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(GRAPHIC_PAIRS)("keeps --%s visible against --%s (3 : 1)", (fg, bg) => {
    expect(contrast(colour(tokens, fg), colour(tokens, bg))).toBeGreaterThanOrEqual(3);
  });
});
