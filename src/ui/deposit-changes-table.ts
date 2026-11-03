import { formatYearMonth } from "../core/year-month";
import type { PlannedDepositChange, ScenarioView } from "../state/types";
import type { Actions } from "./actions";
import { openDepositChangeDialog } from "./deposit-change-dialog";
import { h } from "./dom";
import { formatMoney } from "./format";
import { STATUS_LABELS, initials } from "./view-helpers";

function periodText(change: PlannedDepositChange): string {
  const from = formatYearMonth(change.startDate);
  return change.endDate === null ? `From ${from}, no end` : `${from} – ${formatYearMonth(change.endDate)}`;
}

function renderRow(scenario: ScenarioView, change: PlannedDepositChange, actions: Actions): HTMLElement {
  return h(
    "div",
    { class: "table__row table__row--deposit", role: "row" },
    h(
      "div",
      { class: "table__who", role: "cell" },
      h("div", { class: "table__badge", "aria-hidden": "true" }, initials(change.label)),
      h("div", {}, h("div", { class: "table__title" }, change.label), h("div", { class: "table__sub" }, periodText(change))),
    ),
    h("div", { class: "table__amount", role: "cell" }, change.amount === 0 ? "Paused" : `${formatMoney(change.amount)}/mo`),
    h("div", { class: "table__chips", role: "cell" }, h("span", { class: "chip" }, STATUS_LABELS[change.status])),
    h(
      "div",
      { class: "table__actions", role: "cell" },
      h(
        "button",
        {
          class: "btn-text",
          type: "button",
          "data-key": `deposit-edit-${change.id}`,
          "aria-label": `Edit ${change.label}`,
          onclick: () =>
            openDepositChangeDialog({
              start: scenario.start,
              initial: { label: change.label, amount: change.amount, startDate: change.startDate, endDate: change.endDate },
              onSave: (draft) => actions.updateDepositChange(change.id, draft),
            }),
        },
        "Edit",
      ),
      h(
        "button",
        {
          class: "btn-text btn-text--danger",
          type: "button",
          "data-key": `deposit-remove-${change.id}`,
          "aria-label": `Remove ${change.label}`,
          onclick: () => actions.removeDepositChange(change.id),
        },
        "Remove",
      ),
    ),
  );
}

/** The table of deposit changes. Call it only when there is at least one. */
export function renderDepositChangesTable(scenario: ScenarioView, actions: Actions): HTMLElement {
  const head = h(
    "div",
    { class: "table__row table__row--deposit table__row--head", role: "row" },
    h("span", { role: "columnheader" }, "Deposit change"),
    h("span", { role: "columnheader" }, "New deposit"),
    h("span", { role: "columnheader" }, "Status"),
    h("span", { class: "visually-hidden", role: "columnheader" }, "Actions"),
  );
  return h(
    "div",
    { class: "table-card" },
    h(
      "div",
      { class: "table", role: "table", "aria-label": "Deposit changes" },
      head,
      ...scenario.depositChanges.map((change) => renderRow(scenario, change, actions)),
    ),
  );
}
