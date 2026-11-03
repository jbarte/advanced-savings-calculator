import "./styles/app.css";
import { yearsToMonths } from "./core/year-month";
import { currentYearMonth } from "./state/clock";
import { createBlankPlan, createExamplePlan } from "./state/plan-document";
import type { PlanDocument } from "./state/plan-document";
import { withPlanChange } from "./state/plan-change";
import { updatePlanFields } from "./state/plan-fields";
import { currentRoute } from "./state/route";
import { createStore } from "./state/store";
import { loadThemePreference, saveThemePreference, systemPrefersDark } from "./state/theme";
import { PLAN_SCENARIO_ID, buildScenarioView } from "./state/view-model";
import { addWithdrawal, removeWithdrawal, updateWithdrawal } from "./state/withdrawals";
import type { Actions } from "./ui/actions";
import { renderApp } from "./ui/app";
import { renderDesignSystem } from "./ui/design-system";
import { renderErrorState } from "./ui/error-state";
import { createRenderScheduler } from "./ui/render-scheduler";
import { applyTheme } from "./ui/theme";

const root = document.getElementById("app");
if (!root) throw new Error("Missing #app element");

const store = createStore({
  scenarioId: PLAN_SCENARIO_ID,
  plan: createExamplePlan(currentYearMonth()),
  planOrigin: "example",
  horizon: 30,
  metric: "balance",
  theme: loadThemePreference(),
  notice: null,
});

const commitPlan = (change: (plan: PlanDocument) => PlanDocument): void => store.update(withPlanChange(store.get(), change));

const isDark = (): boolean => {
  const { theme } = store.get();
  return theme === "system" ? systemPrefersDark() : theme === "dark";
};

const actions: Actions = {
  selectScenario: (scenarioId) => store.update({ scenarioId }),
  selectMetric: (metric) => store.update({ metric }),
  setHorizon: (horizon) => store.update({ horizon }),
  updatePlan: (patch) => commitPlan((plan) => updatePlanFields(plan, patch)),
  startFromScratch: () => store.update({ plan: createBlankPlan(currentYearMonth()), planOrigin: "own", notice: null }),
  addWithdrawal: (draft) => commitPlan((plan) => addWithdrawal(plan, draft)),
  updateWithdrawal: (id, draft) => commitPlan((plan) => updateWithdrawal(plan, id, draft)),
  removeWithdrawal: (id) => commitPlan((plan) => removeWithdrawal(plan, id)),
  dismissNotice: () => store.update({ notice: null }),
  toggleTheme: () => {
    const theme = isDark() ? "light" : "dark";
    saveThemePreference(theme);
    store.update({ theme });
  },
  copyShareLink: async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      return true;
    } catch {
      return false;
    }
  },
};

const render = (): void => {
  const state = store.get();
  applyTheme(state.theme);
  try {
    if (currentRoute() === "design-system") {
      renderDesignSystem(root, isDark(), actions);
      return;
    }
    const name = state.planOrigin === "example" ? "Example plan" : "My plan";
    const scenarios = [buildScenarioView(state.plan, name, yearsToMonths(state.horizon))];
    renderApp(root, { scenarios, state, isDark: isDark() }, actions);
  } catch (error) {
    console.error(error);
    renderErrorState(root, error, actions);
  }
};

store.subscribe(createRenderScheduler(render));
window.addEventListener("hashchange", render);
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", render);
render();
