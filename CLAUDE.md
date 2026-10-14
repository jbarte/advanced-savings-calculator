# CLAUDE.md

## What this project is

**Advanced Savings Calculator** is a free, browser-based tool that anyone can use to plan
long-term savings. Most online savings calculators only answer "what will I have if I save
X per month at Y% for Z years?". Real savings plans are messier than that, so this tool also
covers:

- **Planned withdrawals on specific dates.** Example: take out 150 000 kr in March 2031 for a
  house down payment and see how that changes the end result and the growth that follows.
- **Scenario comparison.** Build several plans side by side, for example different monthly
  amounts, returns, start dates or withdrawal schedules, and compare them in one chart and
  one table.
- **Goal-based planning.** Work backwards from "I want X by date Y" to the monthly deposit you
  need, with any planned withdrawals taken into account.

**Problem it solves:** people make big financial decisions, like taking money out of savings
for a car or a home, without seeing the long-term cost of that decision. This tool makes the
cost visible.

**Deliverable:** a static website deployed to GitHub Pages. No accounts and no backend. All
data stays in the user's browser.

## Tech stack and why

| Choice | Why |
|---|---|
| **TypeScript** (strict mode) | Financial math needs type safety. Dates, amounts and rates must never get mixed up. |
| **Vanilla HTML/CSS + TS, no UI framework** | The UI is small (forms, a chart, a table). A framework would add weight and abstraction without much benefit. |
| **Vite** | Fast dev server and a simple static build for GitHub Pages. |
| **Vitest** | Unit tests for the calculation engine. Same config as Vite. |
| **GitHub Actions + GitHub Pages** | Free hosting, deploys on every push to `main`. |
| **Charts drawn with plain SVG** | No chart library to begin with. Ask before adding one. |

UI language: **English**.

## Architecture principles

- **Pure calculation core.** All financial math lives in `src/core/`, written as pure
  functions: same input, same output, no DOM, no `Date.now()`, no randomness and no I/O.
  This is the most important rule in the project.
- **Layered structure:**
  - `src/core/`: the calculation engine (projection, withdrawals, goal solving). Pure TS.
  - `src/state/`: app state, scenario models, and serialization to/from `localStorage` and URL.
  - `src/ui/`: DOM rendering and event handling. Reads state and calls core. Contains no math.
  - `src/main.ts`: wires everything together.
- **All I/O goes through one layer.** Only `src/state/` touches `localStorage` or the URL.
  Only `src/ui/` touches the DOM.
- **Money is stored as integers in minor units (öre/cents).** Never use floats for stored
  amounts. Rates may be floats, but round explicitly and in one place.
- **Dates are handled as year-month values** (monthly granularity) through a small helper
  module, not as raw `Date` objects in the core.
- **Functions do one thing.** Keep functions short and well named, and prefer composing them
  over adding flags.
- **No global mutable variables.** State is passed in explicitly.
- **Tests first for the core.** Every function in `src/core/` has unit tests, including edge
  cases: a withdrawal larger than the balance, a withdrawal before the start date, zero
  return, and a goal that cannot be reached.
- **Shareable scenarios.** A scenario can be encoded in the URL so users can share a link.

## Things the agent must NOT do

- Do **not** add a UI framework (React, Vue, Svelte and so on) or a CSS framework.
- Do **not** add any runtime dependency without asking first. Dev dependencies for tooling
  (lint, test, types) are fine if you mention them.
- Do **not** add a backend, database, user accounts, analytics or tracking. Everything runs
  client-side.
- Do **not** put calculation logic in `src/ui/`, and do not touch the DOM from `src/core/`.
- Do **not** use floating-point numbers for stored money amounts.
- Do **not** weaken TypeScript strictness or use `any` to silence errors.
- Do **not** change the deploy target away from GitHub Pages.
- Do **not** present results as financial advice. The UI must show a short disclaimer.
- Do **not** commit or push without being asked.

## Commands

> These will be set up during scaffolding.

```bash
npm install       # install dev dependencies
npm run dev       # start the local dev server
npm test          # run unit tests (Vitest)
npm run build     # build the static site into dist/
```
