import type { PlanEventKind, PlanProblem } from "../state/plan-problem";
import type { Notice } from "../state/types";
import { formatMoney } from "./format";
import { messages } from "./i18n";

type PerKind = { readonly withdrawal: (max: number) => string; readonly depositChange: (max: number) => string; readonly oneTimeDeposit: (max: number) => string };

function perKind(texts: PerKind, kind: PlanEventKind, max: number): string {
  switch (kind) {
    case "withdrawal":
      return texts.withdrawal(max);
    case "deposit-change":
      return texts.depositChange(max);
    case "one-time-deposit":
      return texts.oneTimeDeposit(max);
  }
}

/** One sentence (without a final full stop) about what is wrong with a plan. */
export function problemText(problem: PlanProblem): string {
  const { problems } = messages;
  switch (problem.code) {
    case "amount":
      return problems.amount(problems.fields[problem.field], formatMoney(problem.min), formatMoney(problem.max));
    case "date":
      return problems.date(problems.fields[problem.field], problem.minYear, problem.maxYear);
    case "percent":
      return problems.percent(problems.fields[problem.field], problem.min, problem.max);
    case "horizon":
      return problems.horizon(problem.min, problem.max);
    case "label":
      return perKind(problems.label, problem.kind, problem.max);
    case "plan-name":
      return problems.planName(problem.max);
    case "too-many":
      return perKind(problems.tooMany, problem.kind, problem.max);
    case "end-before-start":
      return problems.endBeforeStart;
    case "newer-version":
      return problems.newerVersion;
    case "damaged":
      return problems.damaged;
    case "link-damaged":
      return problems.linkDamaged;
    case "link-too-large":
      return problems.linkTooLarge;
    case "link-unsupported":
      return problems.linkUnsupported;
    case "not-a-plan-link":
      return problems.notAPlanLink;
  }
}

/** The words for a notice in the banner and for the screen reader. */
export function noticeText(notice: Notice): string {
  switch (notice.kind) {
    case "change-rejected":
      return messages.notices.changeRejected(problemText(notice.problem));
    case "saved-plan-unreadable":
      return messages.notices.savedPlanUnreadable(problemText(notice.problem));
    case "link-unreadable":
      return messages.notices.linkUnreadable(problemText(notice.problem));
    case "storage-blocked":
      return messages.notices.storageBlocked;
  }
}
