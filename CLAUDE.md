# CLAUDE.md

## Project

**Advanced Savings Calculator** is a free, browser-based tool that anyone can use to plan
long-term savings. Most online savings calculators only answer "what will I have if I save
X per month at Y% for Z years?". Real savings plans are messier than that, so this tool also
covers:

- **Planned withdrawals on specific dates.** Example: take out 150 000 kr in March 2031 for a
  house down payment and see how that changes the end result and the growth that follows.
- **Changes to the monthly deposit.** Raise, lower or pause the deposit from a date onward, or for
  a period only, and see all events on one chart.
- **Autosave and sharing.** The plan is saved in the browser and can be shared with a link, with no
  login.
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

**Status:** milestones 1–6 are done: the calculation engine runs, the start amount, monthly
deposit, return and start date are editable, withdrawals can be added, edited and removed with
the effect of every event shown, and the monthly deposit can be changed from a month or for a period
(including a pause). One-time deposits can be added, and all events show on one numbered list and on the chart. The plan is saved in the browser and can be shared with a link. [NEXT_STEPS.md](NEXT_STEPS.md) has the target scenario and the milestone plan.

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

There are no runtime dependencies. Dev dependencies: `vite`, `vitest`, `typescript`. Node 22.12 or newer
(`engines` in `package.json`).

UI language: **English**. Currency: **SEK** (`1 234 567 kr`).

## Code conventions

- **Formatting:** 2-space indent, double quotes, semicolons, trailing commas, lines up to
  about 120 characters. No formatter is installed yet, so match the existing code.
- **Naming:**
  - `camelCase` for functions and variables, `PascalCase` for types and interfaces,
    `UPPER_SNAKE_CASE` for module-level constants (`HORIZON_PRESETS`, `METRICS`).
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
- **Form inputs commit on `change`, not on `input`.** A full re-render replaces every
  element, so updating the store on each keystroke would rebuild the field being typed
  in (the cursor jumps and autocomplete breaks). Text and number inputs update the store
  on the `change` event (blur or Enter). Live feedback while typing, such as validation
  messages, stays local to the input (`renderTextField` in `src/ui/components.ts`). If a
  feature truly needs live updates, render the form once and re-render only the result
  cards, and ask before restructuring.
- **Renders are deferred one tick** by `createRenderScheduler` (`src/ui/render-scheduler.ts`).
  `change` fires while focus is still leaving a field, so rendering at once would put focus
  back in it (Tab would not move on) and would replace a button under the pointer (losing
  the click). Always trigger renders through the store, never by calling `render()` after
  an input event.
- **Dependencies point inwards: `ui → state → core`.** `src/core/` never imports from
  `src/state/` or `src/ui/`, and `src/state/` never imports from `src/ui/`. `src/architecture.test.ts` enforces
  this, the pure core (no clock, randomness, DOM or storage), storage and URL access only in `src/state/`, and no
  `innerHTML` in the UI.
- **The engine has its own types.** `src/core/types.ts` defines the engine's input and
  output (`PlanInput`, `WithdrawalInput`, `DepositChangeInput`, `GoalInput`, `Projection`,
  `ProjectionPoint`, `AppliedWithdrawal`, `Ore`). They describe money and time only, never how things are
  displayed.
- **The plan is a document.** `src/state/` defines one versioned, JSON-friendly
  `PlanDocument` (start capital, return, base deposit, horizon in whole years, inflation, and three lists of
  events: withdrawals, deposit changes and one-time deposits, numbered apart, with real
  `YearMonth` dates rather than month offsets). It is the only thing that gets saved to
  `localStorage` or put in a share link. A mapper turns it into the engine's `PlanInput`
  (dates become month offsets there). Every document has a `version`, and loading goes
  through a hand-written validator and migrations, so old saves and old links keep working. Version 2 added
  `horizonYears` (1–40) and `inflationPct` (default 2, the Riksbank target); a version 1 plan is upgraded with
  30 years (what the page showed then) and 2 %. The horizon is part of the plan, so changing it is a plan change:
  it is saved and shared, and it makes the example the user's own plan.
- **`src/state/` builds the UI's view model.** The UI renders `ScenarioView` from
  `src/state/types.ts`. `buildScenarioView` in `src/state/view-model.ts` runs the engine
  (`project`) for 480 months (`PROJECTION_MONTHS`, the longest horizon) and shapes the result, including
  display-oriented fields. It takes the horizon in months (by default the plan's), which is where the effect of
  each event is measured and where the chart ends (`ScenarioView.horizonMonths`). `createScenarioViewCache`
  returns the same view while plan, name and horizon are unchanged, so selection, theme and notice changes don't
  run the engine.
  Features that don't exist yet are empty: `goal` is `null`, and the UI hides that card.
- **Calculation rules** (decided, change only after asking):
  - **Money is stored as integers in minor units (öre).** Never use floats for stored
    amounts. Convert to kronor only when formatting (`src/ui/format.ts`), and parse typed
    amounts from the digits, not through a float (`src/ui/parse-input.ts`).
  - **Input limits live in `PLAN_LIMITS`** (`src/state/plan-document.ts`). The maximum return is 30 % a year (it
    was 50 % before the 40-year horizon; 1.5^40 would not fit). They keep every
    balance below `Number.MAX_SAFE_INTEGER` öre, so money stays exact. `project()` throws a
    `RangeError` instead of returning an inexact balance. The limits assume a 40-year
    projection (`PROJECTION_MONTHS`): a longer one needs them rechecked, and a test fails if
    the largest allowed plan stops fitting.
  - **No magic 12.** Months per year is `MONTHS_PER_YEAR`, and years become months with
    `yearsToMonths()` (`src/core/year-month.ts`).
  - **The chart scale always contains zero.** `niceScale(min, max)` reaches below zero for
    negative values (for example negative growth at a negative return) and one step above zero
    when nothing is positive. A zero line is drawn when the scale goes below zero.
  - **The effect of an event** by a month H is the balance at H with the event minus the balance at H
    without it (`eventEffect` in `src/core/event-effect.ts`): negative for a loss (a withdrawal, a pause),
    positive for a gain (a one-time deposit, a raise). It is the *total* effect on the balance, so a withdrawal's
    effect includes the money taken out. The balance with the event comes from the main projection; only the run
    without it is extra. An event after the horizon has no effect within it. **Lost growth** of a withdrawal is
    the growth part only: minus the effect, minus the amount actually withdrawn, never below 0 (`lostGrowthOf`),
    shown in the hover text. **The total effect** compares the plan with one without any events, so it is not
    the sum of the rows (events affect each other, for example how a withdrawal is capped).
  - **A withdrawal dated before the plan start** can't be projected. The view model lists it as
    `before-start` and leaves it out of the engine input. One dated after the horizon is
    `after-horizon` and costs nothing within it.
  - **The monthly rate is the effective rate:** `(1 + yearly)^(1/12) − 1`, from
    `monthlyRate()` in `src/core/money.ts`. Twelve months of compounding give exactly
    the yearly return. Never use `yearly / 12`.
  - **The balance is rounded to whole öre once per month**, with `roundToOre()` in
    `src/core/money.ts` (halves round away from zero). That is the only place money gets
    rounded.
  - **Order within a month:** growth is applied to the balance at the start of the month,
    then the monthly deposit is added, then any withdrawals for that month are taken out.
    Month 0 is the start month: it holds only the start amount (no growth, no deposit),
    but a withdrawal can be scheduled in it.
  - **A withdrawal can't take the balance below 0.** It is capped at the available
    balance and the shortfall is reported, never silently dropped.
  - **Deposit schedule** (`depositInMonth` in `src/core/deposit-schedule.ts`): the plan has a base monthly
    deposit. A deposit change has a start month, an optional end month (both inclusive) and
    an amount (0 pauses saving). In any month, the deposit is the amount of the change that
    is active and has the latest start month. If none is active, the base deposit applies.
    So a change without an end month lasts until a later change replaces it, and a change
    with an end month goes back to whatever applied before it. If two active changes have the
    same start month, the one later in the list wins. A change dated in month 0 first takes
    effect in month 1, since month 0 has no deposit.
  - **One-time deposit:** a single extra amount in one month. It is added after the monthly deposit and before
    that month's withdrawals, so it earns no growth in its own month and is available to a withdrawal in the
    same month. It counts as deposited. It can be dated in month 0. One dated before the plan start is
    `before-start` and left out of the engine input; one after the horizon is `after-horizon`. Its limits are
    smaller than the monthly deposit's (`maxOneTimeDepositAmount` 5 000 000 kr, `maxOneTimeDeposits` 10),
    because one in month 0 compounds for the whole horizon and the largest plan must stay below
    `Number.MAX_SAFE_INTEGER` (a test checks this).
  - **Edge cases of deposit changes:** an end month before the start month is rejected by the
    dialog and by `validate-plan.ts`, and the engine treats such a change as never active. A
    change that started before the plan start still applies from month 1 if it has no end or
    ends later. One that ends before the plan starts is listed as `before-start` and left out
    of the engine input (as for withdrawals). One that starts after the horizon is
    `after-horizon` and has no effect within it. Every amount is capped by `maxMonthlyDeposit`,
    so changes can never raise the worst case behind `PLAN_LIMITS`.
- **Events are one numbered timeline.** `buildTimeline` (`src/state/timeline.ts`) merges withdrawals,
  deposit changes and one-time deposits in date order (same month: deposit change, then one-time deposit,
  then withdrawal, then by id) and numbers them from 1. `AppState.selectedEvent` holds the selected
  `EventKey` (`withdrawal-<id>`, `deposit-change-<id>` or `one-time-deposit-<id>`; the id series are
  numbered apart). The list rows select through a real button with `aria-pressed`. The chart draws each event as a line with a
  numbered badge (same number as the list), plus a band for a deposit change with an end. Badges are buttons
  outside the tab order (`tabindex="-1"`), since the list rows are the keyboard path.
- **Focus and announcements across re-renders.** Focus is restored by `data-key`. When the focused element
  disappears (a removed row, a swapped button, a dismissed notice), its `data-focus-next` names the element that
  gets focus instead. Notices are read out once through the `#announcer` live region in `index.html`
  (`announce` in `src/ui/announcer.ts`), not by a live region inside the re-rendered page.
- **Dialogs keep their own state.** A dialog (`openModal` in `src/ui/components.ts`) is added
  to `<body>`, so a page re-render can't remove it. Its fields check themselves as the user
  types, and nothing reaches the store until Save. `openFormDialog` (`src/ui/dialog-form.ts`)
  is the shared shell for the form dialogs. Withdrawals and one-time deposits share one dialog
  (`openAmountEventDialog` in `amount-event-dialog.ts`, with a small kind description); deposit changes have
  their own (`deposit-change-dialog.ts`):
  the primary button and Enter both call `save`, and it closes only when `save` returns true. A dialog closes
  on the backdrop only when the press starts and ends outside its box, and is named with `aria-label`. When an
  event is edited, its own date is accepted even if it is before the plan start (`earliestMonth`).
- **Dates are year-month values** (`YearMonth` in `src/core/year-month.ts`), with monthly
  granularity, never raw `Date` objects in the core.
- **Functions do one thing.** If a function needs a comment to explain what it does,
  split it. Prefer composing small functions over adding flags.
- **No global mutable variables.** State lives in the store created in `main.ts` and is
  passed in explicitly.
- **Explicit error handling.** Every I/O call (`localStorage`, clipboard, URL parsing) is
  wrapped in `try/catch` and has a fallback. Never swallow an error silently: if ignoring
  it is intentional, add a comment saying why (see `src/state/theme.ts`).
- **Validation lives in `src/state/`.** `validate-plan.ts` is the check that counts: it
  throws a `RangeError` for any value outside `PLAN_LIMITS`, whether it came from a form, a
  saved plan or a link. The parsers in `src/ui/parse-input.ts` only give friendlier messages
  while typing. Every change to the plan goes through `withPlanChange`
  (`src/state/plan-change.ts`): an invalid change leaves the plan alone and sets
  `AppState.notice`. A change that leaves the plan as it was keeps the same plan object, so it is neither marked as
  the user's own nor saved. Ids must be safe integers below `Number.MAX_SAFE_INTEGER`, labels are stored trimmed,
  and event dates may reach `PLAN_LIMITS.maxEventYear` (the last start year plus the longest horizon).
  Other errors are bugs and are not hidden. If drawing the page throws,
  `renderErrorState` shows a message instead of a blank page.
- **Reference values are pinned.** `src/state/reference-values.test.ts` holds results checked by hand and by an
  independent script, to the öre (the example plan, the car's lost growth at three horizons, a one-time
  deposit, and the effect of a car, a bonus, a pause and all three together). If a change moves one of them, it is either a bug or a rule change that needs asking first.
- **Tests are written alongside the code, not after.** Core functions are written test
  first. Every function in `src/core/` has unit tests, including edge cases:
  - a withdrawal larger than the balance
  - a withdrawal before the start date
  - zero return
  - a goal that cannot be reached
- **The plan is saved in `localStorage`.** Key `advanced-savings-calculator:plan` (the earlier `asc-plan` is still
  read and removed on the next save, since `jbarte.github.io` storage is shared by all the account's Pages sites),
  value `JSON.stringify(PlanDocument)`
  (`src/state/plan-storage.ts`). After every change that replaces the plan, `main.ts` saves it (`persist`); the
  untouched example plan is never written. At startup `loadSavedPlan` reads it, and `readPlanDocument`
  (`src/state/read-plan.ts`) checks the shape field by field and then runs `validatePlanDocument`, so saved text is
  treated as untrusted (the same reader will check share links). A broken save falls back to the example with a
  notice and stays in place until the next change replaces it. Blocked or full storage is reported
  (`AppState.storage`: `idle`, `saved`, `blocked`), the app keeps working in memory, and the notice is shown once.
  "Start over" (with a confirmation) clears the save. Add a migration in `readPlanDocument` whenever the format changes.
- **Sharing is a self-contained link.** A plan is shared by packing its `PlanDocument` into
  the URL hash: `<page>#plan=<token>`, token = `z.` + base64url(deflate(JSON)), using the browser's built-in
  `CompressionStream`, or `u.` + base64url(JSON) when the browser has none (`src/state/share-link.ts`). There is no
  dependency and no server, and the hash is never sent to a server. `src/state/route.ts` reads the hash
  (`sharedPlanToken`), so `#plan=` sits next to `#design-system`. The largest allowed plan makes a link of about 1 000
  characters (a normal plan about 300).
  - Data from a link is untrusted: `decodePlan` limits the token length (30 000) and the inflated size (100 000
    bytes, which stops a decompression bomb), then reads it with `readPlanDocument`, the same checks as a saved plan.
    A bad link gives a RangeError whose message is shown to the user.
  - Opening a link never overwrites the user's own plan. It opens as a copy (`planOrigin: "shared"`): never saved
    (`commitPlan` skips `persist`), and edits to it stay in memory. A banner offers "Keep as my plan" (asks first, then
    replaces the saved plan) and "Back to my plan". The address is cleared of the token when either is used or the link
    is bad. The Share button shows a dialog with the link, a copy button and the note that anyone with the link can
    see the plan.
  - A short link like `/<id>` would need a backend. Don't build one without asking
    (see "Open decisions" in NEXT_STEPS.md).

## Design

The UI follows the "Neo-Tactile Soft UI" system (Geist fonts, one warm neutral surface, depth from soft dark
shadows and a thin edge, sage green primary, dusty-rose elevated card, blue glow for focus and selection).
Light theme = "Linen", dark theme = "Dusk". The theme follows the system setting until the user picks one
with the toggle.

- Depth has four levels, as tokens: flat (none), `--shadow-inner` (sunken: inputs, tracks, pressed),
  `--shadow-lift` (raised: cards, buttons), `--shadow-float` (elevated: featured card, tooltip).
- Radius steps are 4 / 8 / 12px, border thickness 1 / 1.5 / 2px, icon sizes 16 / 20 / 24px and spacing
  4 / 8 / 16 / 24px, all as tokens.
- **No white highlights or glow.** The `--shadow-*` tokens contain only dark shadows (plus the edge).
  Do not add `rgb(255 255 255 / …)` to a shadow. Translucent white fills on coloured surfaces
  (`--on-color-fill`) are fine, since they are fills and not light.
- Raised neutral surfaces that sit on the page (cards, tables, tiles, secondary buttons) use
  `--shadow-raised`: the lift shadow plus a 1px `--edge`. Soft shadows alone gave only about 1.1 : 1
  against the page. The main action of a section (for example "Add event") is the green `btn-solid`.
- Dialogs use `--frame` (darker than `--surface`) as their background, `--shadow-dialog` (a dark drop
  shadow plus the edge, not the light glow of `--shadow-float`) and a darker `--backdrop`. That way the
  raised options and buttons inside a dialog stand out from it.
- Interactive states: hover lifts 1px, pressed uses `--shadow-inner`, disabled drops shadows and contrast,
  focus shows `--glow-focus`.
- All colours are CSS custom properties in `src/styles/tokens.css`. Use the tokens,
  never hard-coded colours. Event kinds have their own tokens (`--kind-withdrawal`, `--kind-deposit-change`,
  `--kind-one-time-deposit` and its `-fill`), used by the chart badges and lines, the list badges and the legend.
  Font sizes use the `--text-*` tokens where one matches. The chart's height, badge size and badge lane are
  custom properties on `.chart`, and `chart-events.ts` only sets `--lane` on each badge.
- Component styles live in `src/styles/app.css`.
- Build DOM with the `h()` / `s()` helpers in `src/ui/dom.ts`. Never use `innerHTML`
  with user-provided text.
- The layout must work at phone width (375px) with no horizontal page scroll.
- Interactive elements are real `<button>`s or inputs with accessible labels. The chart is a slider over
  the months (`role="slider"` with a value text that names the month, the value and its events): arrows move one
  month, Page Up and Page Down one year, Home and End to the ends (`cursorAfterKey`). The cursor rests at
  `AppState.chartMonth`, set by the keys and by selecting an event; pointer moves don't change it.

## Rules

- Do **not** add a UI framework (React, Vue, Svelte and so on) or a CSS framework.
- Do **not** add or swap any dependency without asking first. This covers dev
  dependencies too, such as a formatter or linter.
- Do **not** add a backend, database, user accounts, analytics or tracking. Everything runs
  client-side. This includes a short-link service for sharing plans.
- Do **not** put financial calculation logic in `src/ui/`, and do not touch the DOM from
  `src/core/`.
- Do **not** use floating-point numbers for stored money amounts.
- Do **not** weaken TypeScript strictness or use `any` to silence errors.
- Do **not** change the deploy target away from GitHub Pages, or the `base` path in
  `vite.config.ts`.
- Do **not** present results as financial advice. The UI must keep its disclaimer.
- Do **not** create config files beyond what exists without asking.
- Do **update `implementation.md`** at the end of every implementation step or PR: add an entry to
  its "Log" and keep "Current status" true.
- Do **not** commit or push without being asked. Larger features go in a feature branch;
  `main` deploys to production on every push.

## Project structure

```
/
├── CLAUDE.md                 # Instructions for the agent (this file)
├── README.md                 # Public project description
├── NEXT_STEPS.md             # Status and prioritized to-do list
├── implementation.md         # Log of what was built, why, and how it was checked
├── index.html                # Page shell, loads fonts and src/main.ts
├── package.json              # Scripts and dev dependencies
├── tsconfig.json             # Strict TypeScript config
├── vite.config.ts            # Vite + Vitest config, GitHub Pages base path
├── .github/workflows/
│   └── deploy.yml            # Test, build and deploy to GitHub Pages
└── src/
    ├── main.ts               # Entry point: creates the store and actions, renders the app
    ├── architecture.test.ts  # Enforces the layer rules by reading the sources
    ├── core/                 # Pure calculation engine (no DOM, no I/O)
    │   ├── types.ts          # Engine input/output: PlanInput, Projection, Ore …
    │   ├── project.ts        # project(): the monthly projection (+ project.test.ts)
    │   ├── event-effect.ts   # eventEffect, totalEffect, lostGrowthOf: what each event changes (+ test)
    │   ├── deposit-schedule.ts # depositInMonth: the deposit in a given month (+ test)
    │   ├── money.ts          # monthlyRate, roundToOre (+ money.test.ts)
    │   ├── year-month.ts     # YearMonth type, addMonths, formatYearMonth
    │   └── year-month.test.ts
    ├── state/                # State, data models, storage
    │   ├── types.ts          # ScenarioView, AppState, HORIZON_PRESETS, METRICS
    │   ├── plan-document.ts  # PlanDocument, WithdrawalEvent, PLAN_LIMITS, example and blank plans
    │   ├── validate-plan.ts  # Checks plan fields, withdrawals and whole documents (+ test)
    │   ├── plan-fields.ts    # updatePlanFields: change the plan's single values, validated (+ test)
    │   ├── plan-change.ts    # withPlanChange: apply a change or set a notice (+ test)
    │   ├── withdrawals.ts    # Pure add/update/remove of withdrawals, validated (+ test)
    │   ├── event-list.ts     # Shared add/update/remove for the three event lists (+ test)
    │   ├── deposit-changes.ts # Pure add/update/remove of deposit changes, validated (+ test)
    │   ├── one-time-deposits.ts # Pure add/update/remove of one-time deposits, validated (+ test)
    │   ├── view-model.ts     # buildScenarioView: engine output → ScenarioView (+ test)
    │   ├── reference-values.test.ts # Hand- and script-checked results, pinned to the öre
    │   ├── clock.ts          # currentYearMonth(), the only place that reads the clock
    │   ├── store.ts          # Minimal observable store
    │   ├── timeline.ts       # buildTimeline, EventKey, eventsAtMonth, chartMonthOf, isPlanned (+ test)
    │   ├── read-plan.ts      # readPlanDocument/readPlanText: untrusted data → PlanDocument; serializePlan (+ test)
    │   ├── plan-storage.ts   # loadSavedPlan, savePlan, clearSavedPlan on localStorage (+ test)
    │   ├── startup-plan.ts   # resolveStartupPlan: what to show when the page opens (+ test)
    │   ├── share-link.ts     # encodePlan/decodePlan, planTokenFromHash, buildShareUrl (+ test)
    │   ├── route.ts          # Reads and clears the URL hash (#design-system, #plan=)
    │   └── theme.ts          # Theme preference in localStorage
    ├── ui/                   # DOM rendering and events
    │   ├── app.ts            # Page layout (app bar, hero, chart, bento, table), focus restore
    │   ├── actions.ts        # Actions interface (UI → state)
    │   ├── dom.ts            # h() / s() element helpers
    │   ├── format.ts         # Money formatting (öre → "1 234 kr")
    │   ├── parse-input.ts    # Typed text → öre, percent, year-month; errorMessage (+ test)
    │   ├── dialog-form.ts    # Shared dialog shell and helpers (openFormDialog, inputIn, showErrors)
    │   ├── error-state.ts    # Notice banner and the error view shown instead of a blank page
    │   ├── announcer.ts      # announce(): reads notices out once through #announcer
    │   ├── render-scheduler.ts # Defers renders one tick (focus and click safety)
    │   ├── chart-geometry.ts # Chart scale (incl. negative values), points, paths, bands, badge lanes (+ .test.ts)
    │   ├── chart-events.ts   # Event layer on the chart (numbered badges, bands, lines) and its legend
    │   ├── view-helpers.ts   # Small shared view helpers
    │   ├── topbar.ts         # Sticky app bar: brand, scenario tabs, share, theme toggle
    │   ├── projection-card.ts # Hero (headline number, horizon switch, KPI tiles) and chart card
    │   ├── events-section.ts # "Planned events": Add event button and the timeline list
    │   ├── share-dialog.ts   # "Share this plan": the link, a copy button and the privacy note
    │   ├── shared-banner.ts  # Banner while a shared plan is open: keep it or go back
    │   ├── start-over-dialog.ts # Confirmation before the saved plan is cleared
    │   ├── event-type-dialog.ts # Asks which kind of event to add
    │   ├── timeline-list.ts  # One list of all events in date order: select, edit, remove, effect
    │   ├── deposit-change-dialog.ts # Dialog to add or edit a deposit change
    │   ├── amount-event-dialog.ts # Dialog for an amount in one month (withdrawal, one-time deposit)
    │   ├── one-time-deposit-dialog.ts # openOneTimeDepositDialog: the amount dialog for one-time deposits
    │   ├── withdrawal-dialog.ts # openWithdrawalDialog: the amount dialog for withdrawals
    │   ├── side-cards.ts     # Bento cards: plan inputs, goal gauge, scenario comparison
    │   ├── components.ts     # Design-system components (toggle, slider, toast, modal …)
    │   ├── design-system.ts  # Reference page for tokens and components (#design-system)
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
