# CLAUDE.md

## Project

**Life Ledger** is a free, browser-based long-term financial planner. It started as the "Advanced Savings
Calculator", and the repo, the Pages URL, the Vite `base` and the storage keys keep that name, so saved plans and share
links keep working. Most online savings calculators only answer "what will I have if I save
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

**Status:** milestones 1–12 are done (10: all interface text in one typed file; 11: a plan can have a name, several plans live as tabs, and they are compared in a chart and a table; 12: Swedish, self-hosted fonts and a CSP, accessibility, files and printing). Next are the ideas in NEXT_STEPS.md: the calculation engine runs, the start amount, monthly
deposit, return and start date are editable, withdrawals can be added, edited and removed with
the effect of every event shown, and the monthly deposit can be changed from a month or for a period
(including a pause). One-time deposits can be added, and all events show on one numbered list and on the chart. The plan is saved in the browser and can be shared with a link. The horizon can be set freely, results can be shown inflation adjusted, and a savings goal shows the monthly deposit needed. [NEXT_STEPS.md](NEXT_STEPS.md) has the target scenario and the milestone plan.

## Tech stack

| Choice | Why |
|---|---|
| **TypeScript** (strict mode) | Financial math needs type safety. Dates, amounts and rates must never get mixed up. |
| **Vanilla HTML/CSS + TS, no UI framework** | The UI is small (forms, a chart, a table). A framework would add weight and abstraction without much benefit. |
| **Vite** | Fast dev server and a simple static build for GitHub Pages. |
| **Vitest** | Unit tests for the calculation engine. Same config as Vite. |
| **GitHub Actions + GitHub Pages** | Free hosting. Tests, build and deploy run on every push to `main`. |
| **Charts drawn with plain SVG** | No chart library to begin with. Ask before adding one. |
| **Geist / Geist Mono** (self-hosted) | Fonts from the base design, served from `public/fonts/` (Latin subset, variable woff2, SIL Open Font License in `OFL.txt`) through `src/styles/fonts.css`. Not from Google Fonts, which would send every visitor's IP address to Google. |

There are no runtime dependencies. Dev dependencies: `vite`, `vitest`, `typescript`. Node 22.12 or newer
(`engines` in `package.json`).

UI languages: **English** and **Swedish** (the switch in the app bar; see "Interface text"). Currency: **SEK** (`1 234 567 kr`).

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
  `PlanDocument` (start capital, return, base deposit, horizon in whole years, inflation, an optional goal, and
  three lists of events: withdrawals, deposit changes and one-time deposits, numbered apart, with real
  `YearMonth` dates rather than month offsets). It is the only thing that gets saved to
  `localStorage` or put in a share link. A mapper turns it into the engine's `PlanInput`
  (dates become month offsets there). Every document has a `version`, and loading goes
  through a hand-written validator and migrations, so old saves and old links keep working. Version 2 added
  `horizonYears` (1–40) and `inflationPct` (default 2, the Riksbank target); a version 1 plan is upgraded with
  30 years (what the page showed then) and 2 %. Version 3 added `goal` (`{ amount, date }` or null; a version 1 or 2
  plan upgrades with no goal). The horizon and the goal are part of the plan, so changing them is a plan change:
  they are saved and shared, and they make the example the user's own plan. The horizon is changed only with the End year
  field in the Plan card. The horizon switch in the hero is a view zoom (`AppState.viewHorizonYears`, null for the plan's
  own; `horizonOptions` in `src/ui/horizon-options.ts`): its first button is the plan's own horizon ("Plan · 25 yrs"), then
  10, 20 and 30 years without the one that equals it. A zoom changes what the open plan is shown over (chart, headline,
  tiles, event effects, goal line, yearly table and CSV), never the plan; it is not saved or shared, and goes back to the
  plan's own when another plan opens or the End year changes. The Compare card always uses each plan's own horizon. Version 4 added `name` (text or null; a
  version 1–3 plan upgrades with no name): a name the user gives the plan, up to `PLAN_LIMITS.maxNameLength` (40)
  characters. It is saved and travels in the share link. Without a name the hero line and page title use the fixed
  texts for where the plan came from (`messages.planCard.names`); with one, `main.ts` passes the name to
  `buildScenarioView` as the scenario's `name` (and `ScenarioView.planName` holds the plan's own, for the page title
  and the share dialog). The plan is renamed from the Plan card's title ("Plan", or the plan's name), which is a button (pencil icon) that opens
  `openRenameDialog` (`rename-dialog.ts`); there is no Name field. Typed text that ends up in the plan (the name, event labels) goes through `cleanText`
  (`src/state/plan-text.ts`): control characters become a space and the ends are trimmed.
- **Plan files and printing.** The Plan card's "File" button opens `openFileDialog` (`src/ui/file-dialog.ts`): download the open
  plan (`planFileText`, `src/state/plan-file.ts`: the plan document as indented JSON), download its yearly figures as CSV
  (`figuresCsv` in `src/ui/csv.ts`, the rows of `yearlyPoints`, separator `messages.locale.csvSeparator`), or open a plan file
  (`pickTextFile`, then `readPlanFile`: a size limit, then the same checks as a link; the plan is added with `addPlan`, and a bad
  file gives the notice `file-unreadable`). Downloads are made from a Blob in memory (`src/ui/download.ts`); nothing leaves the
  browser. `src/ui/print.ts` prints in the light theme with closed tables opened (`data-printing` on `<html>` while it does,
  so the yearly table's toggle doesn't save that), and `@media print` in `app.css` hides the controls.
- **Several plans are a `PlanSet`** (`src/state/types.ts`). `AppState` has `plans: PlanEntry[]` (`{ id, plan, origin }`,
  with `origin` `"example"`, `"own"` or `"shared"`), `activeId` and `returnId` (the plan to go back to when a shared
  one is left). There is no single `state.plan`: the open plan is `activeEntry(state)` (`src/state/workspace.ts`). The ids
  are local to this browser and never shared. A person has at most `PLAN_LIMITS.maxPlans` (5) plans of their own;
  a plan opened from a link is one more and doesn't count. The pure changes (`addPlan`, `selectPlan`, `deletePlan`,
  `updateActivePlan`, `openSharedPlan`, `keepSharedPlan`, `leaveSharedPlan`) live in `workspace.ts` and run through
  `withPlanSetChange` (a refused change, such as the sixth plan, leaves everything as it was and sets a notice with
  the problem code `too-many-plans`); a change to the open plan goes through `withPlanChange` as before. Any change
  that adds or removes a plan makes the untouched example the user's own, so it is saved with the rest. The last plan
  can't be deleted. Names for new plans (`Plan 2`, `… (copy)`, `… without <event>`) come from `messages.planCard` and
  are made in `main.ts`, cut to 40 characters by `fitPlanName`. "Try without" (`planWithoutEvent`,
  `src/state/plan-variants.ts`) adds a copy of the plan without one event.
- **The Compare card** (`compare-card.ts`) shows with two or more plans, after the chart card. `main.ts` builds a
  `ScenarioView` for every plan (cached per plan id, inflation adjusted when the switch is on) and
  `buildComparison` (`src/state/comparison.ts`) turns them into `ComparisonLine`s (one per plan, from its start month through
  its horizon, for the chart's metric) and `ComparisonRow`s (end balance, deposited, growth and withdrawn at the end of the
  plan's own horizon, and the balance difference to the open plan). Plans can start at different months and look different
  distances ahead, so the lines share a calendar axis (`monthIndex`, `calendarPoints`), each ends at its own horizon, and
  the table has an "Ends" column. The card has its own slider chart (tooltip with every plan's value) and a table
  whose plan names select the plan. Line colours are `--compare-1`…`--compare-6` in tab order; the open plan is thicker.
- **`src/state/` builds the UI's view model.** The UI renders `ScenarioView` from
  `src/state/types.ts`. `buildScenarioView` in `src/state/view-model.ts` runs the engine
  (`project`) for 480 months (`PROJECTION_MONTHS`, the longest horizon) and shapes the result, including
  display-oriented fields. It takes the horizon in months (by default the plan's), which is where the effect of
  each event is measured and where the chart ends (`ScenarioView.horizonMonths`). `createScenarioViewCache`
  remembers the view of each plan id and returns the same view while that plan, name and horizon are unchanged, so selection, theme and notice changes don't
  run the engine.
  `goal` is the `GoalSummary` of the plan's goal, or `null` without one (`buildGoalSummary`).
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
  - **Inflation adjusted is a display conversion** (`src/core/inflation-adjusted.ts`): an amount that belongs to month m is
    divided by `(1 + inflation)^(m/12)` (`priceLevel`, the effective yearly rate, like the monthly rate). The balance is
    divided by each month's level; deposits and withdrawals are added up month by month, each divided by its own
    month's level (dividing a running total by the last level would be wrong); growth keeps
    `balance + withdrawn − deposited`; an effect (a difference of two balances at the horizon) is divided by the
    horizon's level. What the user enters (event amounts, start amount, deposit) is never converted, and the engine
    and the plan stay nominal. `applyInflationAdjustment` (view model) applies it when `AppState.inflationAdjusted` is on; that
    switch is a view setting, off at each visit, not saved or shared. The rate is `PlanDocument.inflationPct`.
  - **The goal** is an amount in nominal kronor (like everything the user enters) and a month. The deposit needed
    is `requiredMonthlyDeposit` in `src/core/goal.ts`: the smallest whole-öre *base* monthly deposit that reaches
    the amount by that month, found by bisection (the balance never falls when the base deposit rises). Every
    planned event is kept as it is: withdrawals, one-time deposits and deposit changes (a pause stays a pause, and
    only months without an active change use the base deposit). It is 0 when the goal is reached without saving and
    null when even `maxMonthlyDeposit` is not enough. `buildGoalSummary` (view model) adds the balance at the goal
    date, the shortfall, the share reached, the first month the balance reaches the amount and the amount in
    today's money (`targetInflationAdjusted`); the summary is never converted by the inflation switch. A goal date
    before the plan start or after the 40-year projection has status `before-start` or `after-projection` and no
    numbers. The solver adds about 20 ms for the worst plan (110 events, 40 years); the view cache hides it on
    re-renders that don't change the plan.
  - **The goal in the UI:** the goal card (`goal-card.ts`) shows a prompt to set a goal, or the gauge, the balance at
    the goal date, the deposit needed (with how much more or less than the plan saves now) and when the goal is
    reached; Edit and Remove sit in its header (`goal-dialog.ts`, `goal-text.ts`). On the chart the goal is a dashed
    line at the goal amount, drawn only for the balance, only inside the chart's months and only when the goal is at
    most `GOAL_LINE_MAX_FACTOR` (3) times the highest balance (otherwise it would flatten the curve); the chart's
    scale includes it. With the inflation switch on, the line sits at the goal's value in today's money so it stays
    level with the balance it is compared with.
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
- **Interface text lives in `src/ui/i18n/en.ts` and `sv.ts`.** Every text a user can read (labels, buttons, headings, hover
  texts, accessible names, input messages, empty states) is a string or a function in `en.ts`, grouped by area and
  read as `messages.<group>.<key>` (`import { messages } from "./i18n"`; the name is `messages` because `text` is a
  common local name for typed input). A text with parts to fill in is a function, and the caller formats the parts
  (amounts and dates), so a language can order them as it needs. `Messages` (`messages.ts`) is *derived from* `en`,
  so another language is a file that is typed `Messages`: a missing text or a wrong shape is a compile error
  (`messages.test.ts` checks that, that no text is empty, and that no Swedish text is left as the English one except the
  few that are the same, listed there). `i18n/index.ts` is the one place that picks the language: the user's choice
  (`src/state/language.ts`, saved under `advanced-savings-calculator:language`), else the first language the browser asks
  for that the app has, else English. It is decided once when the page loads, so `messages` stays a plain constant: the
  switch (`renderLanguageButton`, action `setLanguage`) saves the choice and **reloads the page** (plans are saved and a
  share link stays in the address). `applyLanguage` sets `<html lang>`. Not in the language files: the developer-only
  design-system page, the static `<title>` and meta tags in `index.html` (English; the title is replaced at once by the
  page's own), and plan data written when it is made (the example's "New car" label comes from
  `messages.example.carLabel`, and names like "Plan 2" and "… (copy)" from `messages.planCard`), which stay in the
  language they were written in. Numbers and months follow `messages.locale` (`numbers` for whole amounts, always the
  Swedish grouping `1 716 093`; `decimals` for "6.5" or "6,5"; `compact` for "1.7M kr" or "1,7 mn kr"; `dates` for
  "Apr 2031" or "apr. 2031"). The formatters (`createFormatters` in `src/ui/format.ts`) are made from those settings, so
  a test can format in either language, and the core holds no display text. A text that has a decimal number in it
  writes it as the language does (`sv.ts` has a `num` helper); typed percentages accept both the point and the comma.
- **Notices are data, worded by the UI.** `src/state/` never builds a sentence for the user. A check that fails throws a
  `PlanError` (`src/state/plan-problem.ts`, a `RangeError`) with a `PlanProblem`: a code plus the parts to fill in
  (which field, the limits in öre, which kind of event). Its `message` stays English and is for developers and tests.
  `AppState.notice` is a `Notice` (`change-rejected`, `saved-plan-unreadable` and `link-unreadable` carry a problem;
  `storage-blocked`), and `noticeText` (`src/ui/notice-text.ts`) turns it into words from `messages.notices` and
  `messages.problems`, formatting amounts as kronor. Saved or shared data that is not a plan at all is `damaged`.
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
  throws a `PlanError` (a `RangeError` with a problem code) for any value outside `PLAN_LIMITS`, whether it came from a form, a
  saved plan or a link. The parsers in `src/ui/parse-input.ts` only give friendlier messages
  while typing. Every change to the plan goes through `withPlanChange`
  (`src/state/plan-change.ts`): an invalid change leaves the plan alone and sets
  `AppState.notice`. A change that leaves the plan as it was keeps the same plan object, so it is neither marked as
  the user's own nor saved. Ids must be safe integers below `Number.MAX_SAFE_INTEGER`, labels are stored cleaned (`cleanText`),
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
- **The plans are saved in `localStorage`.** Key `advanced-savings-calculator:plans` (`jbarte.github.io` storage is
  shared by all the account's Pages sites, so the key names the app), value a versioned set
  `{ version: 1, activeId, plans: [{ id, plan: PlanDocument }] }` (`src/state/read-workspace.ts`,
  `src/state/plan-storage.ts`). Only the user's own plans are in it, never one opened from a link. A single plan saved
  before there could be several (key `advanced-savings-calculator:plan`, or the earlier `asc-plan`) is still read as a
  set of one, and both old keys are removed by the next save. After every change to the user's plans, `main.ts` saves
  them (`persist`); the untouched example plan is never written. At startup `loadSavedPlans` reads them, and
  `readWorkspaceDocument` checks the shape and runs `readPlanDocument` (`src/state/read-plan.ts`, shape field by field,
  then `validatePlanDocument`) on every plan, so saved text is treated as untrusted (the same reader checks share
  links). A broken save falls back to the example with a
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
  - Opening a link never changes the user's own plans. It opens as an extra plan (`origin: "shared"`, its own tab): never
    saved (`commitPlan` skips `persist`), and edits to it stay in memory. A banner offers "Keep as a new plan" (adds it
    next to the others, when there is room) and "Back to my plans" (returns to `returnId`). The address is cleared of the token when either is used or the link
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
- **Accessibility is checked, not hoped for.** `src/styles/contrast.test.ts` reads `tokens.css` and fails when a text colour is
  under 4.5 : 1 on a background it sits on, or the focus ring, the primary green, the withdrawal colour or a plan line is under
  3 : 1 against the card, in both themes. Change a colour token and run the tests. Other rules: nothing moves under
  `prefers-reduced-motion` (one rule turns every transition off); a control that is switched off has its reason read out
  with it (`aria-describedby`, `renderHiddenHint`) and, where there is room, shown (the event and shared-plan hints), since a
  disabled button can't be focused and a `title` is not read; a scrolling area is reachable with the keyboard and named
  (`tabindex="0"`, `role="region"`); small click targets are at least 24 px (an input fills its whole field); and the chart has a
  table of its figures under it (`year-table.ts`, a native `<details>`, open state in `AppState.yearTableOpen`).
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
  never hard-coded colours. The plans in the Compare card have line colours (`--compare-1`…`--compare-6`). Event kinds have their own tokens (`--kind-withdrawal`, `--kind-deposit-change`,
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
  client-side. This includes a short-link service for sharing plans. Nothing is loaded from another host (no web fonts,
  scripts, images or analytics from a CDN) and the code makes no network requests: `architecture.test.ts` checks both,
  and the built page carries a Content-Security-Policy that allows only this site (`vite.config.ts`; inline style
  attributes are allowed because the page sets some from code, inline scripts are not).
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
├── index.html                # Page shell: title, metas, favicon link; loads fonts and src/main.ts
├── public/favicon.svg        # The logo as favicon, with its own dark-mode colours
├── public/og-image.png       # 1200 × 630 card for link previews (index.html points to it by its full address)
├── docs/screenshot.png       # The screenshot in the README (headless Chrome, 1280 px wide at 2x)
├── public/fonts/             # Geist and Geist Mono (Latin, variable woff2) and their license, OFL.txt
├── package.json              # Scripts and dev dependencies
├── tsconfig.json             # Strict TypeScript config
├── vite.config.ts            # Vite + Vitest config, GitHub Pages base path, and the Content-Security-Policy meta tag (build only)
├── .github/workflows/
│   └── deploy.yml            # Test, build and deploy to GitHub Pages
└── src/
    ├── main.ts               # Entry point: creates the store and actions, renders the app
    ├── architecture.test.ts  # Enforces the layer rules by reading the sources
    ├── core/                 # Pure calculation engine (no DOM, no I/O)
    │   ├── types.ts          # Engine input/output: PlanInput, Projection, Ore …
    │   ├── project.ts        # project(): the monthly projection (+ project.test.ts)
    │   ├── event-effect.ts   # eventEffect, totalEffect, lostGrowthOf: what each event changes (+ test)
    │   ├── goal.ts           # requiredMonthlyDeposit, balanceAtMonth, firstMonthAtLeast: the goal solver (+ test)
    │   ├── deposit-schedule.ts # depositInMonth: the deposit in a given month (+ test)
    │   ├── money.ts          # monthlyRate, roundToOre (+ money.test.ts)
    │   ├── inflation-adjusted.ts   # priceLevel, toInflationAdjusted, inflationAdjustedPoints: inflation-adjusted display (+ test)
    │   ├── year-month.ts     # YearMonth type, addMonths, monthsBetween
    │   └── year-month.test.ts
    ├── state/                # State, data models, storage
    │   ├── types.ts          # ScenarioView, AppState, HORIZON_PRESETS, METRICS
    │   ├── plan-document.ts  # PlanDocument, WithdrawalEvent, PLAN_LIMITS, example and blank plans
    │   ├── validate-plan.ts  # Checks plan fields, withdrawals and whole documents (+ test)
    │   ├── plan-fields.ts    # updatePlanFields: change the plan's single values, validated (+ test)
    │   ├── plan-change.ts    # withPlanChange: apply a change or set a notice (+ test)
    │   ├── workspace.ts      # PlanSet changes: add, select, delete, shared plan, withPlanSetChange (+ test)
    │   ├── read-workspace.ts # The saved set of plans: read, serialize, from a single plan (+ test)
    │   ├── comparison.ts     # buildComparison: lines and end figures of every plan for the Compare card (+ test)
    │   ├── plan-file.ts      # planFileText, readPlanFile: a plan as a file, read with a size limit and the link checks (+ test)
    │   ├── plan-variants.ts  # planWithoutEvent: a copy of the plan without one event (+ test)
    │   ├── plan-name.ts      # renamePlan: give the plan a name, or remove it, validated (+ test)
    │   ├── plan-text.ts      # cleanText: control characters out, trimmed (used for names and labels)
    │   ├── plan-problem.ts   # PlanProblem, PlanError, problemOf: what is wrong with a plan, as data (+ test)
    │   ├── withdrawals.ts    # Pure add/update/remove of withdrawals, validated (+ test)
    │   ├── event-list.ts     # Shared add/update/remove for the three event lists (+ test)
    │   ├── deposit-changes.ts # Pure add/update/remove of deposit changes, validated (+ test)
    │   ├── one-time-deposits.ts # Pure add/update/remove of one-time deposits, validated (+ test)
    │   ├── goal.ts           # setGoal, clearGoal: the plan's savings goal, validated (+ test)
    │   ├── view-model.ts     # buildScenarioView: engine output → ScenarioView (+ test)
    │   ├── reference-values.test.ts # Hand- and script-checked results, pinned to the öre
    │   ├── language.ts       # Language, chooseLanguage, load/save the choice, the browser's languages (+ test)
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
    │   ├── i18n/             # All interface text: en.ts (the source), sv.ts (Swedish), messages.ts (derived type), index.ts (picks the language)
    │   ├── language.ts       # applyLanguage: sets <html lang>
    │   ├── app.ts            # Page layout (app bar, hero, chart, bento, table), focus restore
    │   ├── actions.ts        # Actions interface (UI → state)
    │   ├── dom.ts            # h() / s() element helpers
    │   ├── format.ts         # createFormatters and the money, percent and month formatting in use (öre → "1 234 kr", { 2031, 4 } → "Apr 2031") (+ test)
    │   ├── notice-text.ts    # noticeText, problemText: a Notice or PlanProblem in words (+ test)
    │   ├── parse-input.ts    # Typed text → öre, percent, year-month; errorMessage (+ test)
    │   ├── dialog-form.ts    # Shared dialog shell and helpers (openFormDialog, inputIn, showErrors)
    │   ├── error-state.ts    # Notice banner and the error view shown instead of a blank page
    │   ├── announcer.ts      # announce(): reads notices out once through #announcer
    │   ├── render-scheduler.ts # Defers renders one tick (focus and click safety)
    │   ├── chart-geometry.ts # Chart scale (incl. negative values), points, paths, bands, badge lanes (+ .test.ts)
    │   ├── chart-events.ts   # Event layer on the chart (numbered badges, bands, lines) and its legend
    │   ├── view-helpers.ts   # Small shared view helpers
    │   ├── csv.ts            # figuresCsv, fileBaseName: the yearly figures as CSV, file names from plan names (+ test)
    │   ├── download.ts       # downloadText, pickTextFile: files to and from the user's computer, in memory
    │   ├── file-dialog.ts    # "Plan file": download the plan or its yearly figures, or open a plan file
    │   ├── print.ts          # preparePrinting: light theme and opened tables for a printout
    │   ├── horizon-options.ts # horizonOptions: the buttons of the horizon switch, the plan's own first (+ test)
    │   ├── year-table.ts     # The chart's figures as a table, one row a year, in a <details> under the chart
    │   ├── topbar.ts         # Sticky app bar: brand, plan tabs (+ add), share, theme toggle
    │   ├── logo.ts           # renderLogo(): the Life Ledger mark (same shape as public/favicon.svg)
    │   ├── projection-card.ts # Hero (headline number, horizon switch, KPI tiles) and chart card
    │   ├── events-section.ts # "Planned events": Add event button and the timeline list
    │   ├── add-plan-dialog.ts # Asks how to add a plan: a copy of the open one, or an empty one
    │   ├── delete-plan-dialog.ts # Confirmation before a plan is deleted
    │   ├── rename-dialog.ts  # Prompt to name the plan, opened from the Plan card's title
    │   ├── share-dialog.ts   # "Share this plan": the link, a copy button and the privacy note
    │   ├── shared-banner.ts  # Banner while a shared plan is open: keep it as a new plan or go back
    │   ├── start-over-dialog.ts # Confirmation before the saved plan is cleared
    │   ├── event-type-dialog.ts # Asks which kind of event to add
    │   ├── timeline-list.ts  # One list of all events in date order: select, edit, remove, effect
    │   ├── deposit-change-dialog.ts # Dialog to add or edit a deposit change
    │   ├── amount-event-dialog.ts # Dialog for an amount in one month (withdrawal, one-time deposit)
    │   ├── one-time-deposit-dialog.ts # openOneTimeDepositDialog: the amount dialog for one-time deposits
    │   ├── withdrawal-dialog.ts # openWithdrawalDialog: the amount dialog for withdrawals
    │   ├── compare-card.ts   # The Compare card: a line per plan, a legend and a table of end figures
    │   ├── side-cards.ts     # Bento cards: the Plan card (inputs, rename title, delete)
    │   ├── goal-card.ts      # The goal card: set a goal, or the gauge, the deposit needed, edit and remove
    │   ├── goal-dialog.ts    # Dialog to set or edit the goal
    │   ├── goal-text.ts      # requiredDepositText: words for the deposit needed next to today's (+ test)
    │   ├── components.ts     # Design-system components (toggle, slider, toast, modal …)
    │   ├── design-system.ts  # Reference page for tokens and components (#design-system)
    │   └── theme.ts          # Applies the theme to <html>
    └── styles/
        ├── fonts.css         # @font-face for the self-hosted Geist fonts
        ├── tokens.css        # Colour tokens (light/dark)
        ├── contrast.test.ts  # Checks the colour tokens against WCAG 2.2 contrast in both themes
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
