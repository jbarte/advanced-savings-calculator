# Implementation log

A running record of what was built, why, and how it was checked. **Update this file at the end of every
implementation step or PR**: add an entry at the bottom of "Log", and keep "Current status" true.
Plans and goals live in [NEXT_STEPS.md](NEXT_STEPS.md), rules in [CLAUDE.md](CLAUDE.md).

## Current status

- **Merged into `main`:** milestone 1 (PR #1), milestone 2 (PR #2), foundation fixes (PR #3), milestone 3
  "Change my saving over time" (PR #5), the contrast of raised surfaces and dialogs (PR #6), the removal of the
  white glow (PR #7), milestone 4A "one numbered timeline list" (PR #8) and one-time deposits (PR #9). PR #4 had
  been merged into its base `feature/foundation-fixes` after #3 was already in `main`, so it never reached
  `main`; PR #5 carried the same commits there.
- **Lessons:** (1) a stacked PR does not retarget to `main` by itself when its base branch is not deleted.
  Retarget it (or open a new PR to `main`) before merging. (2) Before pushing more commits to a PR branch,
  check that the PR is still open (`gh pr view`), and afterwards check with `git merge-base --is-ancestor`
  that `main` has each commit. This went wrong twice (#4 and the white-glow commit).
- **In progress:** milestone 4B (chart: numbered badges, bands, lanes, legend, selection, phone layout) on
  `feature/m4-chart`. Then milestone 5 (saving) and 6 (sharing).
- **Tests:** 293 (`npm test`), typecheck and build pass.

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

### Foundation fixes (PR #3, open)
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
