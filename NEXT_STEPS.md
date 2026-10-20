# Next steps

Status as of 2026-10-20. Read [CLAUDE.md](CLAUDE.md) first for goals, stack and rules.

## Where things stand

- **Done:** project setup (Vite, strict TypeScript, Vitest), design tokens with light/dark
  themes, and the full UI shell: scenario sidebar, projection chart with withdrawal markers,
  withdrawals table, goal gauge, scenario comparison.
- **Live:** https://jbarte.github.io/advanced-savings-calculator/ (deploys on every push to `main`).
- **Placeholder:** all numbers come from static sample data in `src/state/sample-data.json`.
  There is no calculation engine yet. `src/core/` holds the engine's types (`types.ts`),
  the rate and rounding helpers (`money.ts`) and a date helper.

## To do, in order

1. **Calculation engine (`src/core/`)**: tests first. Follow the calculation rules in
   CLAUDE.md (effective monthly rate, monthly rounding, order within a month, capped
   withdrawals).
   - `project(plan: PlanInput): ProjectionPoint[]`: monthly projection with dated
     withdrawals.
   - Lost growth per withdrawal by the end of the horizon.
   - Input and output use the types in `src/core/types.ts`, never `ScenarioView`.
2. **View model and replacing the sample data**: write `src/state/view-model.ts` to turn
   engine output into `ScenarioView`, switch `main.ts` over to it, then delete
   `sample-data.json`/`.ts`. `src/ui/` shouldn't need any changes.
3. **Editable Plan card**: make the inputs in `renderInputsCard` (`src/ui/side-cards.ts`)
   editable, store the values in state and validate them (no negative amounts, return of
   at least -100 %). Inputs update the store on `change`, not `input` (see CLAUDE.md).
4. **Add/edit/remove withdrawals** in the Planned withdrawals table.
5. **Goal planning**: let the user set the goal amount and date, then solve for the
   required monthly deposit (bisection or a closed form) and the month the goal is reached.
6. **"+ New scenario"**: create, rename, duplicate and delete scenarios.
7. **Persistence and sharing**: save scenarios to `localStorage` and encode the active
   scenario in the URL so "Share link" really shares it. All of this goes in `src/state/` only.
8. **Swedish localization**: add Swedish alongside English.
   - Move all UI text into translation files (e.g. `src/ui/i18n/en.ts` and `sv.ts`) with
     typed keys, so a missing translation is a type error.
   - Format month names and numbers per language (`Apr 2031` / `apr. 2031`, `1.7M kr` /
     `1,7 mn kr`) instead of the fixed formats in `format.ts` and `year-month.ts`.
   - Pick the default language from the browser, add a language switch in the header,
     and remember the choice in `localStorage` (through `src/state/`).
   - Set `<html lang>` to match, and update the "UI language" line in CLAUDE.md.
9. **Polish for the CV**: README with a screenshot and feature list, empty and error states,
   an accessibility pass, and possibly a CSV export.

## Known loose ends

- `actions/deploy-pages@v4` gives a warning that it targets an outdated Node version. Bump it
  when a new major version comes out.
- "+ New scenario" is disabled and the Plan inputs are read-only until steps 3 and 6.
