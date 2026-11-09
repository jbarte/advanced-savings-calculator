import { describe, expect, it } from "vitest";
import { readGuideSeen } from "./guide";

describe("readGuideSeen", () => {
  it("is true only for the saved marker", () => {
    expect(readGuideSeen("1")).toBe(true);
    expect(readGuideSeen(null)).toBe(false);
    expect(readGuideSeen("")).toBe(false);
    expect(readGuideSeen("true")).toBe(false);
  });
});
