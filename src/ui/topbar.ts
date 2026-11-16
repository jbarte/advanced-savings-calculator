import type { Language } from "../state/language";
import { PLAN_LIMITS } from "../state/plan-document";
import type { PlanOrigin, ScenarioView } from "../state/types";
import type { Actions } from "./actions";
import { openAddPlanDialog } from "./add-plan-dialog";
import { renderHiddenHint } from "./components";
import { h, s } from "./dom";
import { renderLogo } from "./logo";
import { openGuideDialog } from "./guide-dialog";
import { openShareDialog } from "./share-dialog";
import { language, messages } from "./i18n";
import { showUndoToast } from "./undo-toast";

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

export function renderGuideButton(actions: Actions): HTMLButtonElement {
  return h(
    "button",
    {
      class: "btn-round btn-round--text",
      type: "button",
      "data-key": "guide",
      "aria-label": messages.guide.title,
      title: messages.guide.title,
      onclick: () => openGuideDialog(actions),
    },
    "?",
  );
}

/** What a tab needs: which plan, what to call it and where it came from. */
export interface PlanTab {
  readonly id: number;
  readonly label: string;
  readonly origin: PlanOrigin;
  /** True for a plan of the user's own when it isn't their last: it can be deleted from its tab. */
  readonly deletable: boolean;
}

/** A button that switches to the other language. It shows the code of that language ("SV" while the page is English). */
export function renderLanguageButton(actions: Actions): HTMLButtonElement {
  const other: Language = language === "en" ? "sv" : "en";
  return h(
    "button",
    {
      class: "btn-round btn-round--text",
      type: "button",
      "data-key": "language",
      "aria-label": messages.language.switchTo,
      title: messages.language.switchTo,
      lang: other,
      onclick: () => actions.setLanguage(other),
    },
    messages.language.switchCode,
  );
}

const trashIcon = (): SVGSVGElement =>
  s("svg", { class: "icon", viewBox: "0 0 24 24", "aria-hidden": "true" }, s("path", { d: "M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3" }));

function renderPlanTabs(tabs: readonly PlanTab[], activeId: number, canAdd: boolean, view: ScenarioView, actions: Actions): HTMLElement {
  const items = tabs.map((tab) => {
    const active = tab.id === activeId;
    const select = h(
      "button",
      {
        class: "tabs__item",
        type: "button",
        "data-key": `plan-tab-${tab.id}`,
        "aria-current": active ? "true" : "false",
        title: tab.origin === "shared" ? messages.planCard.status.shared : tab.label,
        onclick: () => actions.selectPlan(tab.id),
      },
      tab.label,
    );
    // The open plan can be deleted right here, not only from the Plan card's menu. Only the open one shows the button,
    // so a stray tap on another tab can't delete it; the removal is undone from the toast, as everywhere else.
    const remove =
      active && tab.deletable
        ? h(
            "button",
            {
              class: "tabs__delete",
              type: "button",
              "data-key": "plan-tab-delete",
              "data-focus-next": "plan-rename",
              "aria-label": messages.app.deletePlanAria(tab.label),
              title: messages.app.deletePlanAria(tab.label),
              onclick: () => showUndoToast(messages.undo.planDeleted(tab.label), actions.deletePlan(tab.id)),
            },
            trashIcon(),
          )
        : null;
    return h("div", { class: "tabs__tab" }, select, remove);
  });
  const add = h(
    "button",
    {
      class: "tabs__item tabs__item--add",
      type: "button",
      "data-key": "plan-add",
      disabled: !canAdd,
      title: canAdd ? messages.app.addPlan : messages.app.plansFull(PLAN_LIMITS.maxPlans),
      "aria-label": messages.app.addPlan,
      "aria-describedby": canAdd ? undefined : "plan-add-hint",
      onclick: () => openAddPlanDialog({ currentName: tabs.find((tab) => tab.id === activeId)?.label ?? view.name, onBlank: () => actions.addBlankPlan(), onCopy: () => actions.copyPlan() }),
    },
    "+",
  );
  return h(
    "nav",
    { class: "tabs appbar__tabs", "aria-label": messages.app.plans },
    ...items,
    add,
    canAdd ? null : renderHiddenHint("plan-add-hint", messages.app.plansFull(PLAN_LIMITS.maxPlans)),
  );
}

export function renderAppBar(
  tabs: readonly PlanTab[],
  activeId: number,
  canAdd: boolean,
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
    renderPlanTabs(tabs, activeId, canAdd, active, actions),
    h("div", { class: "appbar__actions" }, share, renderGuideButton(actions), renderLanguageButton(actions), renderThemeButton(isDark, actions)),
  );
}
