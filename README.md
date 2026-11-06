# Life Ledger

A free, browser-based long-term financial planner for people whose plans are more than "save X per month". You can
see what a withdrawal on a specific date really costs years later, change or pause your saving for a period, add
one-time deposits, set a goal and see the monthly deposit it needs, and share the whole plan with a link.

**Live:** https://jbarte.github.io/advanced-savings-calculator/ (the address keeps the project's first name, so
existing links keep working).

> **Status:** in development. Planning, saving, sharing, a custom horizon, an inflation adjusted view and goal
> planning work, a plan can have a name, you can keep several plans as tabs, and the Compare card puts them side by
> side. The app is in English and Swedish. See [NEXT_STEPS.md](NEXT_STEPS.md).

## The problem

Ordinary savings calculators only answer "what will I have if I save X per month at Y% for
Z years?". Real decisions look different, for example: "I want 300 000 kr for a house down
payment in 2031. What does that do to my savings by the time I retire?" This tool makes the
long-term cost of a decision like that visible.

## Features

- **Withdrawals on specific dates.** Plan withdrawals and see the dip in the curve.
- **What every event is worth.** Each withdrawal, one-time deposit and deposit change shows how much it moves
  your end balance, in red for a loss and green for a gain, plus the total of all events.
- **Change your monthly saving over time.** Raise, lower or pause your deposit from a date
  onward, or for a period only (for example during parental leave).
- **One-time deposits.** Add a bonus or an inheritance in a specific month.
- **Everything on one chart.** Withdrawals and deposit changes are shown on the graph and in
  one timeline, and the graph updates with every change.
- **Saved automatically, shareable with a link.** Your plan stays in your browser, and a link
  opens the same plan for anyone, with no login.
- **Several plans.** Keep up to five plans as tabs: add an empty one, copy the open one, or copy it without one event
  ("what if I skipped this?").
- **Compare plans.** With two or more plans, a card shows one line per plan on a shared chart and a table of each plan's end
  balance, deposits, growth and withdrawals, with the difference to the plan you have open.
- **English and Swedish.** The app opens in your browser's language, and a button in the top bar switches (the choice is
  remembered in your browser).
- **Goal planning.** How much do you need to save each month to reach X kr by a given date,
  and when do you get there?
- **Inflation adjusted view.** A switch shows the results adjusted for inflation (2 % a year by default, you can
  change it), so a balance in 30 years reads in what it would buy today. What you enter stays as entered.
- **A savings goal.** Say how much you want by when, and see how close the plan gets, the monthly deposit you
  would need with all your planned events kept, and when you reach it. The goal is a dashed line on the chart.
- **Your own time horizon**, from 1 to 40 years (with 10, 20 and 30 years one click away), with an interactive
  chart for balance, deposits, growth and withdrawals.
- **Light and dark mode** that follows the system setting.
- **Private by design:** no accounts, no backend and no tracking. All data stays in your
  browser. A shared link contains the plan itself in the part after `#`, which is never sent
  to a server.

## Tech stack

- TypeScript (strict mode) with no UI framework
- Vite for the dev server and build
- Vitest for unit tests
- Charts drawn with plain SVG
- GitHub Actions and GitHub Pages for deploys

There are no runtime dependencies. See [CLAUDE.md](CLAUDE.md) for the reasoning behind
these choices, the architecture and the code conventions.

## Getting started

Requires Node.js 22.12 or newer.

```bash
git clone git@github.com:jbarte/advanced-savings-calculator.git
cd advanced-savings-calculator
npm install
npm run dev
```

Open http://localhost:5173/advanced-savings-calculator/.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm test` | Run the unit tests |
| `npm run test:watch` | Rerun the tests when files change |
| `npm run typecheck` | Run the strict TypeScript check |
| `npm run build` | Typecheck and build to `dist/` |
| `npm run preview` | Serve the built site locally |

## Project structure

```
src/
├── core/    # Pure calculation engine: no DOM, no I/O, fully unit-tested
├── state/   # App state, data models, localStorage/URL
├── ui/      # DOM rendering and events, no financial math
├── styles/  # Design tokens and component styles
└── main.ts  # Wires everything together
```

## Deployment

Every push to `main` runs the tests, builds the site and publishes it to GitHub Pages
through [the deploy workflow](.github/workflows/deploy.yml).

## Disclaimer

The calculations are estimates based on a constant return. They are not financial advice.
