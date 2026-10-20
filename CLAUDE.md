# CLAUDE.md

## Project

**Advanced Savings Calculator** is a free, browser-based tool that anyone can use to plan
long-term savings. Most online savings calculators only answer "what will I have if I save
X per month at Y% for Z years?". Real savings plans are messier than that, so this tool also
covers:

- **Planned withdrawals on specific dates.** Example: take out 150 000 kr in March 2031 for a
  house down payment and see how that changes the end result and the growth that follows.
- **Scenario comparison.** Build several plans side by side, for example different monthly
  amounts, returns, start dates or withdrawal schedules, and compare them in one chart and
  one table.
- **Goal-based planning.** Work backwards from "I want X by date Y" to the monthly deposit you
  need, with any planned withdrawals taken into account.

**Problem it solves:** people make big financial decisions, like taking money out of savings
for a car or a home, without seeing the long-term cost of that decision. This tool makes the
cost visible.

**Who it's for:** private savers who want to understand the long-term effect of their
choices, without signing up for anything.

**Deliverable:** a static website on GitHub Pages:
https://jbarte.github.io/advanced-savings-calculator/. No accounts and no backend. All data
stays in the user's browser.

**Status:** the UI shell is done and runs on static sample data. The calculation engine is
the next step. See [NEXT_STEPS.md](NEXT_STEPS.md).

## Tech stack

| Choice | Why |
|---|---|
| **TypeScript** (strict mode) | Financial math needs type safety. Dates, amounts and rates must never get mixed up. |
| **Vanilla HTML/CSS + TS, no UI framework** | The UI is small (forms, a chart, a table). A framework would add weight and abstraction without much benefit. |
| **Vite** | Fast dev server and a simple static build for GitHub Pages. |
| **Vitest** | Unit tests for the calculation engine. Same config as Vite. |
| **GitHub Actions + GitHub Pages** | Free hosting. Tests, build and deploy run on every push to `main`. |
| **Charts drawn with plain SVG** | No chart library to begin with. Ask before adding one. |
| **Geist / Geist Mono** (Google Fonts) | Fonts from the base design. |

There are no runtime dependencies. Dev dependencies: `vite`, `vitest`, `typescript`.

UI language: **English**. Currency: **SEK** (`1 234 567 kr`).

## Code conventions

- **Formatting:** 2-space indent, double quotes, semicolons, trailing commas, lines up to
  about 120 characters. No formatter is installed yet, so match the existing code.
- **Naming:**
  - `camelCase` for functions and variables, `PascalCase` for types and interfaces,
    `UPPER_SNAKE_CASE` for module-level constants (`HORIZONS`, `METRICS`).
  - Files are `kebab-case.ts` (`chart-geometry.ts`), and each test sits next to its file
    as `*.test.ts`.
  - UI render functions are named `renderX` and return an element.
- **Types:**
  - Explicit types on all exported functions.
  - Use `interface` for object shapes and `as const` arrays plus derived union types for
    fixed sets of values.
  - `readonly` on data that should not change.
  - No `any` and no non-null `!` assertions. Handle `undefined` explicitly
    (`noUncheckedIndexedAccess` is on).
- **Imports:** `import type` for type-only imports (`verbatimModuleSyntax` is on). Use
  relative paths.
- **Comments:**
  - A short JSDoc (`/** ... */`) on exported functions whose purpose isn't obvious from
    the name.
  - Comments explain *why*, not *what*.
  - Keep comment density low, like the existing code.
- **CSS:**
  - BEM-style class names (`.card`, `.card__head`, `.card--dark`).
  - State is expressed with ARIA attributes (`[aria-pressed="true"]`,
    `[aria-current="true"]`), not extra classes.

## Architecture

- **Pure calculation core.** All financial math lives in `src/core/`, written as pure
  functions: same input, same output, no DOM, no `Date.now()`, no randomness and no I/O.
  This is the most important rule in the project.
- **Layered structure:**
  - `src/core/`: the calculation engine (projection, withdrawals, goal solving). Pure TS.
  - `src/state/`: app state, scenario models, and serialization to/from `localStorage` and URL.
  - `src/ui/`: DOM rendering and event handling. Reads state and calls core. Contains no
    financial math. Presentation math like chart scaling (`chart-geometry.ts`) is fine.
  - `src/main.ts`: wires everything together (store, actions, render).
- **All I/O goes through one layer.** Only `src/state/` touches `localStorage` or the URL.
  Only `src/ui/` touches the DOM.
- **One-way data flow.** UI events call `Actions` (`src/ui/actions.ts`). Actions update the
  store, and the store triggers a full re-render. UI components never change state
  directly.
- **The engine produces the UI's view model.** The UI renders the `ScenarioView` type from
  `src/state/types.ts`. Right now that comes from `src/state/sample-data.json`. The engine
  must produce the same shape so the UI doesn't need to change.
- **Money is stored as integers in minor units (öre).** Never use floats for stored
  amounts. Rates may be floats, but round explicitly and in one place. Convert to kronor
  only when formatting (`src/ui/format.ts`).
- **Dates are year-month values** (`YearMonth` in `src/core/year-month.ts`), with monthly
  granularity, never raw `Date` objects in the core.
- **Functions do one thing.** If a function needs a comment to explain what it does,
  split it. Prefer composing small functions over adding flags.
- **No global mutable variables.** State lives in the store created in `main.ts` and is
  passed in explicitly.
- **Explicit error handling.** Every I/O call (`localStorage`, clipboard, URL parsing) is
  wrapped in `try/catch` and has a fallback. Never swallow an error silently: if ignoring
  it is intentional, add a comment saying why (see `src/state/theme.ts`).
- **Tests are written alongside the code, not after.** Core functions are written test
  first. Every function in `src/core/` has unit tests, including edge cases:
  - a withdrawal larger than the balance
  - a withdrawal before the start date
  - zero return
  - a goal that cannot be reached
- **Shareable scenarios.** A scenario can be encoded in the URL so users can share a link.

## Design

The UI is based on a dashboard design (Geist fonts, rounded cards, dark "solid" accents).
Light theme = "Sandstone", dark theme = "Midnight". The theme follows the system setting
until the user picks one with the toggle.

- All colours are CSS custom properties in `src/styles/tokens.css`. Use the tokens,
  never hard-coded colours.
- Component styles live in `src/styles/app.css`.
- Build DOM with the `h()` / `s()` helpers in `src/ui/dom.ts`. Never use `innerHTML`
  with user-provided text.
- The layout must work at phone width (375px) with no horizontal page scroll.
- Interactive elements are real `<button>`s or inputs with accessible labels. The chart
  can be used with the keyboard (arrow keys).

## Rules

- Do **not** add a UI framework (React, Vue, Svelte and so on) or a CSS framework.
- Do **not** add or swap any dependency without asking first. This covers dev
  dependencies too, such as a formatter or linter.
- Do **not** add a backend, database, user accounts, analytics or tracking. Everything runs
  client-side.
- Do **not** put financial calculation logic in `src/ui/`, and do not touch the DOM from
  `src/core/`.
- Do **not** use floating-point numbers for stored money amounts.
- Do **not** weaken TypeScript strictness or use `any` to silence errors.
- Do **not** change the deploy target away from GitHub Pages, or the `base` path in
  `vite.config.ts`.
- Do **not** present results as financial advice. The UI must keep its disclaimer.
- Do **not** create config files beyond what exists without asking.
- Do **not** commit or push without being asked. Larger features go in a feature branch;
  `main` deploys to production on every push.

## Project structure

```
/
├── CLAUDE.md                 # Instructions for the agent (this file)
├── README.md                 # Public project description
├── NEXT_STEPS.md             # Status and prioritized to-do list
├── index.html                # Page shell, loads fonts and src/main.ts
├── package.json              # Scripts and dev dependencies
├── tsconfig.json             # Strict TypeScript config
├── vite.config.ts            # Vite + Vitest config, GitHub Pages base path
├── .github/workflows/
│   └── deploy.yml            # Test, build and deploy to GitHub Pages
└── src/
    ├── main.ts               # Entry point: creates the store and actions, renders the app
    ├── core/                 # Pure calculation engine (no DOM, no I/O)
    │   ├── year-month.ts     # YearMonth type, addMonths, formatYearMonth
    │   └── year-month.test.ts
    ├── state/                # State, data models, storage
    │   ├── types.ts          # Ore, ScenarioView, AppState, HORIZONS, METRICS
    │   ├── store.ts          # Minimal observable store
    │   ├── theme.ts          # Theme preference in localStorage
    │   ├── sample-data.json  # Placeholder data (replaced by the engine)
    │   └── sample-data.ts    # Maps the JSON to ScenarioView
    ├── ui/                   # DOM rendering and events
    │   ├── app.ts            # Page layout, re-render and focus restore
    │   ├── actions.ts        # Actions interface (UI → state)
    │   ├── dom.ts            # h() / s() element helpers
    │   ├── format.ts         # Money formatting (öre → "1 234 kr")
    │   ├── chart-geometry.ts # Chart scaling and SVG paths (+ .test.ts)
    │   ├── view-helpers.ts   # Small shared view helpers
    │   ├── sidebar.ts        # Scenario list and goal mini card
    │   ├── topbar.ts         # Scenario name, share link, theme toggle
    │   ├── projection-card.ts # Title, horizon pill, KPI tiles, chart
    │   ├── withdrawals-table.ts # Planned withdrawals and their cost
    │   ├── side-cards.ts     # Plan inputs, goal gauge, scenario comparison
    │   └── theme.ts          # Applies the theme to <html>
    └── styles/
        ├── tokens.css        # Colour tokens (light/dark)
        └── app.css           # Component styles
```

## Setup

Requires Node.js 22.12 or newer.

```bash
npm install
```

There are no environment variables or API keys. Everything runs in the browser.

## Run

```bash
npm run dev       # dev server at http://localhost:5173/advanced-savings-calculator/
npm run build     # typecheck and build the static site into dist/
npm run preview   # serve the built site locally
```

Deploy happens automatically through GitHub Actions on every push to `main`.

## Test

```bash
npm test          # run all unit tests once (Vitest)
npm run test:watch # rerun tests on change
npm run typecheck # strict TypeScript check
```

Before calling something done: `npm run typecheck`, `npm test` and `npm run build` must
all pass.
