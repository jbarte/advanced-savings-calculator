import type { Actions } from "./actions";
import {
  checkIcon,
  openModal,
  renderButton,
  renderCollapseToggle,
  renderEmptyState,
  renderMenu,
  renderModal,
  renderSelect,
  renderSlider,
  renderSteadyText,
  renderSteps,
  renderTextField,
  renderToast,
  renderToggle,
} from "./components";
import { h, s } from "./dom";
import { renderLogo } from "./logo";
import { renderThemeButton } from "./topbar";

const section = (title: string, ...children: Array<Node | null>): HTMLElement =>
  h("section", { class: "ds__section" }, h("h2", {}, title), ...children);

const item = (node: Node, caption?: string): HTMLElement =>
  h("div", { class: "ds__item" }, node, caption ? h("span", { class: "ds__caption" }, caption) : null);

const caption = (text: string): HTMLElement => h("span", { class: "ds__caption" }, text);

const withState = (button: HTMLButtonElement, state: "hover" | "pressed"): HTMLButtonElement => {
  button.setAttribute("data-state", state);
  return button;
};

/** The value a token has in the theme on screen, so the page shows what is drawn, not what was written. */
const tokenValue = (name: string): string => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const noop = (): void => undefined;

const trashIcon = (): SVGSVGElement =>
  s("svg", { class: "icon", viewBox: "0 0 24 24", "aria-hidden": "true" }, s("path", { d: "M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3" }));

function renderBrand(): HTMLElement {
  const sized = (size: number): SVGSVGElement => {
    const logo = renderLogo();
    logo.setAttribute("width", String(size));
    logo.setAttribute("height", String(size));
    return logo;
  };
  return section(
    "Logo",
    h("div", { class: "ds__row" }, ...[16, 24, 32, 48].map((size) => item(sized(size), `${size}px`))),
    caption("Ledger bars with one cut down to a stub: the later cost of one decision."),
  );
}

/* ---------- Colour ---------- */

const PALETTES = [
  {
    title: "Surfaces",
    note: "One warm neutral; depth comes from shadow and the edge, not from colour.",
    tokens: ["--page", "--frame", "--surface", "--fill", "--fill-hover", "--line", "--edge", "--sel-row"],
  },
  { title: "Text", note: "Every text colour is at least 4.5 : 1 on the surfaces it sits on.", tokens: ["--ink", "--ink2", "--muted"] },
  {
    title: "Brand and state",
    note: "Sage green for actions, dusty rose for the elevated card, blue for focus and selection.",
    tokens: ["--solid", "--solid-hover", "--solid-deep", "--elevated", "--elevated-deep", "--accent", "--accent-soft", "--accent-ink", "--focus", "--danger"],
  },
  {
    title: "Event kinds",
    note: "Shared by the chart badges and lines, the list badges and the legend.",
    tokens: ["--kind-withdrawal", "--kind-deposit-change", "--kind-one-time-deposit", "--kind-one-time-deposit-fill", "--goal-line"],
  },
  {
    title: "Plan lines",
    note: "Compare card lines in tab order, each at least 3 : 1 on the card. The main chart uses the first.",
    tokens: ["--compare-1", "--compare-2", "--compare-3", "--compare-4", "--compare-5", "--compare-6"],
  },
  { title: "Effects", note: "What an event does to the balance: a loss or a gain.", tokens: ["--effect-loss", "--effect-gain", "--effect-gain-fill"] },
] as const;

function renderColours(): HTMLElement {
  return section(
    "Colour",
    caption("Values are read from the theme on screen. Switch the theme to see the other one."),
    h(
      "div",
      { class: "ds__grid" },
      ...PALETTES.map((palette) =>
        h(
          "div",
          { class: "ds__palette" },
          h("h3", {}, palette.title),
          h(
            "ul",
            { class: "ds__swatches" },
            ...palette.tokens.map((name) =>
              h(
                "li",
                { class: "ds__swatch" },
                h("span", { class: "ds__chip", style: `background:var(${name})`, "aria-hidden": "true" }),
                h("span", { class: "ds__swatch-name" }, name),
                h("span", { class: "ds__swatch-value" }, tokenValue(name)),
              ),
            ),
          ),
          caption(palette.note),
        ),
      ),
    ),
  );
}

/* ---------- Surfaces and buttons ---------- */

function renderCards(): HTMLElement {
  return section(
    "Cards",
    h(
      "div",
      { class: "ds__grid" },
      h("div", { class: "card card--sunken ds__demo-card" }, h("strong", {}, "Base card"), "Sunken: inner shadow, for content that sits in the surface."),
      h("div", { class: "card ds__demo-card" }, h("strong", {}, "Raised card"), "Lift shadow plus a 1px edge: the default surface for content."),
      h(
        "div",
        { class: "card card--dark ds__demo-card" },
        h("strong", {}, "Elevated card"),
        "Soft outer shadow for featured content.",
        renderButton({ label: "Call to action" }),
      ),
    ),
  );
}

function renderButtons(): HTMLElement {
  return section(
    "Buttons",
    h(
      "div",
      { class: "ds__row" },
      item(renderButton({ label: "Default" }), "The main action of a section, such as Add event."),
      item(withState(renderButton({ label: "Hover" }), "hover"), "Hover lifts the button 1px."),
      item(withState(renderButton({ label: "Pressed" }), "pressed"), "Pressed sinks into the inner shadow."),
      item(renderButton({ label: "Disabled", disabled: true }), "Disabled drops contrast and all shadows."),
      item(renderButton({ label: "Loading", loading: true }), "Loading shows a spinner."),
      item(renderButton({ label: "Secondary", variant: "secondary" }), "Raised neutral, with the edge."),
    ),
    h(
      "div",
      { class: "ds__row" },
      item(h("button", { class: "btn-text", type: "button" }, "Text button"), "Inline actions, such as Undo."),
      item(h("button", { class: "btn-text btn-text--danger", type: "button" }, "Remove"), "An action that removes something."),
      item(
        h("button", { class: "btn-round", type: "button", "aria-label": "Icon button" }, checkIcon()),
        "Round icon button, 44px.",
      ),
      item(h("button", { class: "btn-round btn-round--text", type: "button" }, "SV"), "Round text button (language)."),
    ),
  );
}

/* ---------- App pieces ---------- */

function renderSegmented(): HTMLElement {
  const tab = (label: string, active: boolean, deletable: boolean): HTMLElement =>
    h(
      "div",
      { class: "tabs__tab" },
      h("button", { class: "tabs__item", type: "button", "aria-current": String(active) }, label),
      active && deletable ? h("button", { class: "tabs__delete", type: "button", "aria-label": `Delete ${label}` }, trashIcon()) : null,
    );
  const horizon = (label: string, pressed: boolean): HTMLElement =>
    h("button", { class: "tabs__item", type: "button", "aria-pressed": String(pressed) }, label);
  return h(
    "div",
    { class: "ds__grid" },
    section(
      "Plan tabs",
      h(
        "nav",
        { class: "tabs ds__tabs", "aria-label": "Plans (example)" },
        tab("My plan", true, true),
        tab("Plan 2", false, true),
        h("button", { class: "tabs__item tabs__item--add", type: "button", "aria-label": "Add plan" }, "+"),
      ),
      caption("The open tab is raised and carries its own trash button, so a stray tap can't delete another plan."),
    ),
    section(
      "Segmented switch",
      h("div", { class: "tabs ds__tabs", role: "group", "aria-label": "Horizon (example)" }, horizon("Plan · 25 yrs", true), horizon("10 yrs", false), horizon("30 yrs", false)),
      caption("A sunken track with one raised choice: the horizon zoom."),
    ),
  );
}

function renderTiles(): HTMLElement {
  const tile = (label: string, value: string, pressed: boolean): HTMLElement =>
    h(
      "button",
      { class: "tile", type: "button", "aria-pressed": String(pressed) },
      h("span", { class: "tile__label" }, label),
      h("span", { class: "tile__value" }, value),
    );
  return section(
    "KPI tiles",
    h(
      "div",
      { class: "kpis-group", role: "group", "aria-labelledby": "ds-kpis-caption" },
      h("p", { id: "ds-kpis-caption", class: "kpis__caption" }, "Show on the chart"),
      h("div", { class: "kpis" }, tile("Balance", "1.8M kr", true), tile("Deposited", "1.1M kr", false), tile("Growth", "1.1M kr", false), tile("Withdrawn", "448K kr", false)),
    ),
    caption("The chosen tile sinks in; together they pick what the chart shows."),
  );
}

function renderEventMarks(): HTMLElement {
  const badge = (kind: string, n: number): HTMLElement => h("div", { class: `table__badge table__badge--${kind}`, "aria-hidden": "true" }, String(n));
  const legendItem = (kind: string, label: string): HTMLElement =>
    h("li", { class: "legend__item" }, h("span", { class: `legend__swatch legend__swatch--${kind}`, "aria-hidden": "true" }), label);
  return h(
    "div",
    { class: "ds__grid" },
    section(
      "Event badges",
      h(
        "div",
        { class: "ds__row" },
        item(badge("withdrawal", 1), "Withdrawal"),
        item(badge("deposit-change", 2), "Deposit change"),
        item(badge("one-time-deposit", 3), "One-time deposit"),
      ),
      caption("Numbered in date order, the same number on the chart and in the list."),
    ),
    section(
      "Legend",
      h(
        "ul",
        { class: "legend", "aria-label": "Legend (example)" },
        legendItem("withdrawal", "Withdrawal"),
        legendItem("deposit-change", "Deposit change"),
        legendItem("one-time-deposit", "One-time deposit"),
        legendItem("goal", "Goal"),
      ),
    ),
    section(
      "Chips",
      h("div", { class: "ds__row" }, h("span", { class: "chip" }, "After the horizon"), h("span", { class: "chip chip--warn" }, "Reduced")),
      caption("Shown only when an event is not simply planned."),
    ),
  );
}

/* ---------- Forms ---------- */

function renderForms(): HTMLElement {
  const amount = renderTextField({
    id: "ds-amount",
    label: "Amount",
    unit: "KR",
    value: "150 000",
    dataKey: "ds-amount",
    inputMode: "numeric",
    validate: (text) => (/^[\d\s]+$/.test(text.trim()) ? null : "Write the amount in whole kronor, for example 150 000."),
    onCommit: noop,
  });
  const month = renderTextField({
    id: "ds-month",
    label: "Month",
    unit: "",
    value: "2031-04",
    dataKey: "ds-month",
    type: "month",
    placeholder: "YYYY-MM",
    validate: (text) => (/^\d{4}-(0[1-9]|1[0-2])$/.test(text.trim()) ? null : "Write the month as YYYY-MM."),
    onCommit: noop,
  });
  return h(
    "div",
    { class: "ds__grid" },
    section("Text field", amount, caption("Checks itself while typing, commits on change. Type a letter to see the error.")),
    section("Month field", month, caption("Plain text with our own picker, since the native month input is missing in Firefox and Safari.")),
    section(
      "Select",
      renderSelect({
        label: "Select",
        value: "2",
        options: ["1", "2", "3", "4", "5"].map((n) => ({ value: n, label: `Item ${n}` })),
        onChange: noop,
      }),
      caption("Native list: the open menu follows the operating system."),
    ),
    section(
      "Toggle switch",
      renderToggle({ label: "On", checked: true, onChange: noop }),
      renderToggle({ label: "Off", checked: false, onChange: noop }),
      renderToggle({ label: "Disabled", checked: false, disabled: true, onChange: noop }),
    ),
    section(
      "Slider",
      renderSlider({
        label: "Monthly deposit",
        min: 0,
        max: 10_000,
        step: 100,
        value: 4_000,
        format: (value) => `${value.toLocaleString("sv-SE")} kr`,
        onChange: noop,
      }),
      caption("Green fill, like every button. The Plan card's sliders preview live while they move."),
    ),
  );
}

/* ---------- Disclosure and menus ---------- */

function renderCollapsible(): HTMLElement {
  const body = h("div", { id: "ds-collapse-body" }, caption("The body stays in the page, hidden, so its state survives a re-render."));
  const head = h("div", { class: "card__head" }, h("h3", {}, "Collapsible card"));
  // The toggle is swapped for a new one on every press, as a page re-render does, so focus is put back on it.
  const place = (expanded: boolean): HTMLButtonElement => {
    body.hidden = !expanded;
    const toggle = renderCollapseToggle({
      expanded,
      label: expanded ? "Collapse the example card" : "Expand the example card",
      controls: "ds-collapse-body",
      dataKey: "ds-collapse",
      onToggle: () => place(!expanded).focus(),
    });
    head.querySelector(".card__toggle")?.remove();
    head.append(toggle);
    return toggle;
  };
  place(true);
  return h("div", { class: "card ds__demo-card" }, head, body);
}

function renderDisclosure(): HTMLElement {
  return h(
    "div",
    { class: "ds__grid" },
    section(
      "More menu",
      // At the end of its row, as in the app: the panel opens leftwards from the button.
      h(
        "div",
        { class: "ds__row ds__row--end" },
        renderMenu({
          label: "More actions (example)",
          dataKey: "ds-menu",
          items: [
            { label: "Try without", onSelect: noop },
            { label: "Start over", onSelect: noop, disabled: true, hint: "Nothing to start over from yet." },
            { label: "Remove", onSelect: noop, danger: true },
          ],
        }),
      ),
      caption("For actions used less often. Arrow keys move, Escape closes, a switched-off item says why."),
    ),
    section("Collapse toggle", renderCollapsible()),
  );
}

/* ---------- Feedback ---------- */

function renderSteadyDemo(): HTMLElement {
  const holder = h("div", { class: "ds__steady" });
  const draw = (adjusted: boolean): void => {
    holder.replaceChildren(
      renderSteadyText(
        (isAdjusted) => [isAdjusted ? "Balance by Nov 2056 · estimated at 7 % a year · inflation adjusted, in today's money" : "Balance by Nov 2056 · estimated at 7 % a year"],
        adjusted,
      ),
    );
  };
  draw(false);
  return section(
    "Steady text",
    renderToggle({ label: "Inflation adjusted", checked: false, onChange: draw }),
    holder,
    caption("Both wordings share one cell, so flipping a view switch never moves the page."),
  );
}

function renderFeedback(): HTMLElement {
  const toasts = h("div", { class: "toasts ds__toasts", "aria-live": "polite" });
  const openExampleModal = (): void => {
    openModal(
      renderModal({
        title: "Modal dialog",
        body: h("p", { class: "ds__caption" }, "Dialogs sit on --frame with --shadow-dialog, so raised controls inside stand out."),
        primaryLabel: "Primary",
        secondaryLabel: "Cancel",
        onPrimary: () => toasts.append(renderToast("Changes saved successfully.")),
      }),
    );
  };
  return h(
    "div",
    { class: "ds__grid" },
    section("Step indicator", renderSteps(["Plan", "Deposits", "Withdrawals", "Review"], 1)),
    section(
      "Toast message",
      renderToast("Changes saved successfully."),
      renderToast("Removed New car", undefined, { label: "Undo", onClick: noop }),
      caption("Removing is undone, not confirmed: the undo toast stays 8 seconds."),
      renderButton({ label: "Show toast", variant: "secondary", onClick: () => toasts.append(renderToast("Link copied to clipboard.")) }),
    ),
    section("Modal dialog", renderButton({ label: "Open modal", variant: "secondary", onClick: openExampleModal })),
    section(
      "Live readout",
      h("div", { class: "live-readout ds__readout" }, h("span", {}, "Balance by Nov 2056 · estimated at 7 % a year"), h("strong", {}, "1 818 921 kr")),
      caption("Shows the result while a Plan card slider moves, below 1100px where the chart is out of sight."),
    ),
    section(
      "Empty state",
      renderEmptyState("No events yet.", "Withdrawals and deposit changes show here.", renderButton({ label: "Add your first event" })),
    ),
    renderSteadyDemo(),
    toasts,
  );
}

function renderTableRows(): HTMLElement {
  const row = (name: string, amount: string, state?: "hover" | "selected"): HTMLElement =>
    h(
      "div",
      {
        class: "table__row",
        "data-state": state === "hover" ? "hover" : undefined,
        "aria-selected": state === "selected" ? "true" : undefined,
      },
      h("span", { class: "table__title" }, name),
      h("span", { class: "table__amount" }, amount),
      h("span", {}, state === "selected" ? checkIcon() : ""),
      h("span", { class: "table__sub" }, state ?? "default"),
    );
  return section(
    "Table row",
    h("div", { class: "table-card" }, row("Default", "100 000 kr"), row("Hover", "150 000 kr", "hover"), row("Selected", "300 000 kr", "selected")),
  );
}

/* ---------- Scales ---------- */

function renderTokens(): HTMLElement {
  const radii = ["--radius-1", "--radius-2", "--radius-3", "--radius-card"] as const;
  const borders = ["--border-1", "--border-2", "--border-3"] as const;
  const depths = [
    ["none", "None"],
    ["inner", "Inner"],
    ["lift", "Lift"],
    ["raised", "Raised"],
    ["float", "Float"],
    ["dialog", "Dialog"],
  ] as const;
  const icons = ["--icon-sm", "--icon-md", "--icon-lg"] as const;
  const spaces = ["--space-1", "--space-2", "--space-3", "--space-4"] as const;
  const sizes = ["--text-xs", "--text-sm", "--text-md", "--text-lg", "--text-xl", "--text-display"] as const;

  return h(
    "div",
    { class: "ds__grid" },
    section(
      "Radius steps",
      h("div", { class: "ds__row" }, ...radii.map((name) => item(h("div", { class: "swatch", style: `border-radius:var(${name})` }), tokenValue(name)))),
    ),
    section("Border thickness", ...borders.map((name) => item(h("div", { class: "rule", style: `border-top-width:var(${name})` }), tokenValue(name)))),
    section(
      "Shadow levels",
      h("div", { class: "ds__row" }, ...depths.map(([level, label]) => item(h("div", { class: "depth", "data-level": level }), label))),
      caption("Only dark shadows, never a white highlight. Raised adds the 1px edge; parts under 32px use the -sm variants."),
    ),
    section(
      "Icon sizes",
      h(
        "div",
        { class: "ds__row" },
        ...icons.map((name) =>
          item(
            h("div", { class: "toast__icon", style: `width:calc(var(${name}) + 16px);height:calc(var(${name}) + 16px)` }, checkIcon(`var(${name})`)),
            tokenValue(name),
          ),
        ),
      ),
    ),
    section(
      "Spacing scale",
      h(
        "div",
        { class: "ds__row" },
        ...spaces.map((name) => item(h("div", { class: "swatch swatch--space", style: `width:var(${name});height:var(${name})` }), tokenValue(name))),
      ),
    ),
    section(
      "Type scale",
      ...sizes.map((name) => h("div", { class: "ds__type", style: `font-size:var(${name})` }, h("span", {}, "1 818 921 kr"), h("span", { class: "ds__caption" }, `${name} · ${tokenValue(name)}`))),
    ),
  );
}

function renderMotion(): HTMLElement {
  const durations = ["--duration-fast", "--duration-base", "--duration-slow"] as const;
  const lanes = durations.map((name) =>
    h("div", { class: "ds__lane" }, h("span", { class: "ds__puck", style: `transition-duration:var(${name})` }), h("span", { class: "ds__caption" }, `${name} · ${tokenValue(name)}`)),
  );
  const track = h("div", { class: "ds__motion" }, ...lanes);
  return section(
    "Motion",
    track,
    renderButton({
      label: "Play",
      variant: "secondary",
      onClick: () => track.toggleAttribute("data-moved"),
    }),
    caption(`Easing --ease-out · ${tokenValue("--ease-out")}. A pressed control shrinks with --press. Everything stops under reduced motion.`),
  );
}

/** Reference page for every token and component state. Lives at #design-system. */
export function renderDesignSystem(root: HTMLElement, isDark: boolean, actions: Actions): void {
  root.replaceChildren(
    h(
      "div",
      { class: "page" },
      h(
        "div",
        { class: "frame" },
        h(
          "main",
          { class: "ds" },
          h(
            "header",
            { class: "ds__head" },
            h(
              "div",
              {},
              h("h1", {}, "Neo-Tactile Soft UI"),
              h("p", {}, "The tokens and components of Life Ledger, drawn with the live styles."),
              h("a", { class: "ds__back", href: "#" }, "← Back to the planner"),
            ),
            renderThemeButton(isDark, actions),
          ),
          renderBrand(),
          renderColours(),
          renderCards(),
          renderButtons(),
          renderSegmented(),
          renderTiles(),
          renderEventMarks(),
          renderForms(),
          renderDisclosure(),
          renderFeedback(),
          renderTableRows(),
          renderTokens(),
          renderMotion(),
        ),
      ),
    ),
  );
}
