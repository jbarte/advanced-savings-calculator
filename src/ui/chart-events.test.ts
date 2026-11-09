import { describe, expect, it } from "vitest";
import { lanePitch } from "./chart-events";

describe("lanePitch", () => {
  it("keeps full spacing while the lanes fit", () => {
    expect(lanePitch(1)).toBe(26);
    expect(lanePitch(6)).toBe(26);
  });

  it("tightens the spacing so many lanes stay inside the same height", () => {
    expect(lanePitch(12)).toBe(13);
    expect(lanePitch(12) * 12).toBeLessThanOrEqual(156);
  });
});
