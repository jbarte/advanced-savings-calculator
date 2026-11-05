import "./styles/app.css";
import { yearsToMonths } from "./core/year-month";
import { currentYearMonth } from "./state/clock";
import { createBlankPlan, createExamplePlan } from "./state/plan-document";
import type { PlanDocument } from "./state/plan-document";
import { withPlanChange } from "./state/plan-change";
import { updatePlanFields } from "./state/plan-fields";
import { loadSavedPlan, clearSavedPlan, savePlan } from "./state/plan-storage";
import { currentRoute } from "./state/route";
import { STORAGE_BLOCKED_NOTICE, resolveStartupPlan } from "./state/startup-plan";
import { createStore } from "./state/store";
import { depositChangeKey, oneTimeDepositKey, withdrawalKey } from "./state/timeline";
import { addOneTimeDeposit, removeOneTimeDeposit, updateOneTimeDeposit } from "./state/one-time-deposits";
import { loadThemePreference, saveThemePreference, systemPrefersDark } from "./state/theme";
import { PLAN_SCENARIO_ID, buildScenarioView } from "./state/view-model";
import { addDepositChange, removeDepositChange, updateDepositChange } from "./state/deposit-changes";
import { addWithdrawal, removeWithdrawal, updateWithdrawal } from "./state/withdrawals";
import type { Actions } from "./ui/actions";
import { renderApp } from "./ui/app";
import { renderDesignSystem } from "./ui/design-system";
import { renderErrorState } from "./ui/error-state";
import { createRenderScheduler } from "./ui/render-scheduler";
import { applyTheme } from "./ui/theme";

const root = document.getElementById("app");
if (!root) throw new Error("Missing #app element");

const startup = resolveStartupPlan(loadSavedPlan(), createExamplePlan(currentYearMonth()));

const store = createStore({
  scenarioId: PLAN_SCENARIO_ID,
  plan: startup.plan,
  planOrigin: startup.planOrigin,
  storage: startup.storage,
  horizon: 30,
  metric: "balance",
  selectedEvent: null,
  theme: loadThemePreference(),
  notice: startup.notice,
});

/** Keeps the plan in this browser. The blocked notice is shown once, not on every change. */
const persist = (plan: PlanDocument): void => {
  const wasBlocked = store.get().storage === "blocked";
  const saved = savePlan(plan);
  store.update({ storage: saved ? "saved" : "blocked", ...(saved || wasBlocked ? {} : { notice: STORAGE_BLOCKED_NOTICE }) });
};

const commitPlan = (change: (plan: PlanDocument) => PlanDocument): void => {
  const before = store.get().plan;
  store.update(withPlanChange(store.get(), change));
  const { plan } = store.get();
  if (plan !== before) persist(plan);
};

/** Removing the selected event must not leave its key behind, since a later event can reuse the id. */
const deselectIf = (key: string): void => {
  if (store.get().selectedEvent === key) store.update({ selectedEvent: null });
};

const isDark = (): boolean => {
  const { theme } = store.get();
  return theme === "system" ? systemPrefersDark() : theme === "dark";
};

const actions: Actions = {
  selectScenario: (scenarioId) => store.update({ scenarioId }),
  selectMetric: (metric) => store.update({ metric }),
  setHorizon: (horizon) => store.update({ horizon }),
  selectEvent: (selectedEvent) => store.update({ selectedEvent }),
  updatePlan: (patch) => commitPlan((plan) => updatePlanFields(plan, patch)),
  startFromScratch: () => {
    const plan = createBlankPlan(currentYearMonth());
    store.update({ plan, planOrigin: "own", selectedEvent: null, notice: null });
    persist(plan);
  },
  startOver: () => {
    const cleared = clearSavedPlan();
    store.update({
      plan: createExamplePlan(currentYearMonth()),
      planOrigin: "example",
      storage: cleared ? "idle" : "blocked",
      selectedEvent: null,
      notice: cleared ? null : STORAGE_BLOCKED_NOTICE,
    });
  },
  addWithdrawal: (draft) => commitPlan((plan) => addWithdrawal(plan, draft)),
  updateWithdrawal: (id, draft) => commitPlan((plan) => updateWithdrawal(plan, id, draft)),
  removeWithdrawal: (id) => {
    commitPlan((plan) => removeWithdrawal(plan, id));
    deselectIf(withdrawalKey(id));
  },
  addDepositChange: (draft) => commitPlan((plan) => addDepositChange(plan, draft)),
  updateDepositChange: (id, draft) => commitPlan((plan) => updateDepositChange(plan, id, draft)),
  removeDepositChange: (id) => {
    commitPlan((plan) => removeDepositChange(plan, id));
    deselectIf(depositChangeKey(id));
  },
  addOneTimeDeposit: (draft) => commitPlan((plan) => addOneTimeDeposit(plan, draft)),
  updateOneTimeDeposit: (id, draft) => commitPlan((plan) => updateOneTimeDeposit(plan, id, draft)),
  removeOneTimeDeposit: (id) => {
    commitPlan((plan) => removeOneTimeDeposit(plan, id));
    deselectIf(oneTimeDepositKey(id));
  },
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
