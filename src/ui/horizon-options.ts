import { HORIZON_PRESETS } from "../state/types";

/** One button of the horizon switch: how many years it shows, and whether it is the plan's own horizon. */
export interface HorizonOption {
  readonly years: number;
  readonly isPlan: boolean;
}

/**
 * The buttons of the horizon switch: the plan's own horizon first, then the presets (10, 20, 30 years) that differ
 * from it, so no two buttons show the same thing.
 */
export function horizonOptions(planYears: number): readonly HorizonOption[] {
  return [{ years: planYears, isPlan: true }, ...HORIZON_PRESETS.filter((years) => years !== planYears).map((years) => ({ years, isPlan: false }))];
}
