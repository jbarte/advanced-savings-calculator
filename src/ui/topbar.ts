import type { ScenarioView } from "../state/types";
import type { Actions } from "./actions";
import { h, s } from "./dom";

const sunIcon = (): SVGSVGElement =>
  s(
    "svg",
    { viewBox: "0 0 24 24", "aria-hidden": "true" },
    s("circle", { cx: 12, cy: 12, r: 4 }),
    s("path", { d: "M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" }),
  );

const moonIcon = (): SVGSVGElement =>
  s("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" }, s("path", { d: "M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" }));

export function renderThemeButton(isDark: boolean, actions: Actions): HTMLButtonElement {
  return h(
    "button",
    {
      class: "btn-round",
      type: "button",
      "data-key": "theme",
      "aria-label": isDark ? "Switch to light mode" : "Switch to dark mode",
      title: isDark ? "Light mode" : "Dark mode",
      onclick: () => actions.toggleTheme(),
    },
    isDark ? sunIcon() : moonIcon(),
  );
}

function renderScenarioTabs(scenarios: readonly ScenarioView[], active: ScenarioView, actions: Actions): HTMLElement {
  const tabs = scenarios.map((scenario) =>
    h(
      "button",
      {
        class: "tabs__item",
        type: "button",
        "data-key": `scenario-${scenario.id}`,
        "aria-current": scenario.id === active.id ? "true" : "false",
        onclick: () => actions.selectScenario(scenario.id),
      },
      scenario.name,
    ),
  );
  const add = h(
    "button",
    { class: "tabs__item tabs__item--add", type: "button", disabled: true, title: "New scenario (coming soon)", "aria-label": "New scenario (coming soon)" },
    "+",
  );
  return h("nav", { class: "tabs appbar__tabs", "aria-label": "Scenarios" }, ...tabs, add);
}

export function renderAppBar(
  scenarios: readonly ScenarioView[],
  active: ScenarioView,
  isDark: boolean,
  actions: Actions,
): HTMLElement {
  const shareLabel = h("span", { class: "appbar__share-label" }, "Share");
  const share = h(
    "button",
    {
      class: "btn-solid",
      type: "button",
      "data-key": "share",
      disabled: true,
      title: "Sharing is coming soon",
      "aria-label": "Copy share link (coming soon)",
      onclick: async () => {
        shareLabel.textContent = (await actions.copyShareLink()) ? "Copied" : "Copy failed";
        setTimeout(() => (shareLabel.textContent = "Share"), 2000);
      },
    },
    h("span", { class: "btn-solid__icon", "aria-hidden": "true" }, "↗"),
    shareLabel,
  );

  return h(
    "header",
    { class: "appbar" },
    h(
      "div",
      { class: "brand appbar__brand" },
      h("div", { class: "brand__mark", "aria-hidden": "true" }),
      h("div", { class: "brand__name" }, "Savings", h("span", {}, "calc")),
    ),
    scenarios.length > 1 ? renderScenarioTabs(scenarios, active, actions) : null,
    h("div", { class: "appbar__actions" }, share, renderThemeButton(isDark, actions)),
  );
}
