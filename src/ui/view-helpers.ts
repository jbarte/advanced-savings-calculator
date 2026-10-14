import { addMonths, formatYearMonth } from "../core/year-month";
import type { HorizonYears, ProjectionPoint, ScenarioView } from "../state/types";

export function visiblePoints(scenario: ScenarioView, horizon: HorizonYears): readonly ProjectionPoint[] {
  return scenario.points.filter((p) => p.month <= horizon * 12);
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

export function initials(text: string): string {
  return text
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}
