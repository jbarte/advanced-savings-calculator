import { describe, expect, it } from "vitest";
import { en } from "./en";
import { messages } from "./index";
import { sv } from "./sv";
import type { Messages } from "./messages";

/** Dummy arguments for texts with parts to fill in: numbers and words, and lists of words for the ones that want a list. */
const DUMMY_ARGUMENT_SETS: readonly (readonly unknown[])[] = [
  [1, 2, 3, 4, 5],
  ["a", "b", "c", "d", "e"],
  ["a", "b", ["c"], "d", "e"],
  ["a", ["b"], "c", "d", "e"],
];

function callWithDummies(fn: (...args: unknown[]) => unknown): string {
  for (const args of DUMMY_ARGUMENT_SETS) {
    try {
      return String(fn(...args));
    } catch {
      // This text wants other kinds of arguments: try the next set.
    }
  }
  throw new Error(`No dummy arguments fit ${fn.toString().slice(0, 60)}`);
}

/** Every text in a messages object, with the path it is found at. Functions are called with dummy arguments. */
function collectStrings(value: unknown, path: string, out: [string, string][] = []): [string, string][] {
  if (typeof value === "string") out.push([path, value]);
  else if (typeof value === "function") out.push([path, callWithDummies(value as (...args: unknown[]) => unknown)]);
  else if (typeof value === "object" && value !== null) {
    for (const [key, child] of Object.entries(value)) collectStrings(child, path === "" ? key : `${path}.${key}`, out);
  }
  return out;
}

/** The texts that are the same in Swedish as in English (names, codes, units and separators), by path. */
const SAME_IN_SWEDISH: string[] = [
  "locale.numbers",
  "guide.button",
  "units.currency",
  "units.currencyField",
  "app.brandName",
  "app.brandSuffix",
  "app.pageTitleNamed",
  "events.totalAfter",
  "planCard.heading",
  "planCard.newName",
  "planCard.fields.inflation",
  "planCard.fields.start",
  "compare.headers.plan",
  "compare.valuePart",
  "compare.valueText",
  "chart.tooltipEvent",
  "list.statusHeader",
  "list.nameSeparator",
  "list.period",
];

describe("interface messages", () => {
  it("uses English as the language in use for now", () => {
    expect(messages).toBe(en);
  });

  it.each([["English", en], ["Swedish", sv]] as const)("has no empty %s text", (_name, texts) => {
    const empty = collectStrings(texts, "").filter(([, text]) => text.trim() === "");
    expect(empty).toEqual([]);
  });

  it("puts the parts it is given into the text", () => {
    expect(messages.chart.valueText("Nov 2031", "133 715 kr", ["New car"])).toBe("Nov 2031: 133 715 kr. Events: New car");
    expect(messages.chart.valueText("Nov 2031", "133 715 kr", [])).toBe("Nov 2031: 133 715 kr");
    expect(messages.events.count(1)).toBe("1 event");
    expect(messages.events.count(3)).toBe("3 events");
    expect(messages.goalCard.title("Nov 2056")).toBe("Goal by Nov 2056");
    expect(messages.inputErrors.percentMin(-100)).toBe("Use -100 % or more");
    expect(messages.planCard.renameAria(null)).toBe("Plan: rename");
    expect(messages.planCard.renameAria("House 2031")).toBe('Plan "House 2031": rename');
  });

  it("has the Swedish text for everything in English: no text is left as it is, except the ones that are the same", () => {
    const swedish = new Map(collectStrings(sv, ""));
    const same = collectStrings(en, "")
      .filter(([path, text]) => swedish.get(path) === text)
      .map(([path]) => path);
    expect(same).toEqual(SAME_IN_SWEDISH);
  });

  it("writes the Swedish parts and decimals the Swedish way", () => {
    expect(sv.events.count(1)).toBe("1 händelse");
    expect(sv.events.count(3)).toBe("3 händelser");
    expect(sv.hero.subtitleAdjusted("Min plan", 2.5)).toBe("Min plan · Inflationsjusterat med 2,5 % per år. Det du anger förblir som du skrev det.");
    expect(sv.inputErrors.percentMin(-100)).toBe("Använd -100 % eller mer");
    expect(sv.planCard.renameAria("Hus 2031")).toBe('Plan "Hus 2031": byt namn');
    expect(sv.chart.valueText("nov. 2031", "133 715 kr", ["Ny bil"])).toBe("nov. 2031: 133 715 kr. Händelser: Ny bil");
  });

  it("makes a translation that misses a text, or has the wrong shape, a type error", () => {
    // @ts-expect-error a language that leaves out groups of texts doesn't satisfy Messages
    const incomplete: Messages = { common: en.common };
    // @ts-expect-error a text with parts to fill in must stay a function with the same parameters
    const wrongShape: Messages = { ...en, units: { ...en.units, yearsShort: "years" } };
    expect([incomplete, wrongShape]).toHaveLength(2);
  });

  it("accepts a complete translation of the same shape", () => {
    const complete: Messages = { ...en, common: { ...en.common, save: "Spara" } };
    expect(complete.common.save).toBe("Spara");
  });
});
