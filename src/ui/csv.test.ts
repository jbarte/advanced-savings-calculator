import { describe, expect, it } from "vitest";
import { figuresCsv, fileBaseName } from "./csv";

const headers = ["Month", "Balance", "Deposited", "Growth", "Withdrawn"];
const rows = [
  { date: { year: 2026, month: 1 }, balance: 5_000_000, deposited: 5_000_000, growth: 0, withdrawn: 0 },
  { date: { year: 2027, month: 1 }, balance: 8_970_449, deposited: 8_600_000, growth: 370_449, withdrawn: 0 },
];

describe("figuresCsv", () => {
  it("starts with a byte-order mark and has a header row and one row a year", () => {
    const csv = figuresCsv(headers, rows, ",");
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv.slice(1).split("\r\n")).toEqual([
      "Month,Balance,Deposited,Growth,Withdrawn",
      "2026-01,50000,50000,0,0",
      "2027-01,89704,86000,3704,0",
      "",
    ]);
  });

  it("uses the separator it is given, and writes months and whole kronor the same in every language", () => {
    const csv = figuresCsv(["Månad", "Saldo", "Insatt", "Tillväxt", "Uttaget"], rows, ";");
    expect(csv.slice(1).split("\r\n")[2]).toBe("2027-01;89704;86000;3704;0");
    expect(csv).toContain("Månad;Saldo");
  });

  it("rounds to whole kronor, halves away from zero, and keeps a minus sign for a loss", () => {
    const csv = figuresCsv(headers, [{ date: { year: 2030, month: 12 }, balance: 150, deposited: 0, growth: -150, withdrawn: 0 }], ",");
    expect(csv.split("\r\n")[1]).toBe("2030-12,2,0,-1,0");
  });

  it("quotes a header that holds the separator or a quote", () => {
    const csv = figuresCsv(['Balance, inflation adjusted', 'Say "hi"', "c", "d", "e"], [], ",");
    expect(csv.slice(1).split("\r\n")[0]).toBe('"Balance, inflation adjusted","Say ""hi""",c,d,e');
  });
});

describe("fileBaseName", () => {
  it("makes a plain file name from a plan's name", () => {
    expect(fileBaseName("Anna's house 2031")).toBe("life-ledger-annas-house-2031");
    expect(fileBaseName("Min plan (kopia)")).toBe("life-ledger-min-plan-kopia");
  });

  it("drops accents from Swedish letters and others", () => {
    expect(fileBaseName("Sparmål för Åsa & Örjan")).toBe("life-ledger-sparmal-for-asa-orjan");
    expect(fileBaseName("Café")).toBe("life-ledger-cafe");
  });

  it("falls back to plan when nothing is left, and keeps the name short", () => {
    expect(fileBaseName("…")).toBe("life-ledger-plan");
    expect(fileBaseName("x".repeat(100)).length).toBe("life-ledger-".length + 60);
  });
});
