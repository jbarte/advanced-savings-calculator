import "./styles/app.css";
import { currentYearMonth } from "./state/clock";
import { createBlankPlan, createExamplePlan } from "./state/plan-document";
import { currentRoute } from "./state/route";
import { createStore } from "./state/store";
import { loadThemePreference, saveThemePreference, systemPrefersDark } from "./state/theme";
import { PLAN_SCENARIO_ID, buildScenarioView } from "./state/view-model";
import type { Actions } from "./ui/actions";
import { renderApp } from "./ui/app";
import { renderDesignSystem } from "./ui/design-system";
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
});

const isDark = (): boolean => {
  const { theme } = store.get();
  return theme === "system" ? systemPrefersDark() : theme === "dark";
};

const actions: Actions = {
  selectScenario: (scenarioId) => store.update({ scenarioId }),
  selectMetric: (metric) => store.update({ metric }),
  setHorizon: (horizon) => store.update({ horizon }),
  updatePlan: (patch) => store.update({ plan: { ...store.get().plan, ...patch }, planOrigin: "own" }),
  startFromScratch: () => store.update({ plan: createBlankPlan(currentYearMonth()), planOrigin: "own" }),
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
  if (currentRoute() === "design-system") {
    renderDesignSystem(root, isDark(), actions);
    return;
  }
  const name = state.planOrigin === "example" ? "Example plan" : "My plan";
  renderApp(root, { scenarios: [buildScenarioView(state.plan, name)], state, isDark: isDark() }, actions);
};

store.subscribe(createRenderScheduler(render));
window.addEventListener("hashchange", render);
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", render);
render();
