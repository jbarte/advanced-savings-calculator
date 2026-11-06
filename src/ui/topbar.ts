import type { ScenarioView } from "../state/types";
import type { Actions } from "./actions";
import { h, s } from "./dom";
import { renderLogo } from "./logo";
import { openShareDialog } from "./share-dialog";
import { messages } from "./i18n";

function renderBrandLogo(): SVGSVGElement {
  const logo = renderLogo();
  logo.classList.add("brand__logo");
  return logo;
}

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
      "aria-label": isDark ? messages.theme.switchToLight : messages.theme.switchToDark,
      title: isDark ? messages.theme.lightMode : messages.theme.darkMode,
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
    { class: "tabs__item tabs__item--add", type: "button", disabled: true, title: messages.app.newScenarioSoon, "aria-label": messages.app.newScenarioSoon },
    "+",
  );
  return h("nav", { class: "tabs appbar__tabs", "aria-label": messages.app.scenarios }, ...tabs, add);
}

export function renderAppBar(
  scenarios: readonly ScenarioView[],
  active: ScenarioView,
  isDark: boolean,
  actions: Actions,
): HTMLElement {
  const share = h(
    "button",
    {
      class: "btn-solid",
      type: "button",
      "data-key": "share",
      "aria-label": messages.share.title,
      onclick: () => void openShareDialog(actions, active.planName),
    },
    h("span", { class: "btn-solid__icon", "aria-hidden": "true" }, "↗"),
    h("span", { class: "appbar__share-label" }, messages.share.button),
  );

  return h(
    "header",
    { class: "appbar" },
    h(
      "div",
      { class: "brand appbar__brand" },
      renderBrandLogo(),
      h("div", { class: "brand__name" }, messages.app.brandName, h("span", {}, messages.app.brandSuffix)),
    ),
    scenarios.length > 1 ? renderScenarioTabs(scenarios, active, actions) : null,
    h("div", { class: "appbar__actions" }, share, renderThemeButton(isDark, actions)),
  );
}
