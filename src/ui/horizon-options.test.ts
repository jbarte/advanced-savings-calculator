import { describe, expect, it } from "vitest";
import { horizonOptions } from "./horizon-options";

describe("horizonOptions", () => {
  it("puts the plan's own horizon first, then every preset", () => {
    expect(horizonOptions(25)).toEqual([
      { years: 25, isPlan: true },
      { years: 10, isPlan: false },
      { years: 20, isPlan: false },
      { years: 30, isPlan: false },
    ]);
  });

  it("leaves out the preset that is the same as the plan's horizon", () => {
    expect(horizonOptions(30).map((option) => option.years)).toEqual([30, 10, 20]);
    expect(horizonOptions(10).map((option) => option.years)).toEqual([10, 20, 30]);
  });

  it("works at the ends of the limits", () => {
    expect(horizonOptions(1).map((option) => option.years)).toEqual([1, 10, 20, 30]);
    expect(horizonOptions(40).map((option) => option.years)).toEqual([40, 10, 20, 30]);
  });
});
