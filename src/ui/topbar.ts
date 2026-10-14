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

export function renderTopbar(active: ScenarioView, isDark: boolean, actions: Actions): HTMLElement {
  const shareLabel = h("span", {}, "Share link");
  const share = h(
    "button",
    {
      class: "btn-solid",
      type: "button",
      "data-key": "share",
      onclick: async () => {
        shareLabel.textContent = (await actions.copyShareLink()) ? "Link copied" : "Copy failed";
        setTimeout(() => (shareLabel.textContent = "Share link"), 2000);
      },
    },
    h("span", { class: "btn-solid__icon", "aria-hidden": "true" }, "↗"),
    shareLabel,
  );

  const theme = h(
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

  return h(
    "header",
    { class: "topbar" },
    h("div", { class: "scenario-name" }, h("span", { class: "scenario-name__tag" }, "SCENARIO"), h("span", {}, active.name)),
    h("div", { class: "topbar__actions" }, share, theme),
  );
}
