# Implementation log

A running record of what was built, why, and how it was checked. **Update this file at the end of every
implementation step or PR**: add an entry at the bottom of "Log", and keep "Current status" true.
Plans and goals live in [NEXT_STEPS.md](NEXT_STEPS.md), rules in [CLAUDE.md](CLAUDE.md).

## Current status

- **Merged:** milestone 1 (PR #1), milestone 2 (PR #2).
- **Open:** PR #3, foundation fixes (`feature/foundation-fixes`), and PR #4, milestone 3 "Change my saving
  over time" (`feature/deposit-changes`), stacked on #3. Merge #3 first; #4 then retargets to `main`.
- **Next:** milestone 4 (overview), 5 (saving), 6 (sharing). See `NEXT_STEPS.md`.
- **Tests:** 258 (`npm test`), typecheck and build pass on `feature/deposit-changes`.

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

### Milestone 3: "Change my saving over time" (PR #4, open, stacked on #3)
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
