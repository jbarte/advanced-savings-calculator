import { describe, expect, it } from "vitest";
import { requiredDepositText } from "./goal-text";

/** Intl uses a non-breaking space; tests compare with plain text. */
const plain = (text: string): string => text.replace(/[  ]/g, " ");

describe("requiredDepositText", () => {
  it("says how much more than today's deposit is needed", () => {
    const text = requiredDepositText(379_110, 300_000);
    expect(plain(text.value)).toBe("3 791 kr/mo");
    expect(plain(text.note)).toBe("791 kr/mo more than your deposit now");
  });

  it("says how much less when the goal needs less than today's deposit", () => {
    expect(plain(requiredDepositText(208_089, 300_000).note)).toBe("919 kr/mo less than your deposit now");
  });

  it("says when it is the same", () => {
    expect(requiredDepositText(300_000, 300_000).note).toBe("The same as your deposit now");
  });

  it("says when no saving is needed", () => {
    expect(requiredDepositText(0, 300_000)).toEqual({ value: "Nothing", note: "You reach the goal without a monthly deposit" });
  });

  it("says when the goal can't be reached", () => {
    const text = requiredDepositText(null, 300_000);
    expect(text.value).toBe("Not reachable");
    expect(text.note).toMatch(/largest/);
  });
});
