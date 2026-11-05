import type { Actions } from "./actions";
import {
  checkIcon,
  renderButton,
  renderEmptyState,
  renderModal,
  renderSelect,
  renderSlider,
  renderSteps,
  renderToast,
  renderToggle,
} from "./components";
import { h } from "./dom";
import { renderLogo } from "./logo";
import { renderThemeButton } from "./topbar";

const section = (title: string, ...children: Array<Node | null>): HTMLElement =>
  h("section", { class: "ds__section" }, h("h2", {}, title), ...children);

const item = (node: Node, caption?: string): HTMLElement =>
  h("div", { class: "ds__item" }, node, caption ? h("span", { class: "ds__caption" }, caption) : null);

const withState = (button: HTMLButtonElement, state: "hover" | "pressed"): HTMLButtonElement => {
  button.setAttribute("data-state", state);
  return button;
};

const field = (id: string, label: string, placeholder: string): HTMLElement =>
  h(
    "div",
    { class: "field" },
    h("label", { for: id }, label),
    h("div", { class: "field__control" }, h("input", { id, type: "text", placeholder })),
  );

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
    h("span", { class: "ds__caption" }, "Ledger bars with one cut down to a stub: the later cost of one decision."),
  );
}

function renderCards(): HTMLElement {
  return section(
    "Cards",
    h(
      "div",
      { class: "ds__grid" },
      h("div", { class: "card card--sunken ds__demo-card" }, h("strong", {}, "Base card"), "Sunken: inner shadow, for content that sits in the surface."),
      h("div", { class: "card ds__demo-card" }, h("strong", {}, "Raised card"), "Gentle lift: the default surface for content."),
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
      item(renderButton({ label: "Default" })),
      item(withState(renderButton({ label: "Hover" }), "hover"), "Hover lifts the button and adds a glow."),
      item(withState(renderButton({ label: "Pressed" }), "pressed"), "Pressed sinks into the inner shadow."),
      item(renderButton({ label: "Disabled", disabled: true }), "Disabled drops contrast and all shadows."),
      item(renderButton({ label: "Loading", loading: true }), "Loading keeps the glow and shows a spinner."),
      item(renderButton({ label: "Secondary", variant: "secondary" })),
    ),
  );
}

function renderForms(): HTMLElement {
  return h(
    "div",
    { class: "ds__grid" },
    section("Input", field("ds-name", "Name", "Name input"), h("span", { class: "ds__caption" }, "Focus ring is always visible and glowing.")),
    section(
      "Select",
      renderSelect({
        label: "Select",
        value: "2",
        options: ["1", "2", "3", "4", "5"].map((n) => ({ value: n, label: `Item ${n}` })),
        onChange: () => undefined,
      }),
      h("span", { class: "ds__caption" }, "Native list: the open menu follows the operating system."),
    ),
    section(
      "Toggle switch",
      renderToggle({ label: "On", checked: true, onChange: () => undefined }),
      renderToggle({ label: "Off", checked: false, onChange: () => undefined }),
      renderToggle({ label: "Disabled", checked: false, disabled: true, onChange: () => undefined }),
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
        onChange: () => undefined,
      }),
    ),
  );
}

function renderFeedback(): HTMLElement {
  const toasts = h("div", { class: "toasts", "aria-live": "polite" });
  const modal = renderModal({
    title: "Modal dialog",
    primaryLabel: "Primary",
    secondaryLabel: "Cancel",
    onPrimary: () => toasts.append(renderToast("Changes saved successfully.")),
  });
  return h(
    "div",
    { class: "ds__grid" },
    section("Step indicator", renderSteps(["Plan", "Deposits", "Withdrawals", "Review"], 1)),
    section(
      "Toast message",
      renderToast("Changes saved successfully."),
      renderButton({
        label: "Show toast",
        variant: "secondary",
        onClick: () => toasts.append(renderToast("Link copied to clipboard.")),
      }),
    ),
    section("Modal dialog", renderButton({ label: "Open modal", variant: "secondary", onClick: () => modal.showModal() })),
    section("Empty state", renderEmptyState("No items found.", "Try adjusting your search.")),
    toasts,
    modal,
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

function renderTokens(): HTMLElement {
  const radii = ["--radius-1", "--radius-2", "--radius-3"] as const;
  const borders = ["--border-1", "--border-2", "--border-3"] as const;
  const depths = [
    ["none", "No shadow"],
    ["inner", "Soft inner"],
    ["lift", "Gentle lift"],
    ["float", "Elevated float"],
  ] as const;
  const icons = ["--icon-sm", "--icon-md", "--icon-lg"] as const;
  const spaces = ["--space-1", "--space-2", "--space-3", "--space-4"] as const;
  const px = (name: string): string => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  return h(
    "div",
    { class: "ds__grid" },
    section(
      "Radius steps",
      h(
        "div",
        { class: "ds__row" },
        ...radii.map((name) => item(h("div", { class: "swatch", style: `border-radius:var(${name})` }), px(name))),
      ),
    ),
    section(
      "Border thickness",
      ...borders.map((name) => item(h("div", { class: "rule", style: `border-top-width:var(${name})` }), px(name))),
    ),
    section(
      "Shadow levels",
      h("div", { class: "ds__row" }, ...depths.map(([level, label]) => item(h("div", { class: "depth", "data-level": level }), label))),
    ),
    section(
      "Icon sizes",
      h(
        "div",
        { class: "ds__row" },
        ...icons.map((name) => item(
            h(
              "div",
              { class: "toast__icon", style: `width:calc(var(${name}) + 16px);height:calc(var(${name}) + 16px)` },
              checkIcon(`var(${name})`),
            ),
            px(name),
          ),
        ),
      ),
    ),
    section(
      "Spacing scale",
      h(
        "div",
        { class: "ds__row" },
        ...spaces.map((name) => item(h("div", { class: "swatch swatch--space", style: `width:var(${name});height:var(${name})` }), px(name))),
      ),
    ),
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
            h("div", {}, h("h1", {}, "Neo-Tactile Soft UI"), h("p", {}, "Tokens and components. "), h("a", { class: "ds__back", href: "#" }, "← Back to calculator")),
            renderThemeButton(isDark, actions),
          ),
          renderBrand(),
          renderCards(),
          renderButtons(),
          renderForms(),
          renderFeedback(),
          renderTableRows(),
          renderTokens(),
        ),
      ),
    ),
  );
}
