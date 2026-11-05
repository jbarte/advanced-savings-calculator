# Implementation log

A running record of what was built, why, and how it was checked. **Update this file at the end of every
implementation step or PR**: add an entry at the bottom of "Log", and keep "Current status" true.
Plans and goals live in [NEXT_STEPS.md](NEXT_STEPS.md), rules in [CLAUDE.md](CLAUDE.md).

## Current status

- **Merged into `main`:** milestone 1 (PR #1), milestone 2 (PR #2), foundation fixes (PR #3), milestone 3
  "Change my saving over time" (PR #5), the contrast of raised surfaces and dialogs (PR #6), the removal of the
  white glow (PR #7), milestone 4A "one numbered timeline list" (PR #8), one-time deposits (PR #9), milestone 4B
  "events on the chart" (PR #10), the Add event dialog styles fix (PR #11), milestone 5 "saved in the browser"
  (PR #12), milestone 6 "share my plan" (PR #13) and the roadmap after the code review (PR #14) the
  step 0a bug fixes (PR #15) and the step 0b safety net (PR #16). PR #4 had
  been merged into its base `feature/foundation-fixes` after #3 was already in `main`, so it never reached
  `main`; PR #5 carried the same commits there.
- **Lessons:** (1) a stacked PR does not retarget to `main` by itself when its base branch is not deleted.
  Retarget it (or open a new PR to `main`) before merging. (2) Before pushing more commits to a PR branch,
  check that the PR is still open (`gh pr view`), and afterwards check with `git merge-base --is-ancestor`
  that `main` has each commit. This went wrong twice (#4 and the white-glow commit).
- **Open:** milestone 8B, today's money (branch `feature/m8b-todays-money`). 8A is merged (PR #20).
- **Next:** the roadmap in NEXT_STEPS.md, rewritten after a code review on 2026-11-05 (PR #14): bug fixes
  (step 0a), a safety net (0b), cleanup (0c), then milestones 7–12.
- **Tests:** 448 (`npm test`), typecheck and build pass.

## Working rules

- One branch and one PR per piece of work. Tests first for pure logic.
- `npm run typecheck`, `npm test` and `npm run build` must pass before a commit.
- Results are cross-checked against an independent calculation (a separate script), not against the
  engine itself.
- Commits end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Nothing is committed or
  pushed without being asked, and `ANALYS.md` stays out of commits.

## Log

### Milestone 1: "Use my own numbers" (PR #1, merged)
- **Built:**
  - `project()` in `src/core/project.ts` (effective monthly rate, one rounding step per month, deposit
    after growth, withdrawals capped at the balance).
  - `PlanDocument`, `PLAN_LIMITS`, example and blank plans in `src/state/plan-document.ts`, and
    `buildScenarioView` in `src/state/view-model.ts`. The static sample data was removed.
  - Editable Plan card (`renderTextField`, `parse-input.ts`), commit on `change`, and
    `render-scheduler.ts` so Tab and clicks survive a re-render.
- **Decisions:** whole kronor only; limits chosen so balances stay below 2^53 öre; scenario tabs,
  comparison and goal card hidden until built; Share button disabled until milestone 6.
- **Checked:** 50 000 kr + 3 000 kr/mo at 7 % for 30 years gives 3 888 970 kr, matching a closed-form
  calculation. Browser: edits, invalid input, Tab/Enter, 375 px, dark mode.

### Milestone 2: "What does this withdrawal cost me?" (PR #2, merged)
- **Built:** `lostGrowth(plan, index, horizonMonths)` (end balance without the withdrawal minus with it
  minus the amount withdrawn, never below 0), `monthsBetween`, withdrawals in the plan document with
  pure add/update/remove (`src/state/withdrawals.ts`), statuses `planned` / `after-horizon` /
  `before-start`, an add/edit dialog, Edit and Remove per row, a "Reduced" chip, and chart drop markers.
  The example plan got a 150 000 kr car purchase five years in.
- **Decisions:** lost growth takes any horizon in months (prepares a custom horizon); a withdrawal
  before the start is listed but left out of the projection; dialogs live in `<body>` and keep their own
  state until Save.
- **Checked:** example plan ends at 3 074 856 kr, car costs 664 115 kr in lost growth by 2056
  (60 383 kr by 2036, 263 855 kr by 2046). A plan with an oversized withdrawal and an edited one also
  matched an independent simulation. 135 tests.

### Analysis and plan for the next phase (documents only)
- `ANALYS.md` (untracked): docs-based analysis of risks. A code-based version was moved out of the repo.
- The next phase was planned as two PRs: A (foundation fixes) and B (milestone 3).

### Foundation fixes (PR #3, merged)
- **Built:**
  - **Chart:** `niceScale(min, max)` always contains zero and reaches below it for negative values;
    `toPoints`, `areaPath`, `zeroLine`, `isAllZero`; a zero line is drawn. Fixed a real bug: with a
    negative return the growth line was drawn far outside the chart.
  - **Validation in state:** `validate-plan.ts`, `updatePlanFields`, validated withdrawal operations,
    and `withPlanChange`, which leaves the plan alone and sets `AppState.notice` on an invalid change.
    A failing render shows an error view instead of a blank page.
  - **Cleanup:** `MONTHS_PER_YEAR` / `yearsToMonths` replace the magic 12; `errorMessage` and
    `dialog-form.ts` replace duplicated code.
- **Checked:** reproduced the chart bug first (y up to 10 232 050 300), then after the fix the line stays
  inside (y 25–76, zero line at 25 %). 190 tests. The notice and error view were rendered directly,
  since the UI parsers stop invalid values first.
- **Known gaps:** `<input type="month">` untested in Firefox and Safari; a script-only browser run left a
  closed dialog in the DOM when the page had no focus (real clicks remove it).

### Milestone 3: "Change my saving over time" (PR #4 merged into the old base branch, PR #5 merged to `main`)
- **Built:**
  - **Engine:** `depositInMonth` / `depositLevelChanges` in `src/core/deposit-schedule.ts`, used by
    `project()`. The active change with the latest start wins, a tie goes to the later one in the list,
    a period inside an open-ended change returns to it when it ends, a change in month 0 first applies in
    month 1, and a change that ends before it starts is never active.
  - **State:** `depositChanges` in the plan document with their own ids and limit (50),
    `validateDepositChangeDraft` (rejects an end before the start, caps the amount at the monthly deposit
    limit), pure operations in `src/state/deposit-changes.ts`, statuses (`planned`, `after-horizon`,
    `before-start`) and `depositLevels` in the view model. `WithdrawalStatus` became `EventStatus`.
  - **UI:** "Add event" chooser, a deposit change dialog (0 pauses saving, optional until month checked
    against the start as you type), a "Deposit changes" table with Edit and Remove, dotted level markers on
    the chart, and `openFormDialog` shared with the withdrawal dialog. `renderModal` got an optional
    primary button.
- **Decisions (confirmed):** end before start is rejected in the form and in validation; a change before
  the plan start still applies from month 1 if it has not ended, while one that ends before the start is
  listed as `before-start` and left out; deposit changes are a separate list next to withdrawals;
  `version` stays 1 until saving exists.
- **Checked:** hand-calculated, independent of the engine: a 12-month pause at 0 % return takes 1 180 000 kr
  to 1 144 000 kr; at 7 % it costs about 246 944 kr; a period inside an open-ended change returns to that
  change (deposits 1 718 000 kr, balance 93 000 kr in month 35 and 98 000 kr in month 36). In the browser the
  example plan with a 12-month pause ends at 2 827 912 kr (was 3 074 856 kr) and the car's lost growth
  stays 664 115 kr; "5 000 kr/mo from Dec 2027, no end" gives 5 237 607 kr (simulation 5 237 608). Also
  checked: chooser, end-before-start message, Enter to save, Edit prefill, Remove, 375 px, dark mode, clean
  console.
- **Found and fixed on the way:** the deposit level label stretched over the whole chart because the base
  marker rule came later in the CSS and won; fixed with a two-class selector.
- **Known gaps:** `<input type="month">` untested in Firefox and Safari; the "limit reached" state in the
  chooser is only unit tested; labels of events close together overlap on the chart (milestone 4).

### Contrast of raised surfaces (small PR before milestone 4)
- **Why:** the user found the "Planned events" container and the "Add event" button hard to see. It was not
  fixed or in the backlog. Measured: a card or button (`--surface` #f2eee8) against the page (`--page`
  #e8e4de) is only 1.1 : 1 and was told apart by a soft shadow alone. The old `--line` colour would only
  give 1.19 : 1, so a border in that colour would not have helped.
- **Built:**
  - New token `--edge` (light #b8ae9f, about 1.73 : 1 against the page; dark #4f4943, about 1.96 : 1) and
    `--shadow-raised` (the lift shadow plus a 1 px edge as a spread ring, so layout does not move).
  - `--shadow-raised` on `.card`, `.table-card`, `.tile`, `.btn-secondary`, `.btn-round`, `.choice` and
    `.notice`. Hover does not change the shadow, so the edge stays; pressed and focus states are unchanged.
  - "Add event" is now the green primary button (`btn-solid`, 3.5 : 1 against the page).
  - **Dialogs** (the user disliked the "Add event" dialog for the same reason): the chooser's options, the
    Cancel button and the dialog itself were all `--surface`, and the light glow of `--shadow-float` made a
    halo on the dimmed page. Now `.modal` uses `--frame` as background, a new `--shadow-dialog` (dark drop
    shadow plus the edge) and a darker `--backdrop` (0.35 to 0.55 in light mode), so the raised options and
    buttons stand out. The form dialogs get the same treatment.
  - **No white glow anywhere:** the user disliked the white halo around raised elements. The light side of
    the paired neo-tactile shadows was removed from all `--shadow-*` tokens in the light theme and both dark
    themes (21 lines): `--shadow-inner`, `-lift`, `-float`, the `-sm` variants, `--shadow-inner-solid` and
    `--shadow-on-color` (its white top highlight). Only dark shadows, the edge and the dialog shadow remain.
    Left as they are: the text colour `--on-solid`, the slider thumb gradient and the translucent white fills
    on coloured surfaces (`--on-color-fill`), since they are fills and not light. Rule added to CLAUDE.md.
- **Decisions (confirmed):** keep the neo-tactile style and add an edge, instead of redesigning it; do it as a
  separate PR before milestone 4, which then builds on the new style.
- **Checked:** computed styles show the ring (`0 0 0 1px rgb(184, 174, 159)`) and the green background. Looked
  at in light and dark mode: the container, the cards and the "Add event" dialog (options, Cancel, the
  dialog edge) have a clear edge, and the form dialog fields still read well on the new background. 258 tests, typecheck and build pass (CSS only, so no new tests).
- **Known gaps:** without the light side, raised elements have a one-sided (bottom right) shadow, which is
  flatter than the original neo-tactile look; only a visual check in two themes and one width; the edge is about 1.7 : 1, below the
  3 : 1 that WCAG 1.4.11 asks for on component boundaries. Chosen on purpose to keep the soft look, and open
  to a darker edge if wanted.

### Milestone 4A: one timeline list (branch `feature/m4-timeline`)
- **Built:**
  - `src/state/timeline.ts`: `buildTimeline` merges withdrawals and deposit changes in date order (same
    month: deposit change first, then by id) and numbers them from 1, plus `EventKey` helpers. The number
    is what 4B will show on the chart.
  - `AppState.selectedEvent` and the `selectEvent` action. Selection is cleared by "Start from scratch" and when the selected event is removed.
  - `src/ui/timeline-list.ts` replaces `withdrawals-table.ts` and `deposit-changes-table.ts`: one table with
    a numbered badge, title and kind/date line, amount, status, lost growth (withdrawals only), Edit and
    Remove. The title is a real button with `aria-pressed`; the selected row gets the existing blue
    selection style (`:has([aria-pressed="true"])`).
  - Removed the `.events*` and `.table__row--deposit` CSS.
- **Checked:** 6 new unit tests for `buildTimeline` (order, tie-breaks, negative months, input not
  changed, unique keys); 264 tests, typecheck pass. In the browser: the example plan's single event
  selects and deselects; adding a deposit change dated before the car renumbers them (1 Pause, 2 New car)
  and keeps the selection on the car.
  Removing the selected event clears the selection (ids can be reused, so a stale key could select a
  later event).
- **Known gaps:** the table still scrolls
  sideways below about 780 px (the phone layout is 4B); nothing on the chart reacts to the selection yet.

### One-time deposit (branch `feature/one-time-deposit`)
- **Built:**
  - Engine: `PlanInput.oneTimeDeposits`. In every month, after the monthly deposit (and in month 0), the month's
    one-time deposits are added and counted as deposited; then withdrawals are taken out.
  - State: `OneTimeDepositEvent`/`Draft`, `PlanDocument.oneTimeDeposits` (still version 1: nothing is saved yet,
    so no migration), `validateOneTimeDepositDraft`, `one-time-deposits.ts`, `PlannedOneTimeDeposit` and
    `ScenarioView.oneTimeDeposits` with a status, and a third kind in `buildTimeline`.
  - UI: a "One-time deposit" choice in the Add event dialog, `one-time-deposit-dialog.ts`, a third row kind in
    the list (amount shown as `+100 000 kr`), three new actions.
- **Decision (changed from the plan):** the limits are `maxOneTimeDepositAmount` 5 000 000 kr and
  `maxOneTimeDeposits` 10, not the monthly deposit's amount and 50. Fifty deposits of 10 000 000 kr in month 0
  at 50 % for 30 years would give about 9.6e15 öre, above `Number.MAX_SAFE_INTEGER`; the chosen limits fit
  (a test builds the largest plan, with 50 deposit changes too).
- **Checked:** 19 new tests (engine: month 0, same-month withdrawal, two in one month, after the horizon,
  invalid input, closed form within 40 öre; state: add/update/remove/limits/duplicate ids; view model: closed
  form +10 000 000·(1+m)^348, statuses, largest plan; timeline order; amount parser). 283 tests, typecheck.
  In the browser the example plan's end balance went from 3 074 856 kr to 3 617 599 kr with a 100 000 kr
  deposit in month 60: +542 743 kr, equal to 100 000 · 1.07^25. "Deposited" rose by 100 000 kr, the new row is
  numbered before the car (same month), and the amount limit message shows in the dialog.
  Edit (20 000 to 30 000 kr) and remove were clicked through too.
- **Known gaps:** no marker on the chart yet (4B).

### Milestone 4B: events on the chart (branch `feature/m4-chart`)
- **Built:**
  - `chart-geometry.ts`: `monthToPercent`, `bandExtent` (the part of a period inside the horizon) and
    `assignLanes` (first-fit rows so badges closer than 8 % of the width don't overlap; at most 6 lanes).
  - `src/ui/chart-events.ts`: for each event inside the chart, a line, a numbered badge on top (the same number as
    in the list), and a shaded band for a deposit change that has an end. A deposit change without an end is a
    dotted line (a step). Badges are buttons with `tabindex="-1"`, `aria-pressed`, a hover text and an accessible
    name; the list rows stay the keyboard path. Selecting a badge or a row selects the same event: the badge gets
    the focus glow, the line goes solid and the band darker (`aria-current`).
  - A legend lists only the kinds that are drawn. One-time deposits now have a marker too.
  - The old amount labels on the chart ("−150K", "Paused", "3K/mo") are gone; the hover text has the details.
    `depositLevels` stays in the view model but the chart no longer uses it.
  - Phone layout: below 760 px each list row becomes a small card (title and actions, then amount and status,
    then lost growth), so the list no longer scrolls sideways. List and chart badges share colours: rose for
    withdrawals, green for deposit changes, outlined for one-time deposits.
- **Checked:** 10 new tests (month mapping, band clipping, lanes). 293 tests, typecheck and build pass. In the
  browser a plan with ten mixed events (4 withdrawals, 2 one-time deposits, 3 deposit changes of which two end,
  plus the example car): ten badges and two bands on the chart, no horizontal scroll at 375 px (page and list
  both 343 to 375 px wide), badges in separate lanes, selecting a badge selects its list row and the reverse,
  light and dark theme, no console errors.
- **Known gaps:** a cluster of more than six events within about 8 % of the width still overlaps a little
  (lanes run out); the first badge at the far left or right edge can reach past the plot by half its width;
  badges are not reachable with Tab by design; no automated test for the DOM (no jsdom), so the chart layer was
  checked by hand.
- **Fix found after review:** my CSS cleanup for the old chart marker labels deleted everything between two
  selectors by position, which also removed the `.choice` and `.choices` rules of the Add event dialog (the
  options lost their cards and ran together). Restored from `main`. Only this branch was affected. Lesson: after
  removing CSS by range, list every removed line (`git diff main -- src/styles/app.css | grep '^-'`).

### Milestone 5: "It is all saved" (branch `feature/m5-saving`)
- **Built (all in `src/state/` except the UI bits):**
  - `read-plan.ts`: `readPlanDocument`/`readPlanText` turn untrusted data into a `PlanDocument`: shape checked field
    by field, only known fields copied, list lengths checked before walking them, then `validatePlanDocument`. A newer
    version gets its own message. It is the place for future migrations, and M6 reuses it for share links.
  - `plan-storage.ts`: `loadSavedPlan` (none, loaded, invalid with a reason, unavailable), `savePlan` and
    `clearSavedPlan` (return false instead of throwing). They take the storage as a parameter so tests use a fake.
  - `startup-plan.ts`: `resolveStartupPlan` decides what the page opens with and which notice to show.
  - `main.ts`: loads at startup; `persist` after every change that replaces the plan (also "Start from scratch");
    `startOver` clears the save. `AppState.storage` is `idle | saved | blocked`.
  - UI: the Plan card says "Example plan", "Saved in this browser" or "Not saved: storage is blocked"; own plans
    get a "Start over" button that asks first (`start-over-dialog.ts`).
- **Decisions:** the untouched example is never saved, so a visitor who only looks around has nothing written. A
  broken save is not deleted at once: it stays until the next change replaces it. Export and import as a JSON
  file (optional in the plan) was left out.
- **Checked:** 23 new tests (reader: round trip with all event kinds, unknown fields dropped, wrong types, missing
  fields, newer and unknown versions, limits, oversized lists, duplicate ids, bad JSON, `__proto__` key; storage:
  none, loaded, invalid, bad JSON, blocked, missing storage, overwrite, clear; startup: all four cases). 316 tests,
  typecheck and build pass. In the browser: nothing stored on a first visit; after changing the deposit it was
  stored and survived a reload with the same result (4 244 308 kr, equal to an independent calculation);
  a save with a start amount of -5 showed the example with a notice and stayed in storage; with `setItem`
  throwing, the app kept working, said "Not saved" and showed the notice once; "Keep my plan" kept the save and
  "Start over" removed it and showed the example.
- **Known gaps:** two tabs do not see each other's changes (last write wins); the invalid-save notice shows the
  validator's wording ("whole number of öre"); no test of the DOM wiring (no jsdom), so `main.ts` and the Plan card
  were checked by hand; the selected event and horizon are not saved on purpose.

### Milestone 6: "Share my plan" (branch `feature/m6-sharing`)
- **Built:**
  - `src/state/share-link.ts`: `encodePlan` (deflate through `CompressionStream`, base64url, `z.` prefix; `u.` prefix
    without compression when the browser has none), `decodePlan`, `planTokenFromHash`, `buildShareUrl`. Decoding
    limits the token (30 000 characters) and the inflated size (100 000 bytes, read as a stream and stopped early),
    rejects non-base64url text, bad deflate, bad UTF-8 and anything `readPlanDocument` rejects.
  - `route.ts`: `sharedPlanToken`, `currentPageUrl`, `clearShareHash`.
  - `PlanOrigin` has a third value, `shared`. `withPlanChange` keeps it, and `commitPlan` does not save a shared
    plan, so a link can never overwrite the user's own plan. Banner: "Keep as my plan" (asks first) and "Back to my
    plan". The Plan card says "Shared plan · not saved".
  - Share button is on: a dialog with the link, "Copy link", and the note that anyone with the link can see the plan.
    Without clipboard access it says so and the link can be selected by hand.
  - `main.ts`: a link in the address is decoded before the first draw (no flash of the own plan), and a `hashchange`
    opens a link pasted into an already open tab. A bad link keeps the own plan, shows a notice with the reason and
    clears the address.
- **Decision:** with one plan, "open as a copy" means a preview that is never saved unless kept (a separate saved
  copy would need several plans, which come with scenario comparison, milestone 8).
- **Checked:** 19 new tests (round trips of a plan with every event kind and non-ASCII labels, of the largest
  allowed plan, compressed and uncompressed; link length of the largest plan 1 022 characters, 19 365 uncompressed;
  rejects too-long, wrong prefix, bad characters, bad length, cut-off, not deflate, not JSON, not a plan, values
  outside the limits, an 8 MB decompression bomb in a token of under 30 000 characters, invalid UTF-8; hash and
  URL helpers; a shared plan stays shared). 335 tests, typecheck and build pass. In the browser: a plan with a
  one-time deposit and a label with åäö went through plan, link, plan unchanged (the end balance 4 422 165 kr is
  the same on both sides); the link is 321 characters; opening it with an own plan saved left the saved plan
  untouched, also after editing the shared copy; "Back to my plan" restored it and cleared the address; "Keep as
  my plan" asked first (Cancel changed nothing) and then replaced the saved plan; a link pasted into the open tab
  and a cold load both worked; six bad links (empty, junk, cut off, tampered, wrong prefix, 40 000 characters) each
  showed a notice, kept the own plan and cleared the address; no console errors; the banner reads well at 375 px
  with no horizontal scroll.
- **Known gaps:** the clipboard could not be tested here (the automated page has no clipboard permission), only
  the "Could not copy" fallback, so copying should be tried by hand; the link is a snapshot, so changing the plan
  afterwards does not change an already shared link; a tampered link that still inflates to a valid plan opens as
  that plan (there is no signature, and none is needed since the data is checked like any input); the
  uncompressed (`u.`) path is only tested through the functions, not in a browser without `CompressionStream`.

### Code review and roadmap (branch `docs/backlog-review`, docs only)
- **Done:** three read-only review passes over the code on `main` after milestone 6: core and state, UI and
  CSS, tooling, tests and docs. Findings were checked against the code before they went into the plan (for
  example the id check with `Number.isInteger`, the dialog closing on a click in its padding, and a no-op change
  saving the example plan). Findings about the Share button were stale (the review started from a branch older
  than PR #13) and were dropped.
- **Result:** NEXT_STEPS.md has a new "Roadmap": step 0a bug fixes, 0b safety net (checks on pull requests,
  an architecture test, pinned numbers), 0c cleanup, then milestone 7 "What is every event worth?" (includes
  showing lost growth as a loss), 8 custom horizon (plan format version 2), 9 goal planning, 10 strings out,
  11 compare plans, 12 Swedish and polish. Status lines, the target-scenario table and the open decisions were
  brought up to date.
- **Decisions since:** "today's money" goes into milestone 8; the pull-request workflow waits (no config file
  for now). Still open: what the effect column shows (total effect on the end balance is recommended).

### Step 0a: bug fixes from the code review (branch `fix/step-0a`)
- **Fixed (state, test first):**
  - Ids must be safe integers below `Number.MAX_SAFE_INTEGER`, so the next id (highest + 1) is always exact. An
    id of 2^53 in a save or link used to make the next add reuse an id, and the next load fall back to the example.
  - A change that leaves the plan as it was (retyping "3000" as "3 000") keeps the same plan object, so the
    untouched example is no longer marked as the user's own and saved.
  - Event dates may reach `PLAN_LIMITS.maxEventYear` (2130, the last start year plus the longest horizon) instead
    of 2100, in the validator and in the dialog parsers. The plan start keeps its 2000–2100 range.
  - Labels are stored trimmed when added, edited or read from a save or link.
- **Fixed (UI):**
  - A dialog closes on the backdrop only when the press starts and ends outside its box; a click in its padding
    or a text selection dragged out of a field no longer closes it and loses what was typed.
  - Dialogs are named with `aria-label` instead of a shared `id="modal-title"`.
  - Editing an event accepts its own date when that is before the plan start (`earliestMonth`, `earlierOf`).
  - Focus moves to a sensible element when the focused one disappears (`data-focus-next`): Remove → "Add event",
    Start from scratch ↔ Start over, Dismiss and the shared-plan banner buttons → the headline.
  - Notices are read out once through a stable `#announcer` live region; field errors are polite and only
    updated when the message changes.
  - `matchMedia` calls are guarded (`systemPrefersDark`, `onSystemThemeChange`).
  - Very large headline amounts (ten digits or more) get a smaller size, so the page doesn't scroll sideways at 375 px.
  - The share dialog says the link stays in browser history and wherever it is pasted.
- **Checked:** 12 new tests (ids, event-date limit in validator and parsers, trimmed labels in all three lists and
  when reading, no-op change, `earlierOf`). 347 tests, typecheck and build pass. In the browser: retyping the
  example's deposit as "3000" saved nothing and kept "Example plan"; real clicks in the dialog padding kept it open
  and a click on the backdrop closed it; keyboard Remove moved focus to "Add event" and Dismiss to the headline;
  a bad link's notice reached `#announcer` once and was cleared on dismiss; the largest possible balance
  (74 971 414 885 100 kr) fits in 343 px at 375 px with no sideways scroll; after moving the plan start past the
  car, editing the car (now "Before start") saved without moving its date.
- **Not done here:** screen-reader output itself was not tested with a screen reader, only the live region's text.

### Step 0b: safety net (branch `test/step-0b`)
- **Built (tests and settings only, no change in behaviour):**
  - `src/architecture.test.ts` reads the sources through Vite's `import.meta.glob` (no `@types/node` or other new
    dependency) and checks: core imports nothing from state or ui; state imports nothing from ui; the core uses no
    `Date.now`, `new Date`, `Math.random`, `window`, `document`, `localStorage` or `fetch`; the UI touches no storage,
    `location` or `history`; no `innerHTML`. It also checks that it found the files, so it can't pass on nothing.
  - `src/state/reference-values.test.ts` pins the hand-checked results to the öre: base plan 3 888 970,47 kr,
    example plan 3 074 855,73 kr, the car's lost growth 60 382,76 / 263 854,63 / 664 114,74 kr at 10 / 20 / 30 years,
    a 100 000 kr one-time deposit +542 743,05 kr. The values come from a separate Python script that repeats the
    monthly steps, and they match the earlier hand checks (shown rounded in the UI).
  - New tests for `format.ts` (spaces that don't break, minus sign, rounding, compact form), `store.ts`, `route.ts`
    (with a stubbed `window`, and with none) and `validateOneTimeDepositDraft` directly.
  - `noFallthroughCasesInSwitch` and `noImplicitReturns` in `tsconfig.json` (no code changes were needed);
    `"engines": { "node": ">=22.12" }` in `package.json`, lockfile synced.
- **Not done:** the pull-request workflow, on hold by decision.
- **Checked:** 33 new tests; 380 tests, typecheck and build pass. The new tests were checked against planted
  faults: a `Date.now()` in the core, a `ui` import in `state` and a `localStorage` call in the UI each made the
  architecture test fail; adding one öre per month in `project()` made all six reference tests fail. The faults
  were removed again.

### Step 0c: cleanup (branch `refactor/step-0c`)
- **No change in behaviour.** The reference values from step 0b and the architecture test pass unchanged, and
  computed styles in the browser are the same as before.
- **Removed:** `depositLevels` from `ScenarioView` and `depositLevelChanges` from the core (the chart stopped
  using them in 4B; they cost 360 × C calls per render). Its view-model tests now read the deposit of a month from
  the projection itself (`deposited` of a month minus the month before), so the behaviour is still covered; the
  five unit tests of the removed function went with it. Also `initials()`, the CSS classes `.mono`, `.muted`,
  `.tiles` and `.table__empty`, and stale comments ("static sample data", "Where a withdrawal falls", "later on
  the chart", "within 30 years").
- **Shared instead of repeated:**
  - `src/state/event-list.ts` (`nextId`, `appendEvent`, `replaceEvent`, `removeEvent`, with tests) behind the
    add/update/remove of all three event lists; `validatePlanDocument` checks each list with one helper.
  - The deposit-change status uses `statusOf` (from month 0 for a change that began before the plan).
  - `amount-event-dialog.ts`: one dialog for withdrawals and one-time deposits; the two dialog files are now
    a few lines each. `parseLabel` takes its fallback label explicitly.
  - `buildTimeline` runs once per render in `app.ts` and is passed to the chart and the list.
  - Badge and marker colours come from `--kind-*` tokens in one CSS block for chart, list and legend.
- **Magic numbers:** `DEFAULT_MONTHS_AHEAD` is `MONTHS_PER_YEAR`; the example car is `yearsToMonths(5)` ahead;
  the chart height, badge size and lane height are custom properties on `.chart` (the code only sets `--lane`);
  20 font sizes that equal a `--text-*` token now use it.
- **BEM:** `.impact-empty` is now `.impact impact--empty`. JSDoc added to the exported validators.
- **Checked:** 380 tests (5 new for `event-list.ts`, 5 removed with `depositLevelChanges`), typecheck and build
  pass. Every removed CSS line was listed and checked (lesson from 4B). In the browser, with one event of each kind:
  the dialogs are titled "Add one-time deposit", "Add withdrawal" and "Change monthly deposit"; an empty withdrawal
  label still becomes "Withdrawal"; badge, legend and marker colours equal the theme colours in light and dark
  (for example the withdrawal badge rgb(168, 120, 107) light, rgb(141, 98, 90) dark); badge lanes sit at 4, 30 and
  56 px as before; plot height 280 px, badge 22 px, list title 15 px.

### Milestone 7A: the effect of every event (branch `feature/m7a-effects`)
- **Decision (user):** the column shows the *total* effect on the end balance, one meaning for all kinds.
- **Built:**
  - `src/core/event-effect.ts` (test first) replaces `lost-growth.ts`: `withoutEvent`, `eventEffect` (balance
    with the event minus without it, at the horizon; the "with" balance is passed in from the main projection, so
    one extra run per event, cut to the horizon), `totalEffect` (against the plan with no events) and
    `lostGrowthOf` (the growth part of a withdrawal's effect). The old lost-growth cases (closed form, horizon,
    after the horizon, last month, capped, squeezed, rejects a bad position) moved over, plus closed forms for a
    one-time deposit and a 12-month pause, a raise, a change after the horizon and the total.
  - View model: `effect` on every event (0 unless `planned`), `lostGrowth` derived from it, `totalEffect`, ids
    mapped for all three lists; `createScenarioViewCache` so selection, theme and notice changes reuse the view.
  - UI: "Effect by <month>" column for all kinds, bar and signed amount, red (`--effect-loss` = `--danger`) for
    a loss and green for a gain, a hover sentence per kind (a withdrawal splits money and growth; a one-time
    deposit too; a deposit change compares with keeping the deposit), a reason for events without effect, a
    label in each card on phones, and a line above the list with the total. Hero subtitle and empty state cover
    all event kinds. `formatSignedMoney(Compact)` with a plus or a minus sign (U+2212).
- **Checked:** 393 tests (15 for `event-effect.ts`, 9 lost-growth tests moved into them, 5 new reference values,
  4 for signed formatting, 3 for the cache), typecheck and build. Reference values from the independent script,
  pinned to the öre: the car alone −814 114,74 kr by year 30 (−210 382,76 kr by year 10); with a car, a 100 000 kr
  bonus in the car's month and a 12-month pause: end balance 3 370 655,16 kr, car −814 115,08, bonus +542 743,29,
  pause −246 943,62 and total −518 315,31 kr. The page shows exactly these (rounded) in the list, the hover texts
  and the total line. Checked at 375 px in dark mode (labels on each card, no sideways scroll) and on desktop.
- **Known gaps:** the effect amount in `--danger` is about 4.1 : 1 on the card in the light theme, below 4.5 : 1
  for small text (the contrast pass is in milestone 12); 7B (chart and list interplay) is still to come.

### Milestone 7B: chart and list interplay (branch `feature/m7b-chart-list`)
- **Built:**
  - `AppState.chartMonth`: where the chart cursor rests. Selecting an event (in the list or on the chart) moves it
    to the event's month (`chartMonthOf`: a change that began before the plan sits at month 0); the keys set it;
    pointer moves only show a month for as long as the pointer is there. It is reset when the whole plan is
    replaced (start from scratch, start over, a shared plan). A month past the horizon is clamped to the end.
  - The chart is a slider: `role="slider"`, min, max and now, and a value text such as
    "Nov 2031: 133 715 kr. Events: New car"; a hidden hint names the keys. The tooltip lists the month's events by
    their number and is hidden from screen readers (no more announcement on every pointer move).
  - Keys (`cursorAfterKey`, tested): arrows one month, Page Up and Page Down one year, Home and End.
  - `eventsAtMonth`, `chartMonthOf` and `isPlanned` in `timeline.ts` (tested); the chart's own copy of the
    "is it drawn" check is gone.
  - The list's select button is named "Event 1: New car, Withdrawal · Nov 2031" (number, title, kind and date),
    instead of a label that hid the sub-line.
- **Checked:** 399 tests (6 new), typecheck and build. In the browser: the slider starts at month 360 with
  "Nov 2056: 3 074 856 kr"; selecting the car moves it to "Nov 2031: 133 715 kr. Events: New car" (133 715,17 kr
  by the independent script) and the tooltip shows "1 · New car"; Page Up 60 → 72, Page Down → 60, → 61, Home 0,
  End 360; after two Page Downs (336) switching the metric re-rendered the page and the cursor stayed at 336.
- **Known gaps:** the list row and the chart badge are separate controls, so a screen reader reaches the event
  through the list (as decided in milestone 4); held arrow keys redraw the page on each step (cheap now, since the
  view model is cached, but not free).

### Milestone 8A: my own time horizon (branch `feature/m8a-horizon`)
- **Decisions (user):** horizon up to 40 years; maximum return lowered from 50 % to 30 % so money stays exact
  over 40 years (1.5^40 ≈ 11 million would not fit); inflation 2 % by default, its on/off switch not saved (8B).
- **Built:**
  - `PlanDocument` version 2 with `horizonYears` (1–40, whole years) and `inflationPct` (−5 to 20 %). The first real
    migration: `readPlanDocument` upgrades a version 1 plan (saved or in a link) with 30 years and 2 %; a version 1
    plan with a return above 30 % is rejected with the reason. Version 3 and up: "made by a newer version".
  - `PLAN_LIMITS`: `maxReturnPct` 30, `minHorizonYears` 1, `maxHorizonYears` 40, `maxEventYear` 2140, inflation
    limits. `PROJECTION_MONTHS` is 480; the three largest-plan tests now run at 480 months and stay exact.
  - The horizon moved from `AppState` into the plan: the 10/20/30 buttons call `updatePlan`, and a new "End year"
    field in the Plan card (after Start, unit "N YRS") sets any length (`parseEndYear`). `ScenarioView.horizonMonths`
    drives the headline, the chart, the effects and the list. X-axis labels come from real dates (`axisMonths`:
    at most five gaps, no more than one per year). "After horizon" reads "After the end year".
  - Storage keys named after the app (`advanced-savings-calculator:plan` and `:theme`); the old `asc-*` keys are
    still read and removed on the next save.
  - The Plan card fields have a 160 px minimum, so five fields wrap instead of squeezing the month field.
- **Checked:** 421 tests (22 new: migration and limits in reading, validation of the new fields, end-year parser,
  axis months, old storage key, an old version 1 share link, the horizon in the view), typecheck and build. In the
  browser: a version 1 plan saved under the old key opened with 30 years ("Saved in this browser", 4 000 kr a month)
  and was moved to the new key as version 2 after the next change; end year +40 gave "Balance by Nov 2066",
  10 634 891 kr, axis 2026–2066 in steps of 8 years; +2 years gave 159 754 kr with labels 2026 2027 2028; the
  "10 yrs" button gave 782 565 kr. All four balances equal the independent script. A year 41 years ahead is refused
  with "Pick a year from 2027 to 2066". No sideways scroll at 375 px.
- **Known gaps:** changing the horizon of the untouched example now saves it as the user's own plan (the horizon is
  part of the plan); a plan or link with a return above 30 % made before this version no longer opens (decided).

### Milestone 8B: today's money (branch `feature/m8b-todays-money`)
- **Decisions (user):** inflation 2 % by default, the switch is not saved; the amounts the user enters stay in
  nominal kronor, only results are converted.
- **Built:**
  - `src/core/todays-money.ts` (test first): `priceLevel` (effective yearly rate, never `rate / 12`),
    `inTodaysMoney`, `pointsInTodaysMoney`. The balance is divided by each month's level; deposits and
    withdrawals are added up month by month, each divided by its own month's level; growth keeps the identity;
    month 0 is unchanged.
  - `applyTodaysMoney(view, inflationPct)` in the view model converts the points, each event's effect and the total
    (effects are differences at the horizon, so they use the horizon's level), sets `ScenarioView.todaysMoney` and
    leaves event amounts, start amount and deposit alone. `ScenarioView.inflationPct` carries the plan's rate.
  - `AppState.todaysMoney` and `setTodaysMoney`: a view setting, off at each visit, not in the plan, saved
    data or share links.
  - UI: a "Today's money" switch under the horizon buttons, an "Inflation" field in the Plan card
    (`parseInflationPct`, −5 to 20 %), "· today's money" on the headline and the chart card, a sentence under the
    headline ("Results with 2 % inflation a year removed. What you enter stays as entered."), "(today's money)" in
    the effect column header and the total line, and a hover text that gives only the converted effect (the
    nominal "money in plus growth" breakdown stops adding up once divided).
- **Checked:** 448 tests (27 new: the conversion, the view, the parser, and reference values), typecheck and
  build. Reference values from the independent script, pinned to the öre, for the example plan at 2 % over 30
  years: balance 1 697 538,34 kr (3 074 855,73 kr in 2056 kronor), deposited 863 636,80, withdrawn 135 859,62,
  growth 969 761,16, the car −449 449,05 kr (−814 114,74 nominal). In the browser the switch gave exactly these on
  the headline, tiles, chart value text, effect and total; changing the rate to 3 % gave 1 266 800 kr (the script:
  1 266 799,85) and was saved in the plan; switching off returned 3 074 856 kr; the entered 150 000 kr, 50 000 kr
  and 3 000 kr stayed as entered. 375 px in dark mode, no sideways scroll.
- **Known gaps:** the lost-growth figure is not shown in today's money; the chart's event hover texts and the
  Goal and Compare cards (not built yet) will need the same conversion when they arrive; with the switch on, the
  y-axis labels are in today's money but nothing on the axis says so (the card's title does).

