import { describe, expect, it } from "vitest";
import { readGuideResumeStep, readGuideSeen } from "./guide";

describe("readGuideSeen", () => {
  it("is true only for the saved marker", () => {
    expect(readGuideSeen("1")).toBe(true);
    expect(readGuideSeen(null)).toBe(false);
    expect(readGuideSeen("")).toBe(false);
    expect(readGuideSeen("true")).toBe(false);
  });
});

describe("readGuideResumeStep", () => {
  it("reads the step to reopen at, and 0 for anything else", () => {
    expect(readGuideResumeStep("resume-3")).toBe(3);
    expect(readGuideResumeStep("resume-0")).toBe(0);
    expect(readGuideResumeStep("1")).toBe(0);
    expect(readGuideResumeStep(null)).toBe(0);
    expect(readGuideResumeStep("resume-x")).toBe(0);
  });

  it("is not counted as seen, so the guide opens again", () => {
    expect(readGuideSeen("resume-3")).toBe(false);
  });
});
