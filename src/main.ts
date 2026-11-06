import "./styles/fonts.css";
import "./styles/app.css";
import { yearsToMonths } from "./core/year-month";
import { currentYearMonth } from "./state/clock";
import { loadCollapsed, saveCollapsed, toggleCollapsed } from "./state/collapsed";
import { saveLanguagePreference } from "./state/language";
import { createBlankPlan, createExamplePlan } from "./state/plan-document";
import type { PlanDocument, PlanFields } from "./state/plan-document";
import { withPlanChange } from "./state/plan-change";
import { problemOf } from "./state/plan-problem";
import { updatePlanFields } from "./state/plan-fields";
import { fitPlanName, renamePlan } from "./state/plan-name";
import { planWithoutEvent } from "./state/plan-variants";
import { planFileText, readPlanFile } from "./state/plan-file";
import { activeEntry, addPlan, deletePlan, keepSharedPlan, leaveSharedPlan, openSharedPlan as addSharedPlan, selectPlan, withPlanSetChange } from "./state/workspace";
import type { AppState, PlanEntry, PlanSet, ScenarioView } from "./state/types";
import { clearSavedPlans, loadSavedPlans, savePlans } from "./state/plan-storage";
import { clearShareHash, currentPageUrl, currentRoute, sharedPlanToken } from "./state/route";
import { buildShareUrl, decodePlan, encodePlan } from "./state/share-link";
import { STORAGE_BLOCKED_NOTICE, resolveStartupPlan } from "./state/startup-plan";
import { createStore } from "./state/store";
import { depositChangeKey, oneTimeDepositKey, withdrawalKey } from "./state/timeline";
import { addOneTimeDeposit, removeOneTimeDeposit, updateOneTimeDeposit } from "./state/one-time-deposits";
import { loadThemePreference, onSystemThemeChange, saveThemePreference, systemPrefersDark } from "./state/theme";
import { applyInflationAdjustment, buildScenarioView, createScenarioViewCache } from "./state/view-model";
import { clearGoal, setGoal } from "./state/goal";
import { addDepositChange, removeDepositChange, updateDepositChange } from "./state/deposit-changes";
import { addWithdrawal, removeWithdrawal, updateWithdrawal } from "./state/withdrawals";
import type { Actions } from "./ui/actions";
import { renderApp } from "./ui/app";
import { renderDesignSystem } from "./ui/design-system";
import { renderErrorState } from "./ui/error-state";
import { createRenderScheduler } from "./ui/render-scheduler";
import { applyLanguage } from "./ui/language";
import { preparePrinting } from "./ui/print";
import { applyTheme } from "./ui/theme";
import { messages } from "./ui/i18n";

applyLanguage();
preparePrinting();

const root = document.getElementById("app");
if (!root) throw new Error("Missing #app element");

const startup = resolveStartupPlan(loadSavedPlans(), createExamplePlan(currentYearMonth(), messages.example.carLabel));

const store = createStore({
  plans: startup.plans,
  activeId: startup.activeId,
  returnId: startup.returnId,
  storage: startup.storage,
  metric: "balance",
  selectedEvent: null,
  viewHorizonYears: null,
  collapsed: loadCollapsed(),
  yearTableOpen: false,
  inflationAdjusted: false,
  chartMonth: null,
  theme: loadThemePreference(),
  notice: startup.notice,
});

/** Keeps the user's plans in this browser. The blocked notice is shown once, not on every change. */
const persist = (): void => {
  const wasBlocked = store.get().storage === "blocked";
  const saved = savePlans(store.get());
  store.update({ storage: saved ? "saved" : "blocked", ...(saved || wasBlocked ? {} : { notice: STORAGE_BLOCKED_NOTICE }) });
};

/** True when the open plan is the user's own (saved), not one opened from a share link. */
const isOwnPlan = (): boolean => activeEntry(store.get()).origin !== "shared";

const commitPlan = (change: (plan: PlanDocument) => PlanDocument): void => {
  const before = activeEntry(store.get()).plan;
  store.update(withPlanChange(store.get(), change));
  // A plan opened from a share link is a copy: it is only saved when the user chooses to keep it.
  if (activeEntry(store.get()).plan !== before && isOwnPlan()) persist();
};

/** Changes the set of plans (open another, add, copy, delete), and saves the result unless only a shared plan moved. */
const commitPlanSet = (change: (set: PlanSet) => PlanSet): void => {
  const before = store.get();
  store.update(withPlanSetChange(before, change));
  const after = store.get();
  const changed = after.plans !== before.plans || after.activeId !== before.activeId;
  if (changed && after.notice === null) persist();
};

/** The name a plan is shown with: its own, or a text for where it came from. */
const displayName = (entry: { readonly plan: PlanDocument; readonly origin: "example" | "own" | "shared" }): string =>
  entry.plan.name ?? messages.planCard.names[entry.origin];

/** What a plan will be called once it is one of the user's own: a copy of the untouched example is "My plan (copy)". */
const ownName = (entry: { readonly plan: PlanDocument; readonly origin: "example" | "own" | "shared" }): string =>
  displayName({ ...entry, origin: entry.origin === "example" ? "own" : entry.origin });

/** "Plan 2", "Plan 3", the first number that no plan uses. */
const newPlanName = (set: PlanSet): string => {
  const used = new Set(set.plans.map((entry) => entry.plan.name));
  let n = 2;
  while (used.has(messages.planCard.newName(n))) n += 1;
  return messages.planCard.newName(n);
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
  selectPlan: (id) => commitPlanSet((set) => selectPlan(set, id)),
  selectMetric: (metric) => store.update({ metric }),
  selectEvent: (selectedEvent, month) => store.update({ selectedEvent, ...(month === undefined ? {} : { chartMonth: month }) }),
  setChartMonth: (chartMonth) => store.update({ chartMonth }),
  setInflationAdjusted: (inflationAdjusted) => store.update({ inflationAdjusted }),
  setYearTableOpen: (yearTableOpen) => store.update({ yearTableOpen }),
  updatePlan: (patch) => {
    commitPlan((plan) => updatePlanFields(plan, patch));
    // A new horizon for the plan is what the user now wants to see, so a zoom set before it is let go.
    if (patch.horizonYears !== undefined) store.update({ viewHorizonYears: null });
  },
  toggleSection: (id) => {
    const collapsed = toggleCollapsed(store.get().collapsed, id);
    saveCollapsed(collapsed);
    store.update({ collapsed });
  },
  setViewHorizon: (viewHorizonYears) => store.update({ viewHorizonYears, chartMonth: null }),
  renamePlan: (name) => commitPlan((plan) => renamePlan(plan, name)),
  startFromScratch: () => {
    commitPlan(() => createBlankPlan(currentYearMonth()));
    store.update({ selectedEvent: null, chartMonth: null, viewHorizonYears: null });
    clearShareHash();
  },
  startOver: () => {
    const cleared = clearSavedPlans();
    store.update({
      plans: [{ id: 1, plan: createExamplePlan(currentYearMonth(), messages.example.carLabel), origin: "example" }],
      activeId: 1,
      returnId: null,
      storage: cleared ? "idle" : "blocked",
      selectedEvent: null,
      chartMonth: null,
      notice: cleared ? null : STORAGE_BLOCKED_NOTICE,
    });
  },
  addBlankPlan: () =>
    commitPlanSet((set) => addPlan(set, { ...createBlankPlan(currentYearMonth()), name: newPlanName(set) })),
  copyPlan: () =>
    commitPlanSet((set) => {
      const current = activeEntry(set);
      return addPlan(set, { ...current.plan, name: fitPlanName(messages.planCard.copyName(ownName(current))) });
    }),
  copyWithoutEvent: (key) =>
    commitPlanSet((set) => {
      const current = activeEntry(set);
      const without = planWithoutEvent(current.plan, key);
      if (!without) return set;
      return addPlan(set, { ...without.plan, name: fitPlanName(messages.planCard.withoutName(ownName(current), without.label)) });
    }),
  deletePlan: (id) => commitPlanSet((set) => deletePlan(set, id)),
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
  setLanguage: (language) => {
    saveLanguagePreference(language);
    // The texts are chosen once when the page loads, so the new language takes a reload. Plans are saved, and a
    // share link stays in the address.
    window.location.reload();
  },
  toggleTheme: () => {
    const theme = isDark() ? "light" : "dark";
    saveThemePreference(theme);
    store.update({ theme });
  },
  planFile: () => {
    const entry = activeEntry(store.get());
    return { name: displayName(entry), text: planFileText(entry.plan) };
  },
  importPlanFile: (file) => {
    if ("tooLarge" in file) {
      store.update({ notice: { kind: "file-unreadable", problem: { code: "file-too-large" } } });
      return;
    }
    let plan: PlanDocument;
    try {
      plan = readPlanFile(file.text);
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
      store.update({ notice: { kind: "file-unreadable", problem: problemOf(error) } });
      return;
    }
    commitPlanSet((set) => addPlan(set, plan));
  },
  reportDownloadFailed: () => store.update({ notice: { kind: "download-failed" } }),
  createShareLink: async () => buildShareUrl(currentPageUrl(), await encodePlan(activeEntry(store.get()).plan)),
  copyToClipboard: async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  },
  keepSharedPlan: () => {
    commitPlanSet((set) => keepSharedPlan(set));
    if (store.get().notice === null) clearShareHash();
  },
  leaveSharedPlan: () => {
    store.update({ ...leaveSharedPlan(store.get()), selectedEvent: null, chartMonth: null, viewHorizonYears: null });
    clearShareHash();
  },
};

/** Opens the plan in a share link as a copy. A bad link leaves the user's own plan alone and says why. */
const openSharedPlan = async (token: string): Promise<void> => {
  try {
    const plan = await decodePlan(token);
    store.update({ ...addSharedPlan(store.get(), plan), selectedEvent: null, chartMonth: null, viewHorizonYears: null, notice: null });
  } catch (error) {
    if (!(error instanceof RangeError)) {
      console.error(error);
      renderErrorState(root, error, actions);
      return;
    }
    clearShareHash();
    store.update({ notice: { kind: "link-unreadable", problem: problemOf(error) } });
  }
};

/**
 * The open plan with some fields changed, drawn as it would be but not saved: what a Plan card slider shows while it
 * moves. Null for a change the plan's checks refuse (the sliders' ranges never give one).
 */
const previewOf = (state: AppState, patch: Partial<PlanFields>): ScenarioView | null => {
  const entry = activeEntry(state);
  let plan: PlanDocument;
  try {
    plan = updatePlanFields(entry.plan, patch);
  } catch (error) {
    // An invalid preview is simply not drawn; the value is checked again, with a notice, when it is let go.
    if (error instanceof RangeError) return null;
    throw error;
  }
  // A slider that moves the End year shows the new horizon itself, not a zoom set before it.
  const years = patch.horizonYears !== undefined ? plan.horizonYears : (state.viewHorizonYears ?? plan.horizonYears);
  const nominal = buildScenarioView(plan, displayName(entry), yearsToMonths(years), String(entry.id));
  return state.inflationAdjusted ? applyInflationAdjustment(nominal, plan.inflationPct) : nominal;
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
    const viewOf = (entry: PlanEntry, years: number): ScenarioView => {
      const nominal = scenarioView(entry.id, entry.plan, displayName(entry), yearsToMonths(years));
      return state.inflationAdjusted ? applyInflationAdjustment(nominal, entry.plan.inflationPct) : nominal;
    };
    const entry = activeEntry(state);
    // The open plan is shown over the horizon switch's years; the Compare card always compares each plan's own.
    const view = viewOf(entry, state.viewHorizonYears ?? entry.plan.horizonYears);
    // Only the Compare card needs the other plans, so they are not drawn up with a single plan.
    const views = state.plans.length > 1 ? state.plans.map((plan) => viewOf(plan, plan.plan.horizonYears)) : [view];
    renderApp(root, { view, views, preview: (patch) => previewOf(state, patch), tabs: state.plans.map((plan) => ({ id: plan.id, label: displayName(plan), origin: plan.origin })), state, isDark: isDark() }, actions);
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
