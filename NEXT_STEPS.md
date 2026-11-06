# Next steps

Status as of 2026-11-05. Read [CLAUDE.md](CLAUDE.md) first for goals, stack and rules, and
[implementation.md](implementation.md) for what was built and how it was checked.

## Where things stand

- **Live:** https://jbarte.github.io/advanced-savings-calculator/ (deploys on every push to `main`).
- **Milestones 1–6 are done**, so the whole target scenario below works:
  - my own numbers (start amount, monthly deposit, return, start date) with validation;
  - withdrawals with their lost growth, changes to the monthly deposit (from a month or for a period),
    and one-time deposits;
  - one numbered list of all events in date order, and the same numbers on the chart (badges, bands for
    periods, a legend, selection shared between list and chart, a phone layout);
  - the plan is saved in the browser, with a "Saved" indicator, a notice when storage is blocked, and
    "Start over";
  - a share link that carries the whole plan after `#` and opens as an unsaved copy.
- **Hidden until their milestones:** the goal card, scenario tabs and the comparison card.
- **Next:** see "Roadmap" below. It folds in a review of the whole codebase (2026-11-05) and the
  backlog requests (custom horizon, "lost growth" shown as a loss).

## The target scenario

This is the product, described from the user's side:

1. I set my **start capital** and a **monthly saving**.
2. I can place a **withdrawal at a specific date**.
3. I can **change my monthly deposit** from a certain date, or **for a period** (for example pause it
   during parental leave).
4. **All events are visible on a graph**, so I get a good overview.
5. The graph reflects **all calculations and changes**, immediately.
6. **Everything is saved**, so my plan is still there when I come back.
7. The whole plan can be **shared as a link without any login**, something like
   `myurl.com/<unique id of my plan>`.

### Is it met?

| # | Requirement | Status |
|---|---|---|
| 1 | Start capital and monthly saving | Met (milestone 1). |
| 2 | Withdrawal at a date | Met (milestone 2), with the lost growth of each withdrawal. |
| 3 | Deposit changes at a date or for a period | Met (milestone 3). One-time deposits were added as well. |
| 4 | All events visible on the graph | Met (milestone 4): numbered badges, bands and one timeline list. |
| 5 | Graph reflects everything | Met. The engine recalculates all 360 months on every change. |
| 6 | Everything saved | Met (milestone 5): `localStorage`, versioned format, broken saves fall back with a message. |
| 7 | Share link without login | Met (milestone 6) as a self-contained `#plan=` link. A short `/<id>` link would need a server (decided against, see "Open decisions"). |

### What changes in the model

- **Deposit changes** become a second kind of event next to withdrawals. A change has a start date,
  an optional end date and an amount (0 pauses saving). Rules are in CLAUDE.md under "Calculation rules".
- **The plan becomes a document.** One versioned, JSON-friendly `PlanDocument` (start capital,
  return, base deposit and a list of events, all with real dates) is the single thing that gets saved
  to `localStorage` and packed into the share link.
- **The share link format** is `…/advanced-savings-calculator/#plan=<compressed plan>`. The part after
  `#` is never sent to a server, which matches the privacy promise. `route.ts` already reads the hash
  for `#design-system`, so it gets a second route for `#plan=`.

## Milestones

Each milestone gives a visitor something new they can do.

### 1. "Use my own numbers" (requirements 1 and 5): done

- I enter start capital, monthly saving, expected return and start date, and the chart, tiles and end
  balance update.
- Invalid input (negative amount, return below -100 %) shows a clear message, never broken numbers.
- First visit shows a worked example I can edit, plus a "Start from scratch" button.
- Until scenario comparison exists, the UI shows one plan and hides the scenario tabs.
- **Done when:** results match a hand calculation, and a bad value never crashes the page.
- *Built:*
  - `project(plan: PlanInput): Projection` in `src/core/project.ts`, with withdrawals already
    supported (capped at the balance, shortfall reported) so milestone 2 only adds the UI and the
    lost-growth figure.
  - `PlanDocument` and `PLAN_LIMITS` in `src/state/plan-document.ts`, and `buildScenarioView` in
    `src/state/view-model.ts`. The sample data is gone.
  - Editable Plan card (`renderTextField`, `parse-input.ts`), inputs commit on `change`, and
    `render-scheduler.ts` keeps Tab and clicks working across re-renders.
  - Whole kronor only for now. Cross-checked by hand: 50 000 kr + 3 000 kr/mo at 7 % over 30 years
    gives 3 888 970 kr.

### 2. "What does this withdrawal cost me?" (requirement 2): done

- I add a withdrawal with a date, amount and label, and see it on the graph as a drop.
- The table shows the growth I lose by the end of the period.
- I can edit or remove a withdrawal.
- If it is bigger than my balance, I am told it was reduced and by how much.
- **Done when:** a 300 000 kr withdrawal in 2031 shows the same lost growth as a hand calculation.
- *Built:*
  - `lostGrowth(plan, index, horizonMonths)` in `src/core/lost-growth.ts`: the end balance without the
    withdrawal, minus the end balance with it, minus the amount actually withdrawn (never below 0).
    It takes the horizon in months, so any horizon works.
  - `WithdrawalEvent` in the plan document, pure add/update/remove in `src/state/withdrawals.ts`, and
    withdrawals mapped from dates to months in `view-model.ts`. A withdrawal before the plan start is
    listed as "Before start" and left out of the projection. One after the horizon is "After horizon".
  - An add/edit dialog (`withdrawal-dialog.ts`), Edit and Remove on each row, a "Reduced" chip when the
    balance could not cover it, and drop markers on the chart.
  - Cross-checked by hand: for the example plan the end balance is 3 074 856 kr and the car costs
    664 115 kr in lost growth by 2056 (60 383 kr by 2036, 263 855 kr by 2046).

### 3. "Change my saving over time" (requirement 3): done

- I can change my monthly deposit from a date onward ("from Jan 2030, save 5 000 instead").
- I can change it for a period only ("pause saving Mar 2029 – Feb 2030"), and it goes back to what
  it was before when the period ends.
- "Add event" asks which kind: withdrawal or deposit change.
- The graph shows the new deposit level straight away.
- **Done when:** a pause for twelve months lowers the end balance by exactly what the hand
  calculation says, and a period inside an open-ended change returns to that change afterwards.
- *Built:*
  - `DepositChangeInput` and `depositInMonth` / `depositLevelChanges` in `src/core/deposit-schedule.ts`,
    used by `project()`. The rules are in CLAUDE.md, including the edge cases: an end before the start is
    rejected (dialog and `validate-plan.ts`) and never active in the engine, a change before the plan
    start still applies if it has not ended, and one after the horizon has no effect within it.
  - `depositChanges` in the plan document with its own ids and its own limit (50), pure operations in
    `src/state/deposit-changes.ts`, status and `depositLevels` in the view model.
  - An "Add event" chooser, a dialog (label, new monthly deposit where 0 pauses saving, from month and an
    optional until month), a table with Edit and Remove, and markers for each change of level.
  - Cross-checked by hand: a 12 month pause costs 36 000 kr at 0 % return (1 180 000 kr becomes
    1 144 000 kr), and about 246 944 kr at 7 %. For the example plan the end balance goes from
    3 074 856 kr to 2 827 912 kr, and the car's lost growth stays 664 115 kr.

### 4. "See everything at a glance" (requirement 4): done

Delivered in three PRs: **4A** one numbered timeline list replaces the two tables and rows can be
selected; **one-time deposits**, a third event kind requested in between; **4B** numbered badges, bands,
lanes for overlapping badges, a legend, selection on the chart and the phone layout of the list.

- Every event is visible on the graph: withdrawals as drops with labels, deposit changes as shaded
  periods or step markers, each with a hover or focus description.
- One timeline list shows all events sorted by date (replaces the withdrawals table). Selecting an
  event highlights it on the graph.
- A short legend explains the markers.
- Works on a phone and with the keyboard.
- **Done when:** a plan with ten mixed events is readable at phone width.

### 5. "It is all saved" (requirement 6): done (export and import as a JSON file moved to milestone 12)

- My plan is still there when I come back. Nothing is sent anywhere.
- A small "Saved" indicator, and a clear notice if my browser blocks storage.
- "Start over" clears everything, with a confirmation.
- Optional: export and import the plan as a JSON file as a backup.
- **Done when:** a plan saved by this version still opens after the format changes (versioned
  `PlanDocument` with migrations), and broken saved data falls back to the example with a message.
- *Technical work:* `PlanDocument` and its validator in `src/state/`, autosave through the store.

### 6. "Share my plan" (requirement 7): done

- "Share link" copies a link that opens the same plan for anyone, with no login.
- When I open a link, I choose whether to open it as a new copy or replace my own plan. The default
  is a copy, so I never lose my own plan by accident.
- A short note says that anyone with the link can see the plan.
- A broken, cut-off or outdated link shows a friendly message, not a blank page.
- **Done when:** a plan survives the round trip (plan → link → plan) unchanged, and a link with
  invalid or oversized data is rejected without crashing.
- *Technical work:* encode and decode in `src/state/` (deflate through the browser's built-in
  `CompressionStream` and base64url, so no dependency; fall back to uncompressed if it is missing).
  Treat the incoming data as untrusted: size limit, schema check, value ranges. Measure the link
  length with a large plan.

## Roadmap

The order below comes from a review of the whole codebase on 2026-11-05 (core and state, UI and CSS,
tooling, tests and docs) and the backlog requests. Small fixes first, then features in an order where
each one prepares the next: the horizon before the goal (the goal date defaults to the horizon end), the
strings moved out before the two milestones that add the most text, and the saved format changed one
deliberate step at a time.

### Step 0a: bug fixes (one small PR, no decisions needed)

All confirmed in the code:

- **Ids accept unsafe integers.** `validate-plan.ts` checks ids with `Number.isInteger`. An id of 2^53 in a
  saved plan or a link passes, the next add computes the same id again, and the next page load rejects the
  save and shows the example instead of the user's plan. Use `Number.isSafeInteger` and a maximum.
- **Clicking a dialog's own padding closes it**, and anything typed is lost (`components.ts`,
  `event.target === dialog` is also true inside the padding). Close only on a click outside the dialog's box.
- **A change that changes nothing still counts as a change.** Retyping "3000" as "3 000" replaces the plan
  object, so the untouched example is marked as the user's own and saved, against the rule that it never is.
  Skip the update when the plan is equal.
- **Event dates are capped at 2100**, the same as the start, so a plan starting after 2070 can't have events
  late in its horizon. Tie the cap to the start year plus the longest horizon.
- **Labels are checked trimmed but stored untrimmed.** Store the trimmed label, also when reading a save or a link.
- **Edit dialogs reject an event's own date when it is before the plan start** (`parseMonthOnOrAfter`), so a
  deposit change that started earlier (allowed by the rules) can't be edited without moving it.
- **Focus falls to the page** after Remove, "Start from scratch", "Start over" and Dismiss, because the
  focused element has no counterpart after the re-render. Move focus to a sensible neighbour.
- **Announcements repeat.** The notice (`role="alert"`) is created again on every render and read out again;
  field errors are read out on every keystroke. Use a stable live region and announce on change only.
- **Two dialogs can briefly share `id="modal-title"`** (the event-type dialog is removed after the next one
  opens). Give each dialog its own id.
- `systemPrefersDark` and the `matchMedia` listener have no try/catch; the hero number (44 px, no wrap) may
  overflow at 375 px with a large balance.
- The share dialog should also say that the link stays in browser history and wherever it is pasted.

### Step 0b: safety net (done, except the pull-request workflow, which waits)

- **Checks on pull requests (on hold, see open decision 6).** Today only pushes to `main` run anything, so the CSS removed by mistake in 4B
  reached `main` unnoticed. Run `npm test` and `npm run build` (which includes the typecheck) on every pull
  request. Set the deploy's `cancel-in-progress` to `false`, as in GitHub's Pages template.
- **Architecture test** in Vitest, with no new dependency: `src/core` imports nothing from `state` or `ui` and
  uses no `Date.now`, `Math.random` or `window`; `src/state` imports nothing from `ui`. This replaces the
  ESLint idea for the layer rule.
- **Pin real numbers.** The hand-checked results (example plan 3 074 856 kr, the car's lost growth 664 115 kr)
  are asserted nowhere; the view-model tests only check `> 0`.
- Tests for `format.ts` (non-breaking space, minus sign), `store.ts` and `route.ts`, and for
  `validateOneTimeDepositDraft` directly.
- `noFallthroughCasesInSwitch` and `noImplicitReturns` in `tsconfig.json`; `"engines": { "node": ">=22.12" }`.

### Step 0c: cleanup (done)

- **Dead code:** `initials()`, the CSS classes `.mono`, `.muted`, `.tiles` and `.table__empty`, and
  `depositLevels` with `depositLevelChanges`, which the chart no longer uses but which still cost 360 × C
  calls per render. Stale comments: "static sample data", "Where a withdrawal falls", "later on the chart",
  "within 30 years".
- **Duplication:** the withdrawal and one-time deposit dialogs are nearly identical (one "amount in a month"
  dialog); add/update/remove is written three times (one helper for an event list); the deposit-change status
  repeats `statusOf`; `validatePlanDocument` repeats one block per list; badge colours are defined three times
  (chart, list, legend) and should be one set of kind tokens such as `--kind-withdrawal`; `buildTimeline` runs
  twice per render.
- **Magic numbers:** `DEFAULT_MONTHS_AHEAD = 12` (use `MONTHS_PER_YEAR`), the example car at
  `addMonths(today, 60)` (use `yearsToMonths(5)`), the 26 px badge lane, 22 px badge and 280 px chart height
  (CSS custom properties shared with the code), raw px font sizes where `--text-*` tokens exist.
- **BEM:** `.impact-empty` becomes `.impact--empty`.

### Milestone 7: "What is every event worth?" (includes "show lost growth as a loss"): done

Done in two PRs. **7A:** the effect column for all kinds (total effect on the end balance, decided), red and
green, the total, the speed-up and cache, the phone label and the wording. **7B:** the chart and list interplay
(the cursor follows a selected event and keeps its place, the tooltip lists the month's events, slider keys)
and the select button's accessible name.

The product promise is to make the cost of a decision visible, but only withdrawals show an effect today:
the column is empty for a one-time deposit or a pause.

- An effect column for all three kinds, red for a loss and green for a gain, with a minus or plus sign, and a
  total effect of all events. Use the `--danger` token and keep it distinct from the red "Reduced" chip.
- Performance first: the "with" run in `lostGrowth` equals the main projection, so reuse it (half the work),
  and cache the view model on (plan, horizon), so selection, theme and notice changes don't re-run the engine.
  Today 50 withdrawals cost about 100 projections per render.
- Chart: selecting a row moves the cursor to that month; the cursor keeps its place across re-renders; the
  tooltip lists the events in the hovered month; Home, End, PageUp and PageDown move by start, end and year.
- List: the select button's accessible name includes the kind and date (today it hides the sub-line), and on
  phones the effect gets a visible label, since the column header is hidden there.
- Copy: the hero subtitle ("what each withdrawal costs you") and the empty state cover all event kinds.

### Milestone 8: "My own time horizon" (backlog request): done

**8A (done):** horizon 1–40 years in the plan (format version 2 with the upgrade of version 1), end year in
the Plan card next to the presets, 40-year projection, maximum return 30 % (decided), namespaced storage keys.
**8B (done):** the "inflation adjusted" switch (2 %, not saved, decided; what the user enters stays nominal, decided),
using `inflationPct` from version 2, an inflation field in the Plan card, and labels on the headline, chart, list
and total.

- Set the end of the projection freely: a typed or picked end year next to the 10, 20 and 30 year presets. No
  live slider, so open decision 2 stays as it is.
- The horizon becomes part of the plan, so a shared link opens with the same end date. That makes
  `PlanDocument` version 2, with the first real migration in `readPlanDocument`: old saves and links still open.
- `PROJECTION_MONTHS` becomes a parameter; recheck `PLAN_LIMITS` and the largest-plan test for the new
  maximum; the x-axis labels come from real dates; "Not within 30 years" and similar texts follow the horizon.
- Namespace the storage key (for example `advanced-savings-calculator:plan`, reading the old key once):
  `localStorage` on `jbarte.github.io` is shared with every other Pages site of the same account.
- An "inflation adjusted" switch that shows results adjusted for inflation (one plan field and a display
  conversion), decided to be part of this milestone and built in 8B.

### Milestone 9: goal planning: done

**9A (done):** the solver in `src/core/goal.ts`, plan format version 3 with `goal`, validation, `setGoal`,
and the goal summary in the view model. **9B (done):** the goal card (set, edit, remove), a goal line on the chart,
and the inflation-adjusted equivalent. Decisions made: the solver changes the base monthly deposit and keeps every
event; the goal amount is nominal; the goal lives in the plan (version 3).

- Set a goal amount and date (defaulting to the horizon end), see whether I am on track, the monthly deposit I
  need and when I would reach it, with all events included.
- A pure `requiredMonthlyDeposit(plan, goal)` in `src/core/`, found by bisection on whole öre (the end balance
  only grows with the deposit), tested first, including a goal that can't be reached.
- The goal in the plan (version 3), a goal line on the chart, and the existing goal card wired up (it uses
  `GoalInput` and `GoalSummary`, which exist but are unused today).

### Rebrand: Life Ledger (done, PR #25)

The app is now **Life Ledger**, described as a long-term financial planner, with a new logo (ledger bars, one cut
down to a stub) and a matching favicon. The visible brand changed; the repo, the URL and the storage keys did not.

### Milestone 10: strings out (prepares Swedish): done

**10A (merged, PR #24):** all text in `src/ui` (about 180 texts) moved into the typed `src/ui/i18n/en.ts`, and the
scenario names in `main.ts`. **10B (in its PR):** `formatYearMonth` moved to `ui/format.ts` on `Intl`, the checks throw
problem codes, and notices are data that the UI words. A broken save now says "Start amount must be from 0 kr to
100 000 000 kr" instead of the raw "a whole number of öre from 0 to 10000000000". Left for milestone 12: number
formats per language, and the example plan's "New car" label (plan data, made in `src/state`).

- All UI text in a typed `src/ui/i18n/en.ts`, so a missing translation will be a type error.
- `formatYearMonth` moves out of the core into `ui/format.ts` and uses `Intl` (month names are display text).
- Validation errors get codes, so the notices can be translated. Today a broken save or link shows the raw
  validator text ("a whole number of öre from 0 to 10000000000").

### Backlog request: a name for the plan (done, in its PR)

A plan gets a name the user picks ("House 2031", "Anna's pension"), so it can be referred to, also when it is
shared. Today the hero line says "Example plan", "My plan" or "Shared plan", fixed texts chosen from where the plan
came from.

- **In the plan:** `PlanDocument.name: string | null` (version 4; versions 1–3 upgrade with `null`). It is saved
  and travels in the share link, so the person who opens the link sees the same name. It is cleaned (control
  characters become a space, ends trimmed) and validated in `validate-plan.ts`: 1–40 characters. Naming the example
  makes it the user's own plan, like any other change.
- **Where it shows:**
  - The hero line uses the name in place of "My plan". The rest of the line stays as it is:
    `House 2031 · How your savings grow, and what each event adds or costs.`
  - Without a name, the hero line falls back to today's texts.
  - The page title becomes `House 2031 · Life Ledger`, so tabs and bookmarks tell plans apart.
  - The share dialog names the plan it shares.
- **A shared plan keeps its name**, and the hero line shows that name instead of "Shared plan". The banner and the
  Plan card status still say it is a shared copy that is not saved.
- **Editing:** the Plan card's title is a button (with a pencil icon) that reads "Plan", or the name once there is one, and opens a small "Rename plan" prompt, with
  "My plan" as the placeholder. Saving empty text removes the name. There is no extra field in the card.
- **Why before milestone 11:** the names become the labels of the plan tabs and the comparison table there. The
  same cleaning now also covers event labels (the review finding about control characters in labels).

### Milestone 11: compare plans: done

Split in two pull requests, like milestone 9. Decided: at most 5 plans, and the comparison is its own card.

- **11A (in its PR): several plans.** Tabs with a "+" (a copy of the open plan, or an empty one), rename (the Plan
  card's title), delete (with a confirmation; the last plan can't be deleted), and "Try without" on every event row,
  which adds a copy of the plan without that event. Saving covers all plans in one versioned set under a new key; a
  plan saved before reads as a set of one. A share link still carries one plan (the open one), and a link opens as an
  extra, unsaved tab with "Keep as a new plan" and "Back to my plans", which closes the gap left in milestone 6.
- **11B (in its PR): compare.** A Compare card, shown with two or more plans, after the chart card: one line per plan on
  its own chart (the main chart keeps the open plan and its events; the lines follow the chart's metric and the
  inflation switch) and a table with the end balance, deposited, growth, withdrawn and the difference to the open plan.
  Plans on different start months share a calendar axis and are compared at the end of their own horizon (the "Ends"
  column says when). Plan names in the table select the plan.

### Milestone 12: Swedish and polish

Decided: four pull requests, 12A Swedish, 12B privacy and page basics, 12C accessibility, 12D export. The language opens
as the browser's and a switch in the app bar changes it (it saves the choice and reloads the page).

- **12A Swedish (in its PR):** `sv.ts` typed `Messages`, the language choice and its switch, month names and numbers per
  language (`Apr 2031` / `apr. 2031`, `1.7M kr` / `1,7 mn kr`, `6.5` / `6,5`), `<html lang>`, and the example plan's label in
  the language it is made in. Left: the static page title and meta tags stay English, and plan data written earlier (a plan
  named "Plan 2" or labelled "New car") stays in the language it was written in.
- **Privacy:** self-hosted Geist fonts. Loading them from Google sends every visitor's IP address to Google,
  which contradicts "no tracking". Then a Content-Security-Policy meta tag (`default-src 'self'`).
- **Page basics:** an Open Graph image for shared links, and a `<noscript>` message (the favicon, `theme-color`
  and Open Graph text came with the rebrand).
- **Accessibility:** `--muted` text is about 3.1–3.4 : 1 against its backgrounds and white on the rose badge
  about 3.8 : 1 (4.5 : 1 is needed for small text); reduced motion misses some transitions; some explanations
  are only in `title` on disabled buttons; a hidden table of yearly values as an alternative to the chart; the
  Start month field may jump while editing; the month input is untested in Firefox and Safari.
- **Export:** the plan as a JSON file and back (left out of milestone 5), a CSV of yearly values, print styles.
- **README:** a screenshot and an updated feature list.

### Ideas to investigate after milestone 12

Raised by the user on 2026-11-06. To be looked at once milestone 12 is done; each one starts with an investigation and
a decision before any build. They overlap, so they may become one milestone ("feel").

- **Sliders and instant feedback.** Let the main values (start amount, monthly deposit, return, horizon) be changed with
  sliders where the chart reacts at once, not when a field is left. This is open decision 2 below: today inputs commit
  on `change` because a full re-render replaces the field being typed in. To investigate: render the form once and
  redraw only the results (CLAUDE.md says to ask before restructuring), which values suit a slider (and their ranges, so
  the limits in `PLAN_LIMITS` stay true), whether a slider and the typed field share one value, and the cost of running
  the engine on every move (about 30–55 ms for the worst plan, so it probably needs a lighter projection while
  dragging).
- **Show the plan's own horizon.** The horizon buttons (10 / 20 / 30 yrs) change the plan's horizon (`updatePlan`), so a
  plan with 25 years loses its 25 the moment another button is pressed, and no button gets it back (it can only be typed
  again as an end year). Wanted: an option that shows the plan's own horizon, and that is the default. To investigate:
  whether the buttons should become a view setting (a zoom that isn't saved or shared, like the inflation switch) with the
  plan's horizon kept in the plan, or stay as they are with a fourth button for the plan's horizon. The first is
  cleaner, but it changes what "10 yrs" means (the effects and the goal are measured at the plan's horizon).
- **Smooth transitions when the chart changes.** The page is redrawn from scratch on every change, so lines, bars and
  numbers jump. To investigate: animating the line and the area between two states (the chart is plain SVG, so a path
  can be morphed when both have the same number of points), counting numbers up or down, fading dialogs in and out, and
  how to do it with `prefers-reduced-motion` respected and without breaking the focus and click rules in CLAUDE.md
  (renders deferred one tick, elements replaced). Likely needs the chart to be updated in place instead of replaced.
- **Overall polish.** The look stays as it is. The goal is a premium feel from small details, for example the
  animation above. A list to build up during the investigation: hover and press states, easing and durations as tokens,
  the chart cursor and tooltip, tab and dialog transitions, empty states, loading of the fonts without a jump, and the
  touch feel on a phone. Each detail is judged against the design rules in CLAUDE.md (no white glow, tokens only) and
  against accessibility (reduced motion, contrast, focus).

## Open decisions

1. **Short link or self-contained link?** Decided: self-contained (`#plan=…`), built in milestone 6. A short
   `/<id>` link would need a server and a database, which the "no backend" rule rules out.
2. **Should the graph move while I type?** Text inputs update the plan when I leave the field or press
   Enter. Updating on every keystroke or while dragging needs the form built once and only the results
   re-rendered. Recommendation: keep "on change"; milestone 8 uses a typed end year instead of a slider.
3. **Scenario tabs:** decided: hidden until milestone 11.
4. **What does the effect column show (milestone 7)?** Decided: the total effect on the end balance. With the example plan: the car
   (150 000 kr) costs 664 115 kr in growth only, or 814 115 kr as the total effect on the end balance (the
   amount plus its growth); a 12-month pause has a total effect of 246 944 kr. Recommendation: one meaning for
   the whole column, the total effect on the end balance, so all three kinds read the same way.
5. **"Inflation adjusted":** decided, included in milestone 8.
6. **Pull-request workflow in step 0b:** decided to wait. No workflow or config file is added for now; the
   rest of step 0b goes ahead.

## Not in the list, possible later

- Swedish ISK and KF tax rules (a yearly standard tax instead of tax on gains).
- Prettier, which is a new dev dependency and needs approval first.

## Known loose ends

- `actions/deploy-pages@v4` warns that it targets an outdated Node version. Bump it when a new major
  version comes out.
- More than six events within about 8 % of the chart width still overlap a little, and a badge at the very
  first or last month reaches past the plot by half its width.
- `ANALYS.md` stays out of commits by hand; it is not in `.gitignore`.
