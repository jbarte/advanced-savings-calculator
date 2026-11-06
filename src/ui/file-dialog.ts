import { addMonths } from "../core/year-month";
import { MAX_PLAN_FILE_CHARS } from "../state/plan-file";
import type { ScenarioView } from "../state/types";
import type { Actions } from "./actions";
import { openModal, renderModal } from "./components";
import { figuresCsv, fileBaseName } from "./csv";
import { h } from "./dom";
import { downloadText, pickTextFile } from "./download";
import { messages } from "./i18n";
import { yearlyPoints } from "./view-helpers";

function downloadPlan(actions: Actions): void {
  const { name, text } = actions.planFile();
  if (!downloadText(`${fileBaseName(name)}.json`, text, "application/json")) actions.reportDownloadFailed();
}

/** The yearly figures of the plan as shown: inflation adjusted when that switch is on, like the table under the chart. */
function downloadFigures(scenario: ScenarioView, actions: Actions): void {
  const headers = [
    messages.chart.yearTable.date,
    messages.metrics.balance,
    messages.metrics.deposited,
    messages.metrics.growth,
    messages.metrics.withdrawn,
  ];
  const rows = yearlyPoints(scenario).map((point) => ({ ...point, date: addMonths(scenario.start, point.month) }));
  const csv = figuresCsv(headers, rows, messages.locale.csvSeparator);
  if (!downloadText(`${fileBaseName(scenario.name)}.csv`, csv, "text/csv;charset=utf-8")) actions.reportDownloadFailed();
}

async function openPlanFile(actions: Actions): Promise<void> {
  const picked = await pickTextFile("application/json,.json", MAX_PLAN_FILE_CHARS * 4);
  if (picked !== null) actions.importPlanFile(picked);
}

/** "Plan file": download the open plan, download its yearly figures, or open a plan from a file. */
export function openFileDialog(scenario: ScenarioView, actions: Actions): void {
  const texts = messages.dialogs.planFile;
  const choice = (key: string, title: string, hint: string, onChoose: () => void): HTMLElement =>
    h(
      "button",
      {
        class: "choice",
        type: "button",
        "data-key": key,
        onclick: () => {
          dialog.close();
          onChoose();
        },
      },
      h("strong", {}, title),
      h("span", { class: "choice__hint" }, hint),
    );

  const dialog = renderModal({
    title: texts.title,
    body: h(
      "div",
      { class: "choices" },
      choice("file-download-plan", texts.downloadPlan, texts.downloadPlanHint, () => downloadPlan(actions)),
      choice("file-download-figures", texts.downloadFigures, texts.downloadFiguresHint, () => downloadFigures(scenario, actions)),
      choice("file-open", texts.open, texts.openHint, () => void openPlanFile(actions)),
    ),
    secondaryLabel: messages.common.cancel,
  });
  openModal(dialog);
}
