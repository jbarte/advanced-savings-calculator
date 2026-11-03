# Next steps

Status as of 2026-11-03. Read [CLAUDE.md](CLAUDE.md) first for goals, stack and rules.

## Where things stand

- **Done:** project setup (Vite, strict TypeScript, Vitest), light/dark themes, and the full UI shell:
  scenario tabs, projection chart with withdrawal markers, withdrawals table, goal gauge, scenario
  comparison. The shell is restyled with the "Neo-Tactile Soft UI" design system (merged into `main`).
- **Live:** https://jbarte.github.io/advanced-savings-calculator/ (deploys on every push to `main`).
- **Milestone 1 is done** (see below): the calculation engine in `src/core/project.ts` drives the
  page, and the start amount, monthly deposit, return and start date are editable. The page opens
  with an example plan starting this month, or an empty plan after "Start from scratch".
- **Not built yet:** adding withdrawals, deposit changes, saving, sharing. A reload resets the plan.
  Hidden until their milestones: scenario tabs, the comparison card, the goal card and the
  withdrawals table. The Share button is disabled.

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

### Does it fit the current plan?

| # | Requirement | Verdict |
|---|---|---|
| 1 | Start capital and monthly saving | Fits. Already in the model, the UI just needs editable inputs. |
| 2 | Withdrawal at a date | Fits. Already in the model and shown as markers on the chart. |
| 3 | Deposit changes at a date or for a period | **New.** The model has a single flat `monthlyDeposit`. Needs a new event type in the engine, a rule for how changes combine (see CLAUDE.md), and UI to add it. |
| 4 | All events visible on the graph | Partly. Withdrawals have markers. Deposit changes need period bands and markers, and all events need one timeline list. |
| 5 | Graph reflects everything | Fits once the engine replaces the sample data. 360 months is trivial to recalculate on every change. |
| 6 | Everything saved | Fits. `localStorage` needs no backend. Needs a versioned plan format so old saved plans keep working. |
| 7 | Share link without login | **Only partly.** A self-contained link works with no login and no server: the whole plan is packed into the URL after the `#`. A short `myurl.com/<id>` link needs a server to store plans, which conflicts with "no backend". See open decision 1. |

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

### 2. "What does this withdrawal cost me?" (requirement 2)

- I add a withdrawal with a date, amount and label, and see it on the graph as a drop.
- The table shows the growth I lose by the end of the period.
- I can edit or remove a withdrawal.
- If it is bigger than my balance, I am told it was reduced and by how much.
- **Done when:** a 300 000 kr withdrawal in 2031 shows the same lost growth as a hand calculation.
- *Technical work:* engine support for capped withdrawals and lost growth, an "Add event" flow in the
  UI, validation (date inside the plan, amount above 0).

### 3. "Change my saving over time" (requirement 3)

- I can change my monthly deposit from a date onward ("from Jan 2030, save 5 000 instead").
- I can change it for a period only ("pause saving Mar 2029 – Feb 2030"), and it goes back to what
  it was before when the period ends.
- "Add event" asks which kind: withdrawal or deposit change.
- The graph shows the new deposit level straight away.
- **Done when:** a pause for twelve months lowers the end balance by exactly what the hand
  calculation says, and a period inside an open-ended change returns to that change afterwards.
- *Technical work:* `DepositChangeInput` in `src/core/types.ts`, the deposit schedule rule (tests for
  overlaps, a change in month 0, a change after the horizon, and a change that ends before it starts),
  UI for adding, editing and removing.

### 4. "See everything at a glance" (requirement 4)

- Every event is visible on the graph: withdrawals as drops with labels, deposit changes as shaded
  periods or step markers, each with a hover or focus description.
- One timeline list shows all events sorted by date (replaces the withdrawals table). Selecting an
  event highlights it on the graph.
- A short legend explains the markers.
- Works on a phone and with the keyboard.
- **Done when:** a plan with ten mixed events is readable at phone width.

### 5. "It is all saved" (requirement 6)

- My plan is still there when I come back. Nothing is sent anywhere.
- A small "Saved" indicator, and a clear notice if my browser blocks storage.
- "Start over" clears everything, with a confirmation.
- Optional: export and import the plan as a JSON file as a backup.
- **Done when:** a plan saved by this version still opens after the format changes (versioned
  `PlanDocument` with migrations), and broken saved data falls back to the example with a message.
- *Technical work:* `PlanDocument` and its validator in `src/state/`, autosave through the store.

### 6. "Share my plan" (requirement 7)

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

### Later, still in scope (not in the scenario above)

7. **Goal planning:** set a goal amount and date, see whether I am on track, what monthly deposit I
   need and when I would reach it, with events included.
8. **Scenario comparison:** create, rename, duplicate and delete scenarios, and compare them, ideally
   as lines on one chart. Saving then covers all scenarios, and a share link covers one plan.
9. **Swedish localization:** add Swedish alongside English.
   - Move all UI text into translation files (e.g. `src/ui/i18n/en.ts` and `sv.ts`) with typed keys,
     so a missing translation is a type error.
   - Format month names and numbers per language (`Apr 2031` / `apr. 2031`, `1.7M kr` / `1,7 mn kr`)
     instead of the fixed formats in `format.ts` and `year-month.ts`.
   - Pick the default language from the browser, add a language switch in the header, and remember
     the choice in `localStorage` (through `src/state/`).
   - Set `<html lang>` to match, and update the "UI language" line in CLAUDE.md.
10. **Polish for the CV:** README with a screenshot and feature list, empty and error states, an
    accessibility pass, and possibly a CSV export.

## Open decisions

1. **Short link or self-contained link?** Recommendation: self-contained (`#plan=…`) first.
   - A short `myurl.com/<id>` link needs a server and a database. It would change the "no backend,
     all data stays in your browser" promise, add costs and privacy duties (you would store people's
     finances), and GitHub Pages cannot serve `/<id>` paths without a redirect trick.
   - The plan is a single `PlanDocument`, so a short-link service can be added later by storing the
     same document under an id. Nothing built in milestones 1–6 would be wasted.
   - Decide this before milestone 6, and update the rules in CLAUDE.md if the answer is a backend.
2. **Should the graph move while I type?** With the current rule, text inputs update the plan when I
   leave the field or press Enter. If you want updates on every keystroke or while dragging a slider,
   the form has to be built once and only the results re-rendered. Recommendation: keep "on change"
   for text fields, decide again once the first version is in front of you.
3. **Scenario tabs:** milestone 1 hides them, because the scenario above is one plan. Say so if you
   would rather keep comparison next to the editor from the start.

## Not in the list, possible later

- One-time extra deposits (a bonus, an inheritance).
- Inflation (real versus nominal value) and Swedish ISK/KF tax rules.
- Self-hosted Geist fonts, instead of loading them from Google, which fits the "no tracking" promise.
- ESLint (with a rule that checks the layer imports) and Prettier. These are new dev dependencies,
  so they need approval first.
- Run typecheck, tests and build on pull requests as well, not only on pushes to `main`.

## Known loose ends

- `actions/deploy-pages@v4` gives a warning that it targets an outdated Node version. Bump it when a
  new major version comes out.
- The Share button is disabled until milestone 6, and "+ New scenario" does not exist until milestone 8.
- The start date uses `<input type="month">`. It was checked in a Chromium-based browser only. Firefox
  and Safari show a plain `YYYY-MM` text box or their own picker, which the parser handles, but that is
  untested.
