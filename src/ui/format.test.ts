import { describe, expect, it } from "vitest";
import { formatKronor, formatMoney, formatMoneyCompact } from "./format";

/** Intl uses a non-breaking (or narrow no-break) space and a Unicode minus; tests compare with plain text. */
const plain = (text: string): string => text.replace(/[  ]/g, " ").replace(/−/g, "-");

describe("formatKronor", () => {
  it("shows whole kronor with spaces between thousands", () => {
    expect(plain(formatKronor(171_609_335))).toBe("1 716 093");
    expect(plain(formatKronor(0))).toBe("0");
  });

  it("rounds to whole kronor", () => {
    expect(plain(formatKronor(149))).toBe("1");
    expect(plain(formatKronor(150))).toBe("2");
  });

  it("shows a negative amount with a minus sign", () => {
    expect(plain(formatKronor(-250_000))).toBe("-2 500");
  });

  it("uses a space that doesn't break, so an amount never wraps", () => {
    expect(formatKronor(100_000_000)).not.toContain(" ");
  });
});

describe("formatMoney and formatMoneyCompact", () => {
  it("adds the unit", () => {
    expect(plain(formatMoney(171_609_335))).toBe("1 716 093 kr");
  });

  it("shortens large amounts", () => {
    expect(formatMoneyCompact(171_609_335)).toBe("1.7M kr");
    expect(formatMoneyCompact(66_411_474)).toBe("664.1K kr");
    expect(formatMoneyCompact(50_000)).toBe("500 kr");
  });
});
