import { addMonths, formatYearMonth, yearsToMonths } from "../core/year-month";
import type { EventStatus, HorizonYears, ProjectionPoint, ScenarioView } from "../state/types";

export const STATUS_LABELS: Record<EventStatus, string> = {
  planned: "Planned",
  "after-horizon": "After horizon",
  "before-start": "Before start",
};

export function visiblePoints(scenario: ScenarioView, horizon: HorizonYears): readonly ProjectionPoint[] {
  return scenario.points.filter((p) => p.month <= yearsToMonths(horizon));
}

export function lastPoint(scenario: ScenarioView, horizon: HorizonYears): ProjectionPoint {
  const points = visiblePoints(scenario, horizon);
  const last = points[points.length - 1];
  if (!last) throw new Error(`Scenario "${scenario.id}" has no projection points`);
  return last;
}

export function monthLabel(scenario: ScenarioView, month: number): string {
  return formatYearMonth(addMonths(scenario.start, month));
}
