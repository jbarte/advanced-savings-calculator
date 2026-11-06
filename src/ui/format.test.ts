import { describe, expect, it } from "vitest";
import { formatKronor, formatMoney, formatMoneyCompact, formatSignedMoney, formatSignedMoneyCompact, formatYearMonth, createFormatters, formatPercent } from "./format";

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

describe("signed amounts", () => {
  it("shows a plus for a gain and a minus sign for a loss", () => {
    expect(plain(formatSignedMoney(54_274_305))).toBe("+542 743 kr");
    expect(plain(formatSignedMoney(-81_411_474))).toBe("-814 115 kr");
    expect(formatSignedMoney(-81_411_474).startsWith("\u2212")).toBe(true);
    expect(plain(formatSignedMoney(0))).toBe("0 kr");
  });

  it("works for the short form too", () => {
    expect(plain(formatSignedMoneyCompact(-81_411_474))).toBe("-814.1K kr");
    expect(formatSignedMoneyCompact(54_274_305)).toBe("+542.7K kr");
  });
});


describe("formatYearMonth", () => {
  it("formats as the short month name and the year", () => {
    expect(formatYearMonth({ year: 2031, month: 4 })).toBe("Apr 2031");
  });

  it("names every month, January to December, without shifting to a neighbour", () => {
    const months = Array.from({ length: 12 }, (_, i) => formatYearMonth({ year: 2026, month: i + 1 }));
    expect(months).toEqual(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m) => `${m} 2026`));
  });

  it("handles the years at the ends of the limits", () => {
    expect(formatYearMonth({ year: 2000, month: 1 })).toBe("Jan 2000");
    expect(formatYearMonth({ year: 2140, month: 12 })).toBe("Dec 2140");
  });
});

describe("formatting in Swedish", () => {
  const sv = createFormatters({ locale: { numbers: "sv-SE", decimals: "sv-SE", compact: "sv-SE", dates: "sv" }, currency: "kr" });

  it("names the months the Swedish way", () => {
    expect(sv.formatYearMonth({ year: 2031, month: 4 })).toBe("apr. 2031");
    expect(sv.formatYearMonth({ year: 2031, month: 3 })).toBe("mars 2031");
    expect(sv.formatYearMonth({ year: 2031, month: 6 })).toBe("juni 2031");
  });

  it("writes compact amounts with a decimal comma and Swedish magnitudes", () => {
    expect(plain(sv.formatMoneyCompact(171_609_335))).toBe("1,7 mn kr");
    expect(plain(sv.formatMoneyCompact(300_000_000_000))).toBe("3 md kr");
    expect(plain(sv.formatSignedMoneyCompact(54_274_305))).toBe("+542,7 tn kr");
  });

  it("writes whole amounts as in English, since the currency decides the grouping", () => {
    expect(plain(sv.formatMoney(171_609_335))).toBe("1 716 093 kr");
    expect(plain(sv.formatSignedMoney(-81_411_474))).toBe("-814 115 kr");
  });

  it("writes percentages with a decimal comma", () => {
    expect(sv.formatPercent(6.5)).toBe("6,5");
    expect(sv.formatPercent(7)).toBe("7");
    expect(sv.formatPercent(2.25)).toBe("2,25");
  });
});

describe("formatPercent", () => {
  it("writes the percentage in English with a decimal point and at most two decimals", () => {
    expect(formatPercent(6.5)).toBe("6.5");
    expect(formatPercent(7)).toBe("7");
    expect(formatPercent(1.234)).toBe("1.23");
  });
});
