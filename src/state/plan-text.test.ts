import { describe, expect, it } from "vitest";
import { cleanText } from "./plan-text";

describe("cleanText", () => {
  it("turns control characters into spaces and trims the ends", () => {
    expect(cleanText("  New\tcar\nfund  ")).toBe("New car fund");
    expect(cleanText("\t\n")).toBe("");
  });

  it("turns the controls that flip the direction of text into spaces, so a name can't be shown backwards", () => {
    expect(cleanText("safe‮drowssap")).toBe("safe drowssap");
    expect(cleanText("a⁦b⁩c")).toBe("a b c");
  });

  it("leaves ordinary text, accents and emoji alone", () => {
    expect(cleanText("Bostad åäö 🏠")).toBe("Bostad åäö 🏠");
  });
});
