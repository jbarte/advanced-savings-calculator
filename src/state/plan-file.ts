import type { PlanDocument } from "./plan-document";
import { failWith } from "./plan-problem";
import { readPlanText } from "./read-plan";

/*
 * A plan as a file: the same document as in a share link, written out readably. A file a person opens is untrusted
 * like a link, so it is read with the same checks, after a size limit (the largest allowed plan is about 10 kB).
 */

/** Text longer than this is not a plan file. Generous: the largest allowed plan, pretty-printed, is under 40 000. */
export const MAX_PLAN_FILE_CHARS = 200_000;

/** The text of a plan file: the plan document as indented JSON. */
export function planFileText(plan: PlanDocument): string {
  return `${JSON.stringify(plan, null, 2)}\n`;
}

/** Reads a plan from the text of a file. Throws a PlanError when it is too large or not a plan. */
export function readPlanFile(text: string): PlanDocument {
  if (text.length > MAX_PLAN_FILE_CHARS) {
    return failWith({ code: "file-too-large" }, `A plan file is at most ${MAX_PLAN_FILE_CHARS} characters`);
  }
  return readPlanText(text);
}
