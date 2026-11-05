import { describe, expect, it } from "vitest";
import type { PlanProblem } from "../state/plan-problem";
import { noticeText, problemText } from "./notice-text";

const plain = (text: string): string => text.replace(/[  ]/g, " ");

/** One problem of every code, so a new code without words fails here as well as in the type check. */
const EVERY_PROBLEM: readonly PlanProblem[] = [
  { code: "amount", field: "startAmount", min: 0, max: 10_000_000_000 },
  { code: "date", field: "goalDate", minYear: 2000, maxYear: 2140 },
  { code: "percent", field: "annualReturn", min: -100, max: 30 },
  { code: "horizon", min: 1, max: 40 },
  { code: "label", kind: "deposit-change", max: 40 },
  { code: "too-many", kind: "one-time-deposit", max: 10 },
  { code: "end-before-start" },
  { code: "newer-version" },
  { code: "damaged" },
  { code: "link-damaged" },
  { code: "link-too-large" },
  { code: "link-unsupported" },
  { code: "not-a-plan-link" },
];

describe("problemText", () => {
  it("has words for every problem", () => {
    const texts = EVERY_PROBLEM.map(problemText);
    expect(texts.every((text) => text.trim().length > 0)).toBe(true);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it("names the field and shows amounts in kronor, not öre", () => {
    expect(plain(problemText({ code: "amount", field: "startAmount", min: 0, max: 10_000_000_000 }))).toBe(
      "Start amount must be from 0 kr to 100 000 000 kr",
    );
  });

  it("names the kind of event in limits on lists and labels", () => {
    expect(problemText({ code: "too-many", kind: "withdrawal", max: 50 })).toBe("A plan can have at most 50 withdrawals");
    expect(problemText({ code: "label", kind: "one-time-deposit", max: 40 })).toBe("A one-time deposit label must be 1 to 40 characters");
  });

  it("gives percent limits and years as they are", () => {
    expect(problemText({ code: "percent", field: "inflation", min: -5, max: 20 })).toBe("Inflation must be from -5 % to 20 %");
    expect(problemText({ code: "date", field: "startDate", minYear: 2000, maxYear: 2100 })).toBe("Start date must be a month from 2000 to 2100");
  });
});

describe("noticeText", () => {
  const problem: PlanProblem = { code: "damaged" };

  it("words each kind of notice around the problem", () => {
    expect(noticeText({ kind: "change-rejected", problem })).toBe("That change was not applied. It is damaged");
    expect(noticeText({ kind: "saved-plan-unreadable", problem })).toBe(
      "Your saved plan could not be read, so the example plan is shown. It is damaged. Your next change replaces the saved plan.",
    );
    expect(noticeText({ kind: "link-unreadable", problem: { code: "not-a-plan-link" } })).toBe(
      "That link could not be opened. This is not a plan link. Your own plan is shown instead.",
    );
    expect(noticeText({ kind: "storage-blocked" })).toMatch(/not be kept/);
  });
});
