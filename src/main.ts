import "./styles/app.css";
import { SAMPLE_SCENARIOS } from "./state/sample-data";
import { createStore } from "./state/store";
import { loadThemePreference, saveThemePreference, systemPrefersDark } from "./state/theme";
import type { Actions } from "./ui/actions";
import { renderApp } from "./ui/app";
import { applyTheme } from "./ui/theme";

const root = document.getElementById("app");
if (!root) throw new Error("Missing #app element");

const firstScenario = SAMPLE_SCENARIOS[1] ?? SAMPLE_SCENARIOS[0];
if (!firstScenario) throw new Error("No sample scenarios");

const store = createStore({
  scenarioId: firstScenario.id,
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
  applyTheme(store.get().theme);
  renderApp(root, { scenarios: SAMPLE_SCENARIOS, state: store.get(), isDark: isDark() }, actions);
};

store.subscribe(render);
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", render);
render();
