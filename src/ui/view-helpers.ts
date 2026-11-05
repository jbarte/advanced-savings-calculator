import { addMonths } from "../core/year-month";
import type { EventStatus, ProjectionPoint, ScenarioView } from "../state/types";
import { formatYearMonth } from "./format";
import { messages } from "./i18n";

export const STATUS_LABELS: Record<EventStatus, string> = {
  planned: messages.status.planned,
  "after-horizon": messages.status.afterHorizon,
  "before-start": messages.status.beforeStart,
};

/** The points up to the plan's horizon, which is where the chart and the headline end. */
export function visiblePoints(scenario: ScenarioView): readonly ProjectionPoint[] {
  return scenario.points.filter((p) => p.month <= scenario.horizonMonths);
}

export function lastPoint(scenario: ScenarioView): ProjectionPoint {
  const points = visiblePoints(scenario);
  const last = points[points.length - 1];
  if (!last) throw new Error(`Scenario "${scenario.id}" has no projection points`);
  return last;
}

export function monthLabel(scenario: ScenarioView, month: number): string {
  return formatYearMonth(addMonths(scenario.start, month));
}
