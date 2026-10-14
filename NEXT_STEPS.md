# Next steps

Status as of 2026-10-14. Read [CLAUDE.md](CLAUDE.md) first for goals, stack and rules.

## Where things stand

- **Done:** project setup (Vite, strict TypeScript, Vitest), design tokens with light/dark
  themes, and the full UI shell: scenario sidebar, projection chart with withdrawal markers,
  withdrawals table, goal gauge, scenario comparison.
- **Live:** https://jbarte.github.io/advanced-savings-calculator/ (deploys on every push to `main`).
- **Placeholder:** all numbers come from static sample data in `src/state/sample-data.json`.
  There is no calculation engine yet, so `src/core/` only holds a date helper.

## To do, in order

1. **Calculation engine (`src/core/`)**: tests first.
   - Monthly projection from start amount, monthly deposit and yearly return.
   - Withdrawals on specific dates. Decide what happens when a withdrawal is larger than the
     balance (cap it and show a warning?).
   - Lost growth per withdrawal by the end of the horizon.
   - It must return the `ScenarioView` shape from `src/state/types.ts`. The UI already
     renders that shape, so the sample data can be swapped out without touching `src/ui/`.
2. **Replace the sample data** with engine output, then delete `sample-data.json`/`.ts`.
3. **Editable Plan card**: make the inputs in `renderInputsCard` (`src/ui/side-cards.ts`)
   editable, store the values in state and validate them (no negative amounts, sensible
   return range).
4. **Add/edit/remove withdrawals** in the Planned withdrawals table.
5. **Goal planning**: let the user set the goal amount and date, then solve for the
   required monthly deposit (bisection or a closed form) and the month the goal is reached.
6. **"+ New scenario"**: create, rename, duplicate and delete scenarios.
7. **Persistence and sharing**: save scenarios to `localStorage` and encode the active
   scenario in the URL so "Share link" really shares it. All of this goes in `src/state/` only.
8. **Polish for the CV**: README with a screenshot and feature list, empty and error states,
   an accessibility pass, and possibly a CSV export.

## Known loose ends

- `actions/deploy-pages@v4` gives a warning that it targets an outdated Node version. Bump it
  when a new major version comes out.
- "+ New scenario" is disabled and the Plan inputs are read-only until steps 3 and 6.
