import "./styles/app.css";
import { yearsToMonths } from "./core/year-month";
import { currentYearMonth } from "./state/clock";
import { createBlankPlan, createExamplePlan } from "./state/plan-document";
import type { PlanDocument } from "./state/plan-document";
import { withPlanChange } from "./state/plan-change";
import { updatePlanFields } from "./state/plan-fields";
import { loadSavedPlan, clearSavedPlan, savePlan } from "./state/plan-storage";
import { clearShareHash, currentPageUrl, currentRoute, sharedPlanToken } from "./state/route";
import { buildShareUrl, decodePlan, encodePlan } from "./state/share-link";
import { STORAGE_BLOCKED_NOTICE, resolveStartupPlan } from "./state/startup-plan";
import { createStore } from "./state/store";
import { depositChangeKey, oneTimeDepositKey, withdrawalKey } from "./state/timeline";
import { addOneTimeDeposit, removeOneTimeDeposit, updateOneTimeDeposit } from "./state/one-time-deposits";
import { loadThemePreference, onSystemThemeChange, saveThemePreference, systemPrefersDark } from "./state/theme";
import { PLAN_SCENARIO_ID, applyInflationAdjustment, createScenarioViewCache } from "./state/view-model";
import { clearGoal, setGoal } from "./state/goal";
import { addDepositChange, removeDepositChange, updateDepositChange } from "./state/deposit-changes";
import { addWithdrawal, removeWithdrawal, updateWithdrawal } from "./state/withdrawals";
import type { Actions } from "./ui/actions";
import { renderApp } from "./ui/app";
import { renderDesignSystem } from "./ui/design-system";
import { renderErrorState } from "./ui/error-state";
import { createRenderScheduler } from "./ui/render-scheduler";
import { applyTheme } from "./ui/theme";
import { messages } from "./ui/i18n";

const root = document.getElementById("app");
if (!root) throw new Error("Missing #app element");

const startup = resolveStartupPlan(loadSavedPlan(), createExamplePlan(currentYearMonth()));

const store = createStore({
  scenarioId: PLAN_SCENARIO_ID,
  plan: startup.plan,
  planOrigin: startup.planOrigin,
  storage: startup.storage,
  metric: "balance",
  selectedEvent: null,
  inflationAdjusted: false,
  chartMonth: null,
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
  // A plan opened from a share link is a copy: it is only saved when the user chooses to keep it.
  if (plan !== before && store.get().planOrigin !== "shared") persist(plan);
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
  selectEvent: (selectedEvent, month) => store.update({ selectedEvent, ...(month === undefined ? {} : { chartMonth: month }) }),
  setChartMonth: (chartMonth) => store.update({ chartMonth }),
  setInflationAdjusted: (inflationAdjusted) => store.update({ inflationAdjusted }),
  updatePlan: (patch) => commitPlan((plan) => updatePlanFields(plan, patch)),
  startFromScratch: () => {
    const plan = createBlankPlan(currentYearMonth());
    store.update({ plan, planOrigin: "own", selectedEvent: null, chartMonth: null, notice: null });
    persist(plan);
    clearShareHash();
  },
  startOver: () => {
    const cleared = clearSavedPlan();
    store.update({
      plan: createExamplePlan(currentYearMonth()),
      planOrigin: "example",
      storage: cleared ? "idle" : "blocked",
      selectedEvent: null,
      chartMonth: null,
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
  setGoal: (goal) => commitPlan((plan) => setGoal(plan, goal)),
  clearGoal: () => commitPlan((plan) => clearGoal(plan)),
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
  createShareLink: async () => buildShareUrl(currentPageUrl(), await encodePlan(store.get().plan)),
  copyToClipboard: async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  },
  keepSharedPlan: () => {
    const saved = savePlan(store.get().plan);
    store.update({
      planOrigin: "own",
      storage: saved ? "saved" : "blocked",
      notice: saved ? null : STORAGE_BLOCKED_NOTICE,
    });
    clearShareHash();
  },
  leaveSharedPlan: () => {
    const back = resolveStartupPlan(loadSavedPlan(), createExamplePlan(currentYearMonth()));
    store.update({ ...back, selectedEvent: null, chartMonth: null });
    clearShareHash();
  },
};

/** Opens the plan in a share link as a copy. A bad link leaves the user's own plan alone and says why. */
const openSharedPlan = async (token: string): Promise<void> => {
  try {
    const plan = await decodePlan(token);
    store.update({ plan, planOrigin: "shared", storage: "idle", selectedEvent: null, chartMonth: null, notice: null });
  } catch (error) {
    if (!(error instanceof RangeError)) {
      console.error(error);
      renderErrorState(root, error, actions);
      return;
    }
    clearShareHash();
    store.update({ notice: `That link could not be opened. ${error.message}. Your own plan is shown instead.` });
  }
};

/** Runs the engine only when the plan or horizon changes, not on selection, theme or notice changes. */
const scenarioView = createScenarioViewCache();

const render = (): void => {
  const state = store.get();
  applyTheme(state.theme);
  try {
    if (currentRoute() === "design-system") {
      renderDesignSystem(root, isDark(), actions);
      return;
    }
    const name = messages.planCard.names[state.planOrigin];
    const nominal = scenarioView(state.plan, name, yearsToMonths(state.plan.horizonYears));
    const scenarios = [state.inflationAdjusted ? applyInflationAdjustment(nominal, state.plan.inflationPct) : nominal];
    renderApp(root, { scenarios, state, isDark: isDark() }, actions);
  } catch (error) {
    console.error(error);
    renderErrorState(root, error, actions);
  }
};

store.subscribe(createRenderScheduler(render));
window.addEventListener("hashchange", () => {
  const token = sharedPlanToken();
  if (token === null) render();
  else void openSharedPlan(token);
});
onSystemThemeChange(render);
// A share link is opened before the first draw, so the user's own plan doesn't flash first.
const linkToken = sharedPlanToken();
if (linkToken === null) render();
else void openSharedPlan(linkToken);
