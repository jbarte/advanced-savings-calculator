# Advanced Savings Calculator

A free, browser-based savings calculator for people whose plans are more than "save X per
month". You can see what a withdrawal on a specific date really costs in the long run,
compare several savings plans side by side, and work out how much you need to save each
month to reach a goal.

**Live:** https://jbarte.github.io/advanced-savings-calculator/

> **Status:** in development. You can already enter your own start amount, monthly deposit,
> return and start date and see the projection. Withdrawals, deposit changes, saving and
> sharing are next. See [NEXT_STEPS.md](NEXT_STEPS.md).

## The problem

Ordinary savings calculators only answer "what will I have if I save X per month at Y% for
Z years?". Real decisions look different, for example: "I want 300 000 kr for a house down
payment in 2031. What does that do to my savings by the time I retire?" This tool makes the
long-term cost of a decision like that visible.

## Features

- **Withdrawals on specific dates.** Plan withdrawals and see the dip in the curve and the
  growth you lose by the end of the period.
- **Change your monthly saving over time.** Raise, lower or pause your deposit from a date
  onward, or for a period only (for example during parental leave).
- **Everything on one chart.** Withdrawals and deposit changes are shown on the graph and in
  one timeline, and the graph updates with every change.
- **Saved automatically, shareable with a link.** Your plan stays in your browser, and a link
  opens the same plan for anyone, with no login.
- **Scenario comparison.** Several plans side by side, with the end balance of each one.
- **Goal planning.** How much do you need to save each month to reach X kr by a given date,
  and when do you get there?
- **Time horizon of 10, 20 or 30 years**, with an interactive chart for balance, deposits,
  growth and withdrawals.
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
