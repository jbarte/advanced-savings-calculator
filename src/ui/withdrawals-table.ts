import { formatYearMonth, yearsToMonths } from "../core/year-month";
import type { AppState, PlannedWithdrawal, ScenarioView } from "../state/types";
import type { Actions } from "./actions";
import { h } from "./dom";
import { formatMoney, formatMoneyCompact } from "./format";
import { STATUS_LABELS, initials, monthLabel } from "./view-helpers";
import { openWithdrawalDialog } from "./withdrawal-dialog";

function renderRow(
  scenario: ScenarioView,
  withdrawal: PlannedWithdrawal,
  maxCost: number,
  actions: Actions,
): HTMLElement {
  const counted = withdrawal.status === "planned";
  const reduced = counted && withdrawal.shortfall > 0;
  const when = formatYearMonth(withdrawal.date);

  const chips = h(
    "div",
    { class: "table__chips", role: "cell" },
    h("span", { class: "chip" }, STATUS_LABELS[withdrawal.status]),
    reduced ? h("span", { class: "chip chip--warn" }, "Reduced") : null,
  );

  return h(
    "div",
    { class: "table__row", role: "row" },
    h(
      "div",
      { class: "table__who", role: "cell" },
      h("div", { class: "table__badge", "aria-hidden": "true" }, initials(withdrawal.label)),
      h(
        "div",
        {},
        h("div", { class: "table__title" }, withdrawal.label),
        h("div", { class: "table__sub" }, reduced ? `${when} · only ${formatMoney(withdrawal.applied)} was available` : when),
      ),
    ),
    h("div", { class: "table__amount", role: "cell" }, formatMoney(withdrawal.amount)),
    chips,
    h(
      "div",
      { class: "impact", role: "cell" },
      h("div", { class: "impact__track" }, h("div", { class: "impact__fill", style: `width:${counted ? (withdrawal.lostGrowth / maxCost) * 100 : 0}%` })),
      h("span", { class: "impact__value", title: counted ? formatMoney(withdrawal.lostGrowth) : undefined }, counted ? formatMoneyCompact(withdrawal.lostGrowth) : "–"),
    ),
    h(
      "div",
      { class: "table__actions", role: "cell" },
      h(
        "button",
        {
          class: "btn-text",
          type: "button",
          "data-key": `withdrawal-edit-${withdrawal.id}`,
          "aria-label": `Edit ${withdrawal.label}`,
          onclick: () =>
            openWithdrawalDialog({
              start: scenario.start,
              initial: { label: withdrawal.label, amount: withdrawal.amount, date: withdrawal.date },
              onSave: (draft) => actions.updateWithdrawal(withdrawal.id, draft),
            }),
        },
        "Edit",
      ),
      h(
        "button",
        {
          class: "btn-text btn-text--danger",
          type: "button",
          "data-key": `withdrawal-remove-${withdrawal.id}`,
          "aria-label": `Remove ${withdrawal.label}`,
          onclick: () => actions.removeWithdrawal(withdrawal.id),
        },
        "Remove",
      ),
    ),
  );
}

/** The table of withdrawals. Call it only when there is at least one. */
export function renderWithdrawalsTable(scenario: ScenarioView, state: AppState, actions: Actions): HTMLElement {
  const { withdrawals } = scenario;
  const endLabel = monthLabel(scenario, yearsToMonths(state.horizon));
  const maxCost = Math.max(1, ...withdrawals.filter((w) => w.status === "planned").map((w) => w.lostGrowth));

  const head = h(
    "div",
    { class: "table__row table__row--head", role: "row" },
    h("span", { role: "columnheader" }, "Withdrawal"),
    h("span", { role: "columnheader" }, "Amount"),
    h("span", { role: "columnheader" }, "Status"),
    h("span", { role: "columnheader" }, `Lost growth by ${endLabel}`),
    h("span", { class: "visually-hidden", role: "columnheader" }, "Actions"),
  );

  return h(
    "div",
    { class: "table-card" },
    h("div", { class: "table", role: "table", "aria-label": "Withdrawals" }, head, ...withdrawals.map((w) => renderRow(scenario, w, maxCost, actions))),
  );
}
