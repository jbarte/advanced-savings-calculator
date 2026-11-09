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
- **Merged since:** milestones 7–9, 10A (PR #24) and the rebrand to **Life Ledger** (PR #25; the repo, URL and storage
  keys keep the old name).
- **Merged since:** milestone 10B (PR #26).
- **Merged since:** the plan name (PR #27), milestone 11 (PRs #28 and #29) and the backlog ideas (PR #30).
- **Merged since:** milestone 12 in full (PRs #31 to #34).
- **Merged since:** the plan's own horizon (PR #35).
- **Merged since:** sliders (PR #36), the collapsible Compare card, more sliders and the steady layout (PR #37), and smooth transitions (PR #38).
- **Merged since:** polish, part 1 (PR #39).
- **Open:** polish, part 2: chart details (branch `feature/polish-chart`).
- **Next:** polish, part 3 (undo and empty states), see NEXT_STEPS.md.
- **Tests:** 688 (`npm test`), typecheck and build pass.

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
- **Decisions since:** "inflation adjusted" goes into milestone 8; the pull-request workflow waits (no config file
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

### Milestone 8B: inflation adjusted (branch `feature/m8b-todays-money`)
- **Decisions (user):** inflation 2 % by default, the switch is not saved; the amounts the user enters stay in
  nominal kronor, only results are converted.
- **Built:**
  - `src/core/inflation-adjusted.ts` (test first): `priceLevel` (effective yearly rate, never `rate / 12`),
    `toInflationAdjusted`, `inflationAdjustedPoints`. The balance is divided by each month's level; deposits and
    withdrawals are added up month by month, each divided by its own month's level; growth keeps the identity;
    month 0 is unchanged.
  - `applyInflationAdjustment(view, inflationPct)` in the view model converts the points, each event's effect and the total
    (effects are differences at the horizon, so they use the horizon's level), sets `ScenarioView.inflationAdjusted` and
    leaves event amounts, start amount and deposit alone. `ScenarioView.inflationPct` carries the plan's rate.
  - `AppState.inflationAdjusted` and `setInflationAdjusted`: a view setting, off at each visit, not in the plan, saved
    data or share links.
  - UI: an "Inflation adjusted" switch under the horizon buttons, an "Inflation" field in the Plan card
    (`parseInflationPct`, −5 to 20 %), "· inflation adjusted" on the headline and the chart card, a sentence under the
    headline ("Inflation adjusted at 2 % a year. What you enter stays as entered."), "(inflation adjusted)" in
    the effect column header and the total line, and a hover text that gives only the converted effect (the
    nominal "money in plus growth" breakdown stops adding up once divided).
- **Checked:** 448 tests (27 new: the conversion, the view, the parser, and reference values), typecheck and
  build. Reference values from the independent script, pinned to the öre, for the example plan at 2 % over 30
  years: balance 1 697 538,34 kr (3 074 855,73 kr in 2056 kronor), deposited 863 636,80, withdrawn 135 859,62,
  growth 969 761,16, the car −449 449,05 kr (−814 114,74 nominal). In the browser the switch gave exactly these on
  the headline, tiles, chart value text, effect and total; changing the rate to 3 % gave 1 266 800 kr (the script:
  1 266 799,85) and was saved in the plan; switching off returned 3 074 856 kr; the entered 150 000 kr, 50 000 kr
  and 3 000 kr stayed as entered. 375 px in dark mode, no sideways scroll.
- **Naming (user request after review):** the feature is called "inflation adjusted", not "today's money" (switch,
  labels, `inflationAdjusted` in the view and the app state, `src/core/inflation-adjusted.ts`,
  `applyInflationAdjustment`). The branch and the PR title keep the first name. The default rate stays 2 %.
- **Known gaps:** the lost-growth figure is not shown inflation adjusted; the chart's event hover texts and the
  Goal and Compare cards (not built yet) will need the same conversion when they arrive; with the switch on, the
  y-axis labels are inflation adjusted but nothing on the axis says so (the card's title does).

### Milestone 9A: the goal engine (branch `feature/m9a-goal-engine`)
- **Decisions (user):** the deposit needed is the *base* monthly deposit, with every planned event kept; the goal
  amount is nominal kronor; the goal is part of the plan (format version 3).
- **Built:**
  - `src/core/goal.ts` (test first): `requiredMonthlyDeposit(plan, goal, maxDeposit)` by bisection on whole öre
    (about 30 projections), `balanceAtMonth`, `firstMonthAtLeast`. The balance never falls when the base deposit
    rises (a larger balance only covers a withdrawal better), which is what makes bisection valid. 0 when the goal
    is reached without saving, null when `maxDeposit` isn't enough.
  - Plan format version 3: `PlanDocument.goal` (`GoalPlan { amount, date }` or null), `PLAN_LIMITS.maxGoalAmount`,
    `validateGoal`, `setGoal`/`clearGoal` (`src/state/goal.ts`). `readPlanDocument` upgrades version 1 and 2 plans
    (no goal) and requires `goal` in version 3; unknown fields inside the goal are dropped.
  - View model: `GoalSummary` now has `status` (`ok`, `before-start`, `after-projection`), `date`, `withinHorizon`,
    `requiredMonthly` (null when out of reach) and `targetInflationAdjusted`; `buildGoalSummary` fills it. The
    inflation switch leaves it alone (the goal is nominal). The old goal card's text handles a null deposit.
- **Checked:** 478 tests (30 new: 12 for the solver, 5 for reading and upgrading the goal, 3 for `setGoal`, 8 for the view,
  2 reference values), typecheck and build. Values from the independent script, to the öre, and each solver result
  is the exact minimum (one öre less falls short): for the example plan 4 000 000 kr after 30 years needs
  3 791,10 kr a month (balance at that deposit 4 000 009,89 kr, one öre less 3 999 998,05 kr), 1 000 000 kr after
  10 years needs 6 501,11 kr, 2 000 000 kr after 30 years needs 2 080,89 kr; the plan first reaches 1 000 000 kr in
  month 209, 2 000 000 kr in month 298 and 4 000 000 kr in month 401; the 4 000 000 kr goal is worth 2 208 283,56 kr
  in today's money at 2 %. Timing: the whole view for a plan with 110 events over 40 years takes about 54 ms with a
  goal and 32 ms without, once per plan change (the cache hides it otherwise).
- **Known gaps:** nothing in the UI shows or edits the goal yet (9B); the goal card from the first shell still
  exists but is hidden until 9B replaces it.

### Milestone 9B: the goal in the interface (branch `feature/m9b-goal-ui`)
- **Built:**
  - `goal-card.ts` replaces the dead goal card from the first shell (and its code in `side-cards.ts`). Without a goal
    it is a prompt with "Set a goal"; with one it shows the gauge, the balance at the goal date, the deposit needed,
    when the goal is reached and the goal inflation adjusted, with "Edit" and "Remove" in the header. The gauge's magic
    numbers are named constants. A goal date before the plan start or after the 40-year projection shows a message
    instead of numbers.
  - `goal-dialog.ts` ("I want to have" / "By", the month defaults to the end of the horizon, same checks as the
    other dialogs, an edited goal keeps its own earlier date), `parseGoalAmount`, `setGoal` and `clearGoal` actions.
  - `goal-text.ts` (`requiredDepositText`, tested): "791 kr/mo more than your deposit now", "less than", "the same",
    "Nothing" when no saving is needed, "Not reachable" when even the largest deposit isn't enough.
  - Chart: a dashed goal line with its value at the left end (the tooltip rests at the right end), "Goal" in the
    legend, and the scale includes it. Rules in `chart-geometry.ts` (`chartGoalLine`, `valueToPercent`, tested): only
    for the balance, only for a goal inside the chart's months, and none when the goal is more than 3 times the
    highest balance (it would flatten the curve; the card still says how far off it is). With the inflation switch
    on, the line sits at the goal's value in today's money.
  - Remove sends keyboard focus to "Set a goal", and "Set a goal" to "Edit".
- **Checked:** 489 tests (11 new: goal amount parser, goal line rules, scale position, deposit wording), typecheck and
  build. In the browser against the independent script: 4 000 000 kr by Nov 2056 shows 76 %, short 925,1K kr, 3 791 kr/mo
  needed (791 kr/mo more than now), reached Apr 2060, 2 208 284 kr inflation adjusted, line at 4M on a chart that now
  reaches 6M; 1 000 000 kr by Nov 2036 shows 40 %, 6 501 kr/mo, reached Apr 2044; 2 000 000 kr by Nov 2056 shows "On track",
  2 081 kr/mo (919 kr/mo less), reached Sep 2051; 50 000 000 kr draws no line and says short 46,9M kr; with the
  switch on the line moves to 2.2M; with a 10-year horizon the line disappears and the card says the date is after the
  end year; moving the plan start past the goal date shows the "before the plan starts" message; the dialog refuses 0 and
  a month before the start; Remove clears the saved goal. 375 px: no sideways scroll.
- **Known gaps:** the goal shown in the card is always nominal (only the "inflation adjusted" row converts it); the
  chart's goal line has no keyboard or screen reader equivalent beyond the card (it is decorative, `aria-hidden`).

### Milestone 10A: the interface text in one typed file (branch `feature/m10a-strings`)
- **Built:**
  - `src/ui/i18n/en.ts`: every text in `src/ui` (about 180 strings and functions), grouped by area (`common`, `units`,
    `status`, `kinds`, `app`, `theme`, `plan` and `planCard`, `startOver`, `sharedPlan`, `share`, `eventTypes`, `events`,
    `dialogs`, `metrics`, `hero`, `chart`, `list`, `goalCard`, `goalDeposit`, `inputErrors`, `compare`, `errorState`).
    Texts with parts to fill in are functions; amounts and dates are formatted by the caller.
  - `messages.ts`: `Messages` is derived from `en` (a `Widen` type keeps the shape and the parameter lists and widens
    the literals), so there is one list of texts to maintain. `index.ts` exports `messages` and is the one place that
    picks the language. Another language later is a file typed `Messages`.
  - Every file in `src/ui` reads its text from `messages`; `main.ts` takes the scenario names from it. The export is
    called `messages` because `text` is a common local name (a lambda parameter shadowed it in four files).
  - `AmountEventKind` got `titles` ("Add withdrawal", "Edit one-time deposit") instead of building the titles by
    lowercasing a name, which would not work in other languages. Money suffixes ("kr", "/mo", "yrs", "KR/MO") are texts too.
- **Left for 10B and later:** `formatYearMonth` (English month names in the core), the validators' English error
  messages, the notices built in `main.ts` and `state/` (storage blocked, bad link, unreadable save), number and date
  locales in `format.ts` (`sv-SE` thousands separator, English compact form), the "kr" suffix the parser accepts, and the
  developer-only design-system page.
- **Checked:** a baseline of all visible text, labels, hover texts, placeholders, value texts and error messages in 49
  states of the app was captured before the change (example plan, inflation on, the three event dialogs and their
  errors, a plan with every kind of event, selected event, edit dialog, events before the start and after the horizon,
  goal prompt, dialog, errors and four goal states, 14 field errors in the Plan card, start-over, share and copy
  results, blocked storage, shared plan, keep dialog, four bad links, chart keys, the metrics, start over, blank plan and
  empty states) and compared with the same run after the change: **0 differences in 49 states**. 494 tests (5 new:
  no empty text, parts are put into the text, an incomplete or wrongly shaped translation is a type error, a complete
  one is accepted), typecheck and build.
- **Known gaps:** the typing guarantees the shape of a translation but not that it is a good one; texts in `src/state`
  and `src/main.ts` notices are still English literals (10B).

### Rebrand: "Life Ledger", a long-term financial planner (branch `feature/rebrand-life-ledger`)
- **Why:** "Savings calc" undersold a tool that already plans withdrawals, deposit changes, one-time deposits, goals
  and inflation, and the green tile with a white dot was generic.
- **Built:**
  - `src/ui/logo.ts`: `renderLogo()`, an SVG made with `s()`: rising ledger bars on the green tile, one bar cut
    down to a stub in the withdrawal colour and the next one restarting lower (the later cost of one decision).
    Decorative (`aria-hidden`); the wordmark carries the name. It replaces `.brand__mark` in the app bar, and the
    design-system page shows it at 16–48 px.
  - Token `--logo-gap` (the withdrawal colour in Linen, lightened to `#c08a7e` in Dusk, where `--elevated` was too
    dark on the green tile). Classes `.brand__logo`, `.logo__tile`, `.logo__bar`, `.logo__gap`.
  - `public/favicon.svg` with the same shape and a `prefers-color-scheme` block for dark browser chrome.
  - `index.html`: the title "Life Ledger: long-term financial planner", a broader description, `og:title`,
    `og:description` and `og:type`, `theme-color` for light and dark, the icon link (Vite adds the base path).
  - Texts: wordmark "Life" + " Ledger" (bold + muted, as before). No other interface text changed.
- **Decisions:**
  - The name was picked by the user from several rounds: brand-like names were declined, plain descriptive ones were
    too dull.
  - The logo was picked from a concept sheet with three directions (notch, LL monogram, ledger bars), three variants
    each, in both themes at 16–48 px.
  - Visible brand only: the repo, the Pages URL, Vite `base`, `package.json` and the storage keys
    (`advanced-savings-calculator:plan` / `:theme`) keep the old name, so saved plans and share links keep working.
  - No tagline.
  - The favicon, `theme-color` and Open Graph text are pulled forward from milestone 12 ("page basics"). An Open
    Graph image is still left out.
- **Checked:**
  - Typecheck, build and 494 tests pass. `dist/index.html` links `/advanced-savings-calculator/favicon.svg`, and the
    file is served as `image/svg+xml`.
  - Browser: the app bar in Linen and Dusk, the computed fills of the tile and the stub in each theme, 375 px with no
    horizontal scroll, `document.title`, and 5 new metas. The mark has no accessible name, and the brand reads
    "Life Ledger".
  - Text changes: only the wordmark (`git diff src/ui/i18n/en.ts`). The 49-state comparison
    from 10A was not rerun.

### Milestone 10B: notices and month names out of the core and state (branch `feature/m10b-strings`)
- **Built:**
  - `src/state/plan-problem.ts`: `PlanProblem` (a code and the parts to fill in: `amount`, `date`, `percent`,
    `horizon`, `label`, `too-many`, `end-before-start`, `newer-version`, `damaged` and four link codes), `PlanError`
    (a `RangeError` that carries one), `failWith` and `problemOf`.
  - `validate-plan.ts`, `event-list.ts`, `read-plan.ts` and `share-link.ts` now throw `PlanError`. Their English
    messages stay, for developers and the existing tests.
  - `AppState.notice` is a `Notice` (`change-rejected`, `saved-plan-unreadable`, `link-unreadable` with a problem, and
    `storage-blocked`), set by `withPlanChange`, `resolveStartupPlan` and the link handler in `main.ts`.
    `LoadResult.invalid` carries a problem instead of a reason.
  - `src/ui/notice-text.ts`: `noticeText` and `problemText`, with words from `messages.notices` and
    `messages.problems`, formatting amounts with `formatMoney`.
  - `formatYearMonth` moved from `core/year-month.ts` to `ui/format.ts`, on `Intl.DateTimeFormat` in UTC with the
    locale `messages.locale.dates` ("en"). The core's month names are gone.
- **Decisions:**
  - Shape errors in saved or shared data (a field of the wrong type, an unknown version, broken ids, not JSON) are one
    code, `damaged` ("It is damaged"). The detail is for developers, not something the user can act on.
  - Per-kind texts for labels and full lists are whole sentences, not a sentence with a kind name filled in, so a
    language with grammatical gender can word each one.
- **Visible change (intended):** notices from checks now read in kronor. For example, "Start amount must be a whole
  number of öre from 0 to 10000000000, got -5" became "Start amount must be from 0 kr to 100 000 000 kr", and
  shape errors read "It is damaged". Seven link messages became four: "characters that don't belong in it" and "damaged"
  now read "The link is damaged or cut off", and "too long to be a plan" reads "The link holds too large a plan". The frames around them ("That link could not be opened. …") and every
  month name ("Nov 2031") are unchanged.
- **Checked:**
  - 508 tests (15 new): problem codes from every kind of check, including links, a newer version and a missing event;
    words for every problem code; amounts in kronor; the notice frames; and all twelve month names plus the years at
    the limits. Typecheck and build pass.
  - Browser: a bad link (`#plan=x.abc`) shows and announces "That link could not be opened. This is not a plan link.
    Your own plan is shown instead.", and the hash is cleared. A broken save (start amount −5) shows the kronor
    message. Month names in the list and the chart badges are unchanged. No console errors.
  - The 49-state comparison from 10A was not rerun (its script was not kept). Blocked storage was checked by unit tests
    only.
- **Left:** number formats per language (milestone 12) and the example plan's "New car" label.

### A name for the plan (branch `feature/plan-name`)
- **Why:** the hero line said "Example plan", "My plan" or "Shared plan", chosen from where the plan came from. A
  person who shares a plan wants to refer to it by name, and milestone 11 needs names for its tabs and table.
- **Built:**
  - `PlanDocument` version 4 with `name: string | null`; `PLAN_LIMITS.maxNameLength` 40. Versions 1–3 are upgraded
    with no name in `readPlanDocument`; a version 4 plan must have the field (text or null).
  - `src/state/plan-text.ts` (`cleanText`) and `plan-name.ts` (`renamePlan`, which turns empty text into no name and
    keeps the same plan object when nothing changes). `validatePlanName` and a new problem code `plan-name`.
  - Event labels now go through `cleanText` too, in the three event modules and the three readers (the review finding
    about control characters). Cleaning rather than rejecting keeps an old save with a pasted tab openable.
  - `ScenarioView.planName`. `main.ts` shows `plan.name ?? messages.planCard.names[origin]` as the scenario name, so
    the hero line reads "House 2031 · How your savings grow, …" and the rest of it is unchanged.
  - The Plan card's title is a button (pencil icon, `.card__title`, `data-key="plan-rename"`) inside its `<h2>`, reading "Plan" or the plan's name (long names wrap). It
    opens `openRenameDialog` (`src/ui/rename-dialog.ts`, built on `openFormDialog`), which calls the new action
    `renamePlan`. `parsePlanName` checks the length while typing. A first version had a "Name" field in the card; the
    user preferred tapping the title, so the field and its `wide` option were removed.
  - The page title is "House 2031 · Life Ledger" (`document.title`, set in `renderApp`), and the share dialog is
    named `Share "House 2031"`.
- **Decisions:**
  - A shared plan shows the name that came in the link, while the banner and the Plan card status still say it is a
    shared copy that is not saved.
  - Naming the example makes it the user's own plan and saves it, as every plan change does.
- **Checked:**
  - 532 tests (24 new): reading versions 1–3 and 4 with names, cleaning and limits, `renamePlan`, renaming through
    `withPlanChange` (example, shared, unchanged, too long), labels with control characters, `parsePlanName`, the
    problem code and its words, `planName` in the view, and a named plan through a link. The pinned reference values
    did not move. Typecheck and build pass.
  - Browser: clicking the title opens the prompt with the name selected; Enter saves and the hero line, the tab title
    and the share dialog title change, and the plan saves (version 4) and survives a reload. Escape changes nothing,
    and focus returns to the title button. 41 characters keep the dialog open with the field error, and saving empty
    text falls back to "My plan" and the fixed title. A share link shows the link's name and not the saved one, with
    the banner; renaming a shared plan changes it only in memory and leaves the saved plan alone. "Back to my plan"
    returns the saved name. A hand-written version 3 save opens with no name and no notice. At 375 px the title row (also with a 40-character name, which wraps)
    doesn't scroll sideways. No console errors.

### Milestone 11A: several plans (branch `feature/m11-compare-plans`)
- **Why:** the target is comparing plans (different deposits, returns, withdrawals) side by side. 11A is the model and the
  tabs; 11B is the comparison. Decided with the user: split in two PRs, at most 5 plans, and a separate Compare card in 11B.
- **Built:**
  - `AppState` no longer has `plan`, `planOrigin` and `scenarioId`. It extends `PlanSet`: `plans: PlanEntry[]`
    (`{ id, plan, origin }`), `activeId` and `returnId`. `src/state/workspace.ts` holds the pure changes (`activeEntry`,
    `selectPlan`, `addPlan`, `updateActivePlan`, `deletePlan`, `openSharedPlan`, `keepSharedPlan`, `leaveSharedPlan`) and
    `withPlanSetChange`; `withPlanChange` now changes the open plan. New `PLAN_LIMITS.maxPlans` 5 and problem code
    `too-many-plans`.
  - Saving: `src/state/read-workspace.ts` (`{ version: 1, activeId, plans: [{ id, plan }] }`, read with the same checks for
    every plan, ids checked, at most 5) and `plan-storage.ts` (`loadSavedPlans`, `savePlans`, `clearSavedPlans`) under the
    key `advanced-savings-calculator:plans`. A plan saved under the old key (or `asc-plan`) is read as a set of one; the
    next save writes the new key and removes the old ones. A shared plan is never saved.
  - `createScenarioViewCache` remembers each plan's view by id (11B needs one view per plan); `buildScenarioView` takes an id.
  - UI: plan tabs in the app bar (always shown, with "+"), `add-plan-dialog.ts` (copy or empty), `delete-plan-dialog.ts`, a
    "Delete plan" button in the Plan card (only with two or more plans), a "Try without" action on each event row
    (`planWithoutEvent` in `plan-variants.ts`), and the shared banner with "Keep as a new plan" (no confirmation any more,
    since nothing is replaced) and "Back to my plans". `fitPlanName` cuts generated names to 40 characters.
  - Removed the old end-balance bars card (`renderComparisonCard`), which could never show with one plan; 11B replaces it.
- **Decisions:**
  - Changing the set of plans (add, copy, delete) makes the untouched example the user's own, so it is saved with the others.
  - A copy of the unnamed example is called "My plan (copy)", since the example is "My plan" from then on.
  - Names are stored: new plans are "Plan 2" (the first unused number), copies "<name> (copy)", and "Try without" copies
    "<name> without <event>".
  - Opening a link adds an extra tab that doesn't count toward the limit, so "Keep as a new plan" is disabled (with a
    hover text) when the five slots are full.
  - Start over deletes every saved plan, and its text says so.
- **Checked:**
  - 574 tests (42 new): the plan set (add, limits, example adoption, delete and its neighbour, shared plans, refused changes),
    the saved set (round trip, bad ids and shapes, too many, newer format, a shared plan left out), storage (old keys read
    as a set of one, both removed on save), planWithoutEvent, fitPlanName, per-id view cache, notice words. Pinned reference
    values did not move. Typecheck and build pass.
  - Browser: copy, edit one copy and switch back (the other is unchanged), "Try without" (a third tab named "My plan
    without New car"), delete (moves to the neighbour, confirmation names the plan), reload (all tabs and the open one
    survive), a share link (extra tab, banner, "Back to my plans" returns, "Keep as a new plan" adds it and clears the
    hash), five plans (the "+" and "Keep" disabled with their hover text), a hand-written old single-plan save (opens as
    one plan, no notice, new key written and old key removed on the next change), 375 px without sideways scroll (the tab
    row scrolls inside itself). No console errors.
- **Known gaps:** two plans can have the same name (the tab shows both); the example's own name stays "Example plan" until
  it is changed; blocked storage with several plans is covered by the existing unit tests only.

### Milestone 11B: compare plans (branch `feature/m11b-compare`)
- **Built:**
  - `src/state/comparison.ts`: `buildComparison(views, openId, metric)` gives a `ComparisonLine` per plan (its values from the
    start month through the horizon, for the metric), a `ComparisonRow` per plan (end balance, deposited, growth, withdrawn, the
    end month, and the balance difference to the open plan), and the calendar span of the chart. `monthIndex` and
    `yearMonthOf` put months of different plans on one axis; `valueAtMonth` reads a line at a month.
  - `src/ui/compare-card.ts`: the Compare card, shown after the chart card with two or more plans. A chart reusing the
    main chart's geometry and classes (`calendarPoints` in `chart-geometry.ts` places lines by calendar month), a slider
    role with arrow, Page and Home/End keys, a light tooltip with every plan's value, a legend, and a table
    (`<table>` in a horizontal scroller) whose plan names select the plan. The open plan is thicker and its row highlighted.
  - `main.ts` builds a view for every plan (cached per id) when there is more than one, with the inflation switch applied
    to each plan's own rate. Tokens `--compare-1`…`--compare-6` (light and dark); the old `.compare*` styles are replaced.
- **Decisions:**
  - The lines follow the chart's metric (the KPI tiles), and the table always shows all four figures.
  - Plans with different starts and horizons share a calendar axis and are compared at the end of their own horizon, so the
    table has an "Ends" column. The difference column is the balance difference at those ends.
  - The shared plan is compared too (it is a tab), and the last of six colours is for it.
  - The card's cursor is local to the card: it is not kept in the store, and rests at the end after a redraw.
- **Checked:**
  - 585 tests (11 new): months on one axis, lines and rows for the metric, the difference measured from the open plan
    (and from another plan when it is open), plans with different starts and horizons, inflation adjusted views,
    empty plans, `valueAtMonth` before and after a line, and `calendarPoints`. Typecheck and build pass; pinned reference
    values did not move.
  - Browser: no card with one plan; three plans give three lines (the open one thicker), the legend, and the rows (the
    figures match each plan on its own, e.g. the doubled deposit ends at 6 583 214 kr, +3 508 358 kr); the slider's value text
    names every plan and moves with Home; clicking a plan name opens it and the differences are measured from it, with focus
    kept; the inflation switch divides every plan by its own price level (3 074 856 to 1 697 538 kr at 2 % over 30 years) and
    the meta line says so; deleting down to one plan hides the card; dark theme and 375 px (the table scrolls inside its card,
    not the page). No console errors.
- **Known gaps:** line colours are the only way to tell lines apart on the chart (the legend, the tooltip and the table name
  them); the card has no keyboard shortcut for selecting a plan from the chart (the table does); a Swedish number format
  comes with milestone 12.

### Milestone 12A: Swedish (branch `feature/m12a-swedish`)
- **Why:** milestone 10 moved every text into one typed file so a second language would be a file, not a rewrite. Decided with the
  user: split milestone 12 into 12A Swedish, 12B privacy and page basics, 12C accessibility, 12D export; open in the browser's
  language, with a switch.
- **Built:**
  - `src/ui/i18n/sv.ts`: every text in Swedish, typed `Messages` (a missing or wrongly shaped text is a compile error). Natural
    Swedish for a consumer UI ("Saldo", "Uttag", "Engångsinsättning", "Sparmål", "Månadssparande", "Inflationsjusterat").
  - `src/state/language.ts`: `Language`, `chooseLanguage(preference, browserLanguages)` (pure; "sv-SE" counts as Swedish), and the
    saved choice under `advanced-savings-calculator:language`. `i18n/index.ts` decides the language once at load and exports
    `language` and `messages`, so `messages` stays a plain constant. The switch (`renderLanguageButton`, action `setLanguage`) saves the
    choice and reloads. `ui/language.ts` sets `<html lang>`.
  - `messages.locale` now has `numbers`, `decimals`, `compact` and `dates`; `createFormatters` in `format.ts` builds the formatters from
    them (also `formatPercent`, used for the return and inflation fields: "6.5" / "6,5"). Texts with a decimal number use a `num` helper in
    Swedish. `messages.example.carLabel` gives the example plan's label (`createExamplePlan(today, carLabel)`).
  - English text change: "Your saved plan could not be read …" now says "saved plans" (there can be several).
  - Layout (found with Swedish at 375 px): the brand name no longer wraps next to the new button, and on a phone the event row's
    actions (Edit, Try without, Remove) have their own row, which also helps English.
- **Decisions:**
  - Switching reloads the page. The alternative, redrawing without a reload, needs `messages` to become changeable state and every
    text computed at start-up (chart labels, month names) to be reworked.
  - Whole amounts keep the Swedish grouping in English too ("1 716 093 kr"), since the currency decides it. Compact amounts use
    `Intl`: "1.7M kr" in English, "1,7 mn kr" in Swedish (and "150 tn kr" for 150 thousand: the standard Swedish abbreviation is
    "tn", though "tkr" is common in finance).
  - The static title and meta tags in `index.html` stay English; plan data written in one language stays in it.
- **Checked:**
  - 600 tests (15 new): the language choice (the user's choice first, the browser's list in order, case and region, English fallback,
    a blocked store), every Swedish text non-empty, and none left as the English one except the 18 that are the same (listed), Swedish
    parts and decimals, formatting in Swedish (months "apr. 2031", "mars", "juni", compact "1,7 mn kr", "+542,7 tn kr", "6,5"), English
    percent "6.5". Typecheck and build pass; pinned reference values did not move.
  - Browser: the browser's list (`en-US`, `sv-SE`) opens English; the switch saves `sv` and reloads in Swedish (`<html lang="sv">`,
    page title, hero line, KPI tiles "2,8 mn kr", months "nov. 2031", the return field "6,5", the goal and event dialogs, the
    input error, a bad-link notice and its announcement); switching back gives English ("6.5", "2.8M kr"). At 375 px in Swedish the
    page doesn't scroll sideways, the brand stays on one line and the event row's actions are on their own row. No console errors.
- **Known gaps:** the Swedish was written by Claude and still needs a native read-through; "tn" for thousand; the month input's own
  picker follows the browser's language, not the app's; the share-link preview (Open Graph) is English.
- **Follow-up:** the open plan's row in the Compare table was highlighted with the blue `--sel-row`, which the user disliked. It now
  uses the warm neutral `--fill` (a sunken look, like a pressed control) in both themes, and the "Open plan" marker is `--ink2`
  instead of `--muted` so it reads on that fill. The event list's selected row still uses `--sel-row`.

### Milestone 12B: privacy and page basics (branch `feature/m12b-privacy`)
- **Why:** the fonts came from Google Fonts, so every visitor's IP address went to Google, which contradicts "no tracking". Decided with
  the user: download the font files into the repo (no new dependency) and add the Content-Security-Policy in the production build only.
- **Built:**
  - `public/fonts/geist-latin.woff2` (29 KB) and `geist-mono-latin.woff2` (23 KB), the Latin subset of the variable fonts, downloaded
    once from Google's font server with the user's OK, plus `OFL.txt` (the SIL Open Font License and the copyright line as Google Fonts
    lists it; worth checking against the upstream repository). `src/styles/fonts.css` has the `@font-face` rules (weights 400-700 and
    400-500, `font-display: swap`, the Latin `unicode-range`), imported first in `main.ts`. `index.html` preloads both files; the Google
    `preconnect` and stylesheet links are gone. The Latin subset holds English and Swedish letters, the minus sign and the dashes; other
    characters (the share arrow) fall back to the system font, as before.
  - `vite.config.ts`: a small plugin (build only) adds `<meta http-equiv="Content-Security-Policy">` first in `<head>`:
    `default-src 'self'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self'; font-src 'self';
    connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'`. Inline style attributes are allowed because the page sets
    some from code (badge positions, bar widths). The base path and deploy target are unchanged.
  - Page basics: `public/og-image.png` (1200 x 630: the logo, "Life Ledger", "Long-term financial planner" and the description line,
    drawn with the real fonts), `og:url`, `og:image` (the full address, as previews need), its size and alt text, `twitter:card`
    `summary_large_image`, and a `<noscript>` message in English and Swedish styled with tokens (`.noscript`).
  - `architecture.test.ts`: no `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `EventSource` or `new Image(` in the code, and
    `index.html` and the stylesheets mention no host other than `jbarte.github.io`.
- **Decisions:**
  - The policy is a meta tag because GitHub Pages can't send headers, so it can't carry `frame-ancestors`.
  - It is added at build time only, so Vite's dev server (a websocket and inline scripts) isn't blocked.
  - `style-src-attr` needs a browser from about 2022 or later; in an older one the inline styles would be blocked and the chart
    positions would break. Accepted.
  - The preview image is English only, like the rest of the static page.
- **Checked:**
  - 601 tests (1 new, the privacy rule). Typecheck and build pass; the built page has the policy first in `<head>`, and the CSS points
    at `/advanced-savings-calculator/fonts/...`.
  - Browser, on the production build (`vite preview`): both font families load (`Geist 400-700`, `Geist Mono 400-500`), no resource comes
    from another origin, the policy is in the page, and there are no console errors, so no policy violation. The chart badge, marker and
    effect bar get their positions and widths from inline style attributes under the policy, the Compare card draws, and plans can be
    added. In the dev server the fonts load from the site, there is no policy and no external request.
  - The link-preview image was made in the browser with the real fonts (canvas, saved through a throwaway local server in the scratchpad).
- **Known gaps:** the `<noscript>` message was only checked in the built HTML and its CSS, not with JavaScript turned off; font-display
  `swap` can flash the fallback font on a slow connection (the polish ideas include font loading); the policy can't be tested for old
  browsers; the share-link preview shows English only.

### Milestone 12C: accessibility (branch `feature/m12c-accessibility`)
- **Why:** the review found small text under the 4.5 : 1 contrast WCAG asks for, motion that ignored the reduced-motion setting,
  explanations that only existed as hover text on disabled buttons, and no way to read the chart's figures without seeing it.
- **Built:**
  - **Contrast** (`tokens.css`, measured with a script first, then pinned by `src/styles/contrast.test.ts`). Light theme: `--muted`
    3.1-3.4 to 4.6-5.3 (`#877f75` to `#68615a`); `--danger` 3.5-4.1 to 4.6-5.3 (`#c0503f` to `#a84030`); `--solid` `#5f7f6a` to
    `#587864` (white text 4.44 to 4.90; hover `#5c7c67`, pressed `#4a6753`); `--on-solid-muted` 3.7 to 4.6 (`#fbf6f4`); `--focus` 2.45
    to 3.74 on the card (`#3f7cc0`); the withdrawal colour is the deeper rose (`--elevated-deep`) so the white number on its badge
    goes from 3.8 to 4.9. Dark theme: `--solid` `#5f8a6c` to `#55805f` (white 3.93 to 4.53), `--on-solid-muted` 3.1 to 4.5 (white),
    and a new `--kind-withdrawal` `#966a5f` (lines on the dark card 2.85 to 3.20, badge text 4.64), which the new test found was
    under 3 : 1 before.
  - **Reduced motion:** one rule turns every transition off (it listed only five classes before).
  - **Disabled controls:** the reason is read out with the control (`aria-describedby` and a visually hidden text, `renderHiddenHint`)
    for the plan "+" and "Try without", and shown as text for "Add event" (full plan) and "Keep as a new plan" (no room).
  - **Keyboard and targets:** the two tables' scrolling areas have `tabindex="0"`, `role="region"` and a name; inputs fill their field
    (the click target went from 21 to 42 px high); the chart's event badges are 24 px (were 22).
  - **The chart as a table:** `src/ui/year-table.ts`, a native `<details>` under the chart with one row a year (the start month and
    every month 12 later) for balance, deposited, growth and withdrawn, inflation adjusted when the switch is on, in a scroll area of
    at most 22 rem with a sticky header. Open or closed is `AppState.yearTableOpen` (a view setting: not saved, closed at each visit)
    so it survives redraws, and focus stays on its toggle. Texts in English and Swedish.
- **Decisions:**
  - Muted text is darker, which the user may notice (secondary text, unit labels, the table headers). The values are the lightest
    that pass 4.5 : 1 on the sunken field background; the look otherwise stays.
  - The vitest config now returns real CSS for stylesheet imports (`test.css.include`), because Vitest turns every CSS import, even
    `?raw`, into an empty string. This also showed that the stylesheet check added in 12B had been checking empty text: it now
    asserts that the stylesheets were read.
  - No `@types/node` or other dependency was added; the contrast test reads the tokens through a `?raw` import.
- **Checked:**
  - 660 tests (59 new: the contrast pairs in both themes, one test that the tokens were read). Typecheck and build pass; pinned
    reference values did not move.
  - Browser: the table opens and closes with Enter and keeps focus on its toggle, has 31 rows for 30 years and matches the tile (the
    last row 3 074 856 kr), stays open after a change, and updates (4 244 308 kr after raising the deposit); with five plans the "+"
    and "Try without" are disabled and both carry the reason in `aria-describedby`; both scrolling tables are focusable regions; an
    audit script found no unnamed control, duplicate id or missing `aria-*` target, one `nav`, `header` and `main`, and decorative SVGs
    hidden. Remaining under-24 px items: the hero heading (focus target only). No console errors.
- **Known gaps:**
  - The Start month field "jump" was not reproduced: the browser pane can't type into a native month input, so the cause (a redraw
    after each valid year while typing) is a guess. The month input is untested in Firefox and Safari.
  - Reduced motion was checked in the CSS, not with the setting turned on.
  - Dark-theme screenshots were not taken (the pane's colour scheme emulation does not switch the app's theme), so the dark colours
    are checked by the contrast numbers only.
  - A screen-reader pass (VoiceOver or NVDA) has not been done; the checks are structural.

### Milestone 12D: export, printing and the README (branch `feature/m12d-export`)
- **Decided with the user:** the JSON export is the open plan, and opening a file adds it as a new plan (nothing is replaced); the
  commands live behind a "File" button in the Plan card.
- **Built:**
  - `src/state/plan-file.ts`: `planFileText` (the plan document as indented JSON, the same content as a share link) and
    `readPlanFile` (at most 200 000 characters, problem code `file-too-large`, then `readPlanText` with every check a link gets).
    Notice kinds `file-unreadable` (with a problem) and `download-failed`.
  - `src/ui/file-dialog.ts`: "Plan file" with three choices, like the add-plan dialog: download this plan
    (`life-ledger-<name>.json`), download the yearly figures (`.csv`), open a plan file. `src/ui/download.ts`: a download from a
    Blob in memory, and a file picker that reads the file in memory and refuses one over four times the text limit before reading.
    Actions `planFile`, `importPlanFile`, `reportDownloadFailed`. The "File" button shows for every plan, also a shared one.
  - `src/ui/csv.ts`: `figuresCsv` (a byte-order mark for Excel, a header row from the language's texts, `YYYY-MM` months, whole
    kronor with no grouping, quoting where needed; the separator is `messages.locale.csvSeparator`, a comma in English and a
    semicolon in Swedish, where the comma is the decimal sign) and `fileBaseName` (accents dropped, anything else a dash, at most 60
    characters, "plan" when nothing is left). The rows are `yearlyPoints` (`view-helpers.ts`), shared with the yearly table, so the
    CSV is the table: inflation adjusted when the switch is on.
  - Printing: `src/ui/print.ts` switches to the light theme and opens closed tables on `beforeprint` and puts them back on
    `afterprint`, with `data-printing` on `<html>` so the yearly table doesn't record the opening as the user's. `@media print` hides
    the app bar's controls, buttons, notices, the horizon and inflation controls, the chart cursor and tooltip and the row actions,
    drops the fills (paper is the background), and lets cards break across pages while charts, legends and rows don't.
  - `docs/screenshot.png` (headless Chrome, 1280 px wide at 2x, the example plan) in the README, the README's status and feature list
    updated.
  - Found on the way: on a 375 px phone the English "Share" button pushed the brand name out of view. Below 420 px the Share button
    shows only its arrow; its name stays in `aria-label`.
- **Checked:**
  - 672 tests (12 new: plan files round-trip, older files, damaged, bad values, newer, too large; CSV rows, separators, rounding,
    quoting, file names). Typecheck and build pass; pinned reference values did not move.
  - Browser (dev server): the dialog and its three choices; the plan file (`life-ledger-example-plan.json`, indented JSON) and the CSV
    (`…csv`, starting with the UTF-8 byte-order mark EF BB BF, "Month,Balance,…", "2026-11,50000,50000,0,0"); opening a plan file
    (answered with a made-up file) adds "Imported house" as a new, saved, open plan; a file that is not a plan and one that is too
    large give the notice and change nothing; printing switches to light, opens the table and restores theme and table after.
  - A printout made with headless Chrome (`--print-to-pdf`): the controls are gone, the yearly table is open and runs over to the next
    pages with its header repeated, the plan card, goal, events and the disclaimer follow, no fills. 375 px: no sideways scroll, the
    brand fits.
- **Known gaps:** the file picker and the browser's own download were exercised with stand-ins (a made-up file, a captured Blob), not
  with the operating system's dialogs; printing was checked in Chrome only.

### The plan's own horizon (branch `feature/plan-horizon`)
- **Found:** the 10 / 20 / 30 yrs buttons called `updatePlan({ horizonYears })`, so they changed the plan itself (saved and shared,
  and they made the example the user's own). A 25-year plan became a 10-year plan the moment a button was pressed, and only the End
  year field could bring the 25 back. The view model could already show any horizon (`buildScenarioView` takes the horizon in months).
- **Decided with the user:** the buttons become a view zoom with the plan's own horizon as the default; the first button reads
  "Plan · 25 yrs" ("Plan · 25 år"), and the preset that equals the plan's horizon is left out.
- **Built:**
  - `AppState.viewHorizonYears` (null = the plan's own) and the action `setViewHorizon`. Not saved or shared; reset to null when
    another plan opens (`withPlanSetChange`, a shared plan opened or left, Start from scratch) and when the plan's End year changes
    (`updatePlan` with `horizonYears`).
  - `src/ui/horizon-options.ts`: `horizonOptions(planYears)`, the plan's own first, then the presets that differ from it.
  - The open plan's view is built over `viewHorizonYears ?? plan.horizonYears`; the Compare card builds every plan over its own.
    `createScenarioViewCache` now keys by plan id and horizon, so a zoomed open plan and its Compare line don't evict each other.
  - The Plan card's End year field and its "N YRS" unit show the plan's own horizon even while zoomed.
  - Texts `hero.planHorizon` in English and Swedish.
- **What a zoom changes:** everything shown for the open plan follows the zoom: the chart and its years, the headline, the tiles, the
  effect of each event and the total, which events count as after the end, the goal line and its "after the end year" note, the
  yearly table and the CSV. The plan, the share link, the plan file and the Compare card don't.
- **Checked:**
  - 677 tests (5 new: `horizonOptions` with a horizon between, equal to and at the ends of the presets; the view cache keeps two
    horizons for one plan; switching plans resets the zoom). Typecheck and build pass; pinned reference values did not move.
  - Browser: the example opens with [Plan · 30 yrs] [10 yrs] [20 yrs]; an End year of 2051 gives [Plan · 25 yrs] [10] [20] [30];
    10 yrs shows "Balance by Nov 2036", the chart 2026–2036 and "Effect by Nov 2036", while the saved plan keeps 25 years and the End
    year field keeps 2051 (25 YRS); "Plan · 25 yrs" goes back to Nov 2051; changing the End year to 2061 while zoomed selects
    "Plan · 35 yrs"; adding a plan resets the zoom; the Compare card shows each plan's own end. No console errors.

### Sliders with a live preview (branch `feature/sliders`)
- **Investigation (sliders and transitions together):** measured the engine at 0.13 ms for the example plan, 1.1 ms with a goal and
  39 ms for the largest allowed plan (110 events, 40 years), and a full redraw of the page (about 380 elements) at 3–4 ms. Speed was
  not the problem. The problem was that every change replaces the whole page: a slider would be replaced under the pointer while
  dragged, and lines and numbers jump. Two ways: a live preview that redraws only the results (keeps the architecture), or patching
  the page in place (a small DOM morph; bigger, every handler and the focus handling change). Decided with the user: the live preview,
  sliders for the start amount, the monthly deposit and the expected return, and as transitions the chart glide, dialog fade and plan
  cross-fade (next PR).
- **Built:**
  - `src/ui/plan-slider.ts`: `withPlanSlider` puts a range input under a Plan card field. On `input` it moves the field's text along,
    updates its spoken value (`aria-valuetext`, e.g. "9 000 kr per month") and calls the preview; on `change` (letting go, or each key
    press) it commits with `updatePlan`. `SLIDER_RANGES`: start amount 0–2 000 000 kr by 10 000, monthly deposit 0–30 000 kr by 500,
    return 0–12 % by 0.5. A plan value outside a slider's range puts its thumb at the end; the typed field keeps the whole range.
  - `renderApp` keeps the hero and chart card it drew and hands the Plan card a `livePreview` that redraws just those two, at most
    once a frame with the latest value. `previewOf` in `main.ts` builds the open plan with the changed field (checked with
    `updatePlanFields`; a refused value is simply not drawn) over the shown horizon, inflation adjusted when that is on. Nothing reaches
    the store until the slider is let go.
  - Texts `planCard.sliders` in English and Swedish. The slider uses the design system's slider style.
- **Checked:**
  - 679 tests (2 new: every value a slider can give is within `PLAN_LIMITS`, lands on whole kronor and includes the range's end).
    Typecheck and build pass; pinned reference values did not move.
  - Browser: dragging the monthly deposit to 4 000, 6 000 and 9 000 kr redraws the headline (10 091 571 kr) and the chart's end value
    while the slider element stays the same, the field reads "9 000", and nothing is saved; letting go saves 9 000 kr and the event
    effects update. An arrow key on the return slider moves it to 7.5 %, saves, and keeps focus on the slider. No console errors.
- **Known gaps:** dragging was simulated with input events, not a real pointer; the Compare card, goal card and event list update only
  when the slider is let go.

### A collapsible Compare card, and sliders for every Plan field (branch `feature/collapsible-cards`)
- **Asked for:** being able to collapse parts of the page one isn't interested in. Built for the Compare card, the Plan card and then
  the Savings goal card; the user then chose to keep it for the Compare card only, and the other two were taken out again.
- **Built:**
  - `src/state/collapsed.ts`: `COLLAPSIBLE` (`compare`), `readCollapsed` (saved text to a list; unknown ids, broken text or something
    that is not a list give nothing collapsed), `toggleCollapsed`, and `loadCollapsed` / `saveCollapsed` under
    `advanced-savings-calculator:collapsed` (removed when nothing is collapsed). `AppState.collapsed`, action `toggleSection`. Kept as a
    list so another card can be added with one word.
  - `renderCollapseToggle` (`components.ts`): a chevron button with `aria-expanded`, `aria-controls` and a name that says which way it
    goes ("Collapse Compare plans"; Swedish "Fäll ihop" / "Fäll ut"). The chevron turns when collapsed.
  - The Compare card keeps its header and puts its chart, legend and table in a `.card__body` (laid out like the card) with `hidden`
    when collapsed. A global `[hidden] { display: none !important }`, since a component's own `display` otherwise shows a hidden body.
- **Checked:**
  - 684 tests (5 new for `collapsed.ts`, minus the ones for the cards taken out). Typecheck and build pass; pinned reference values did
    not move.
  - Browser: collapsing the Compare card hides its body and saves `["compare"]`; it stays collapsed after a reload; Enter on the toggle
    opens and closes it and keeps focus on it; the Plan and goal cards have no toggle. No console errors.
- **Sliders for the other fields (asked for in the same round):** inflation (0–6 % by 0.5), the start year (2000–2060 by one year; the
  start month stays, so the field moves from 2026-11 to 2030-11) and the end year (from one to 40 years after the start, so every stop
  is a valid horizon; spoken as "2060, 30 years"). A preview that moves the end year shows that horizon itself, not a zoom set before
  it. `SLIDER_RANGES` gained `inflation` and `startYear`, checked against `PLAN_LIMITS` in `plan-slider.test.ts`. Browser: the start
  slider at 2030 previews "Balance by Nov 2060" and saves `{ year: 2030, month: 11 }`; the end slider at 2050 previews "Balance by Nov
  2050" and saves 20 years; inflation 3.5 saves and the field reads "3.5". Every field in the Plan card now has a slider, so the rows line
  up. No console errors.
- **Layout jump when toggling "Inflation adjusted" (reported by the user):** measured at a 868 px window: the events table header grew from
  45 to 61 px, because "Effect by Nov 2056 (inflation adjusted)" wraps to two lines, which moved everything below by 16 px (the hero
  subtitle and the other texts also get longer, and wrap at narrower widths). Fixed with `renderSteadyText` (`components.ts`): both
  wordings in one grid cell (`.steady`), the unused one `visibility: hidden` and `aria-hidden`, so the space is the taller one's and
  nothing moves. Used for the hero eyebrow and subtitle, the chart and Compare meta lines, the events total and the Effect column header.
  Browser: the top of every section and the page height are identical with the switch off and on, at 868 px (2 468 px) and 375 px
  (3 210 px), and the shown text is the right one. The cost is that the unused wording's space is always reserved, so a line that
  would fit on one row in the plain wording keeps its height when it is the only one that wraps.

### Smooth transitions (branch `feature/transitions`)
- **Decided with the user:** the chart line and area glide to their new shape, dialogs fade and rise in, and switching plans cross-fades;
  the headline number and tiles do not count up.
- **Built:**
  - `interpolatePath(from, to, t)` in `chart-geometry.ts`: moves every number of a path part of the way, for two paths with the same
    commands and the same number of numbers (what `linePath` and `areaPath` make for the same number of points), else null.
  - `src/ui/chart-glide.ts`: `captureCharts` reads the `d` of every path in every chart SVG before the page is redrawn;
    `glideCharts` puts the old shape in the new elements in the same frame and moves them to the new one over 280 ms (ease out) with
    `requestAnimationFrame`, stopping when the chart is gone. It covers the main chart and the Compare card's lines, and skips a path
    whose point count changed (another horizon), a plan switch, and reduced motion. It is JavaScript rather than a CSS animation because
    the page is redrawn from scratch (a CSS transition would have nothing to start from) and the CSS `d` property is not animatable in
    every browser.
  - A slider's live preview doesn't glide: the preview replaces the hero and chart card directly, and the drag is the motion. On release
    the redraw has the same paths, so nothing moves twice.
  - Dialogs: `.modal[open]` fades in and rises 8 px over 180 ms, and its backdrop fades. Switching plans: the shell carries
    `data-plan`; when it changes, `main` gets `canvas--switched` and fades in from 35 % over 200 ms. That is a fade-in of the new plan,
    not a true cross-fade of old and new (that needs both on screen, or the View Transitions API, which not every browser has).
  - Reduced motion: transitions are off as before, and now every animation is too, except the spinner, which stays slowed down since it
    is how progress is shown.
- **Checked:**
  - 688 tests (4 new for `interpolatePath`: the ends, the middle, an area, mismatched shapes). Typecheck and build pass; pinned reference
    values did not move.
  - Browser: after changing the deposit the chart line's end moves 23.13, 22.74, 25.89, 28.27, 30.03, 31.24, 32.03, 32.46 over about 250 ms
    and settles on 32.72; the Compare card's line glides too; a slider drag doesn't glide and the page is stable; switching plans puts
    `canvas--switched` on the page with the `canvas-in` animation; a dialog has the `modal-in` animation (opacity 0.42 sixty milliseconds in);
    with `prefers-reduced-motion` stubbed on, the change appears at once; changing the horizon (different point count) just redraws. No
    console errors.
- **Known gaps:** the real `prefers-reduced-motion` setting was stubbed in the page, not set in the operating system; the y-axis labels, event
  markers and numbers change at once while the line glides; there is no exit animation for dialogs.

### Polish, part 1: type, touch, focus, tokens and the theme fade (branch `feature/polish-details`)
- **Chosen with the user** from a written list (all four groups, everything in them), to be built as three PRs: this one (type, touch, interaction),
  then the chart details, then undo and empty states.
- **Built:**
  - **Digits and wrapping:** `font-variant-numeric: tabular-nums` on `body` (it was only on the headline), `text-wrap: balance` on headings,
    the subtitle, dialog text, notices and choice hints, and `text-wrap: pretty` on paragraphs.
  - **Fonts without a jump:** "Geist Fallback" (Arial, size-adjust 102.66 %, ascent 97.89 %, descent 28.73 %) and "Geist Mono Fallback"
    (Courier New, 99.98 %, 100.52 %, 29.51 %) in `fonts.css`, from metrics measured with a canvas in Chrome, and put after Geist in the font
    stacks. In the browser the same sample text is 862.1 px wide in Geist and 862.8 in the fallback (840.5 in plain Arial), both 52 px tall (Arial 45);
    the mono sample is 528 px in both.
  - **Brand colour:** `accent-color`, the caret in fields and `::selection` use `--solid`.
  - **Phones:** no tap flash (`-webkit-tap-highlight-color`), `touch-action: manipulation` on pressable elements (not the chart, which keeps
    its own), `viewport-fit=cover` and `env(safe-area-inset-*)` on the app bar and the page edges and bottom.
  - **Focus clear of the sticky bar:** `scroll-padding-top` from `--appbar-clearance` (88 px; 144 px under 860 px, measured bar heights 68 and 124).
    On a phone, focusing a field far down or the headline after scrolling leaves the element below the bar (457 and 152 px against a bar
    bottom of 124).
  - **Tokens and press:** `--duration-fast/base/slow`, `--ease-out` and `--press` (`scale(0.98)`) replace the ad-hoc 120/150/180/200 ms and the
    one-off curve; buttons, tabs, tiles, text buttons, choices and the card toggle share the same press (buttons still sink with
    `--shadow-inner`). `motionAllowed()` in `src/ui/motion.ts` is the one reduced-motion check in script, used by the glide and the theme fade.
  - **Theme fade:** `applyTheme` adds `.theme-fading` for 260 ms when the theme changes after the page opened, so colours, borders, shadows and
    SVG fills blend; not on load, not under reduced motion.
- **Checked:**
  - 688 tests unchanged (the contrast test still passes: only tokens for motion were added). Typecheck and build pass.
  - Browser: the computed styles above; the theme class appears on a change, not at load, and not with reduced motion stubbed on; the focus test at
    375 px.
- **Known gaps:** the safe-area insets can't be seen without a phone with a notch; the press scale was checked as a token and rule, not by pressing;
  the font fallback metrics come from Chrome on macOS (Arial and Courier New exist on Mac and Windows, not on every Linux or Android, where the system
  font is used unadjusted).

### Polish, part 2: chart details (branch `feature/polish-chart`)
- **Chosen with the user:** the line draws in when the page opens, a smoother tooltip, and event badges with an entrance and a selection ring.
- **Built:**
  - **Draw-in:** `.chart__svg--intro` reveals the main chart left to right over 900 ms with a `clip-path` animation (the box is 8 px larger than
    the drawing, so the stroke is not cut). `introduceChart` adds it only on the first drawing of the page (no chart was there before) and
    not under reduced motion. It is a clip, not a stroke-dash draw, because the lines use `vector-effect: non-scaling-stroke`, which breaks
    dash lengths and `pathLength` in some browsers; the clip reveals the area too.
  - **Tooltip:** the tooltip, the dot and the cursor have `left`, `top` and `transform` transitions (`--duration-fast`), so moving between
    months, by pointer or by key, glides instead of snapping; the dot grows to 125 % while the pointer is over the chart. The first position
    is set before the element is in the page, so nothing slides in from the corner.
  - **Badges:** each badge carries `data-event`. `captureBadges` reads which events had a badge before a redraw and `popNewBadges` gives new
    ones `.chart__badge--new` (a 180 ms pop), so a redraw doesn't make the existing badges pop. Not on the first drawing (the reveal covers it)
    or a plan switch. The selected badge is 12 % larger, above its neighbours, with a ring in the focus colour (surface-coloured gap, then
    `--focus`) and a soft glow, also for the outlined one-time-deposit badge.
- **Checked:**
  - 688 tests unchanged. Typecheck and build pass.
  - Browser: on a fresh load the chart svg has the `chart-reveal` animation, its clip-path is mid-reveal early (about 47 % shown) and `none` after 1.3 s;
    tooltip and dot transition left, top and transform; editing a field afterwards doesn't replay the reveal or pop any badge; adding a one-time
    deposit pops only the new badge (`one-time-deposit-1`) with `badge-pop`; selecting a badge gives transform scale 1.12, z-index 1 and the
    ring shadow (screenshot checked); the hover rule for the dot exists. No console errors.
- **Known gaps:** the pointer glide was checked as transitions and computed styles, not by moving a real pointer; the compare chart's tooltip
  glides (it shares the tooltip styles) but has no draw-in; the draw-in is off under reduced motion because the global rule removes animations.

### Polish, part 3: undo instead of "are you sure"

- **What:** removing an event, the goal or a plan shows a toast ("Removed "New car" · Undo", 8 seconds) instead of asking first. The plan
  delete dialog (`delete-plan-dialog.ts`) is gone; "Start over" keeps its confirmation. An empty event list has an "Add your first event" button.
- **How:** the remove actions return an `Undo`; `showUndoToast` (`src/ui/undo-toast.ts`) puts it on one shelf in `<body>` (a new toast replaces
  the old) and announces it. State got `restoreEvent` (by id, next free id if taken), `restoreWithdrawal`/`restoreDepositChange`/
  `restoreOneTimeDeposit` and `restorePlan` (old place, opened again). Undo acts on the plan the removal was made in.
- **Checked:** 691 tests (restoreEvent, restorePlan), typecheck, build. Browser: removing the only event then Undo brings it back; an empty list shows the
  button and it opens "Add event"; deleting a plan shows its toast and Undo restores and opens it.
- **Known gaps:** a toast is lost on reload or after 8 s, so a deleted plan is then gone for good; the goal's empty state already had its button.

### Follow-up: hover lag and a month picker everywhere

- **Chart hover:** the cursor, dot and tooltip glided 120 ms behind the pointer, which felt like lag. They now move at once (no position transition), and `show` skips a month it already shows.
- **Month picker:** all month fields (event and goal dates, the plan start) are text inputs with a calendar button (`src/ui/month-picker.ts`: year arrows, twelve months,
  Escape or an outside press closes it), since the native month input has no picker in Firefox and desktop Safari. Typing "YYYY-MM" still works.
- **Checked:** 691 tests, typecheck. Browser: the goal dialog opens the calendar, next year and a month write "2057-06" into the field and close it; tooltip and dot have no position transition.
- **Known gaps:** the calendar has no arrow-key grid navigation (the months are buttons in tab order); the hover feel was judged from the transition values, not a real pointer.

### Follow-up: slider changes glide again

- **What:** each step of a Plan card slider's live preview glides for 140 ms (`PREVIEW_GLIDE_MS`, `glideCharts(root, before, duration)`) from where the line is drawn right now, so dragging, a click on the track and an arrow key all move smoothly. Release continues from the current shape.
- **Checked:** a jump of the deposit slider moved the line end in steps (23.1, 25.0, 29.1, 31.2, 31.9, 32.0); two quick steps chain without a jump; reduced motion applies at once; no console errors.

### Loose ends

- **Badges:** up to 12 lanes instead of 6, and the lane distance tightens (`lanePitch`, 156 px shared) when more than 6 are needed, so a dense cluster
  overlaps a little instead of badges sitting on each other. Test: `chart-events.test.ts`.
- **deploy.yml:** the four actions are pinned by commit SHA (with the version in a comment) and the token permissions are per job: the build job only
  reads, the deploy job alone has `pages: write` and `id-token: write`.
- **.gitignore:** the local review notes (`ANALYS.md`, `KODGRANSKNING*.md`) and the stray `tests` file.
- **FRAMEWORK.md:** a guide to reusing this setup in another project.
- **Not done: a branded `Ore` type.** Trying it gave 412 type errors, about 380 of them numeric literals in tests, for a risk that the existing limits, `RangeError`s
  and pinned reference values already cover. Left as `number`; revisit only if a mix-up of units shows up.

### PR checks and month picker keys

- **PR checks:** `deploy.yml` also runs on pull requests to `main` (tests and build, the checks shown on the PR); the deploy job has `if: github.event_name != 'pull_request'`.
  The concurrency group is per ref (`pages-<ref>`), so a PR run can't cancel a deploy.
- **Month picker:** opens with focus on the chosen month; arrow keys move in the 4 × 3 grid (clamped), Home/End the first and last month, Page Up/Down the year; only one month is in the tab order.
- **Checked:** typecheck, 693 tests. Browser: start on Nov, right/down/left/up/End/Home gave 11, 11, 10, 6, 11, 0; Page Down moved 2056 to 2057 and kept the position; Escape closed it.
- **Known gaps:** the workflow change is only proven once this PR's own checks run; arrow keys are checked with dispatched key events.

### The beginner's guide (branch `feature/beginners-guide`)

- **What:** a "?" button in the app bar opens a dialog with six steps (what it is, the Plan card, the chart, events, the goal, compare/share/save),
  each with an illustration, Back / Next / "Got it", progress dots and "Step n of 6". It opens by itself on the first visit only
  (`advanced-savings-calculator:guide-seen` in `src/state/guide.ts`; storage that can't be read counts as seen), never on a share link or the design page.
- **Illustrations:** small inline SVG drawings in `src/ui/guide-art.ts`, coloured by CSS classes (`.gart*`) that use the design tokens, so both themes work.
  No image files. Texts are `messages.guide` in English and Swedish; the dialog is its own state like the other dialogs (`src/ui/guide-dialog.ts`).
- **Arrow keys and motion:** left and right arrows page through the steps (clamped at both ends); each step's picture and text slide in and fade (`guide-in-forward` / `guide-in-back`, 350 ms), from the side it was reached from. Reduced motion turns it off through the global rule.
- **The drawings move too:** when a step appears its lines draw themselves (`pathLength` 1 and `stroke-dashoffset`), slider fills grow, and dots, badges and flags pop in after, the badges one by one (`.gart*` keyframes in `app.css`, off under reduced motion).
- **Checked:** typecheck, 694 tests, build. Browser: opens on a cleared first visit, not after a reload, reopens from the button, steps 1 to 6 reached with focus on
  the primary button, no horizontal scroll at 375 px.
- **Known gaps:** the guide describes the page but doesn't point at it; the illustrations are sketches, not screenshots.
