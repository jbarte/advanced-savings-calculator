# Framework: how this project is set up, and how to reuse it

A recipe for a **static, no-backend, no-framework web app** in strict TypeScript, deployed to GitHub Pages and built
step by step with an AI agent. Everything here is taken from Life Ledger (`advanced-savings-calculator`). Replace the
domain (savings) with yours; keep the structure.

---

## 1. Principles

1. **Static and private.** No backend, accounts, analytics or CDN. Data lives in the browser (`localStorage`) and in
   share links. This removes whole classes of work (auth, hosting, GDPR) and is enforced by a test.
2. **A pure core.** All domain logic is pure functions: same input, same output, no DOM, clock, randomness or I/O.
   This is what makes it testable to the last digit.
3. **Layers point inwards:** `ui → state → core`. Never the other way. A test reads the sources and fails on a breach.
4. **One-way data flow.** UI event → `Actions` → store update → one full re-render. UI never mutates state.
5. **Data is a versioned document.** One JSON-friendly document is the only thing saved or shared. Everything read
   from outside (storage, URL, file) is untrusted and goes through one validator plus migrations.
6. **Rules are enforced by tests, not by hope.** Architecture, privacy (no external hosts), colour contrast, i18n
   completeness and pinned reference values are all tests.
7. **Small PRs, each verified.** Typecheck + tests + build + a real browser check before every PR.

---

## 2. Stack and why

| Choice | Why |
|---|---|
| TypeScript, strict + extras | Types stop mixing up units (money, dates, rates). |
| Vanilla TS + DOM helpers, no UI framework | Small UI; a framework adds weight and abstraction. |
| Vite | Dev server, static build, `base` path for Pages. |
| Vitest | Same config as Vite; tests next to code. |
| Plain SVG charts | No chart library; ask before adding any dependency. |
| Self-hosted fonts (woff2 in `public/fonts`) | No third party sees visitors' IPs. |
| GitHub Actions + Pages | Free; test, build, deploy on every push to `main`. |

**Zero runtime dependencies.** Dev dependencies only: `typescript`, `vite`, `vitest`. Node >= 22.12 (`engines`).

### `package.json`
```json
{
  "name": "my-app", "private": true, "version": "0.1.0", "type": "module",
  "engines": { "node": ">=22.12" },
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": { "typescript": "^7", "vite": "^8", "vitest": "^5" }
}
```

### `tsconfig.json` (the strictness matters)
```json
{
  "compilerOptions": {
    "target": "ES2022", "module": "ESNext", "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"], "types": ["vite/client"],
    "strict": true, "noUncheckedIndexedAccess": true, "noImplicitOverride": true,
    "noUnusedLocals": true, "noUnusedParameters": true, "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true, "noImplicitReturns": true,
    "isolatedModules": true, "verbatimModuleSyntax": true, "skipLibCheck": true, "noEmit": true
  },
  "include": ["src", "vite.config.ts"]
}
```
Consequences: `import type` for types, explicit handling of `undefined` from indexing, no `any`, no `!`.

### `vite.config.ts`
- `base: "/<repo-name>/"` (Pages serves under the repo name). Never change it after launch.
- A build-only plugin injects a **Content-Security-Policy** meta tag (`default-src 'self'`, `script-src 'self'`,
  `style-src 'self'`, `style-src-attr 'unsafe-inline'`, `connect-src 'self'`, `object-src 'none'` ...). Build only,
  because the dev server needs inline scripts and a websocket.
- `test: { include: ["src/**/*.test.ts"], css: { include: [/\.css(\?|$)/] } }`. The `css.include` line matters:
  Vitest otherwise returns an empty string for CSS imports, even `?raw`, so tests that read stylesheets pass vacuously.
  Also assert in such tests that the files were really read (length > some number).

### `.github/workflows/deploy.yml`
Triggers: push to `main` and manual. `permissions: contents: read, pages: write, id-token: write`.
`concurrency: pages` with cancel-in-progress. Job `build`: checkout, setup-node 22 with npm cache, `npm ci`,
`npm test`, `npm run build`, `upload-pages-artifact` (`dist`). Job `deploy`: `deploy-pages`, environment `github-pages`.
Tests gate the deploy. (Improvement to do: pin actions by commit SHA, tighten permissions per job.)

---

## 3. Folder layout

```
index.html                 shell: title, metas, favicon, #app, #announcer live region
public/                    favicon, og-image, fonts (served as is)
src/main.ts                composition root: store, actions, render
src/architecture.test.ts   enforces the rules below
src/core/                  PURE domain engine + *.test.ts next to each file
src/state/                 types, document, validation, storage, URL, view model, store, workspace changes
src/ui/                    DOM rendering, dialogs, i18n/, actions.ts, dom.ts (h/s helpers)
src/styles/                fonts.css, tokens.css (colours), app.css (components), contrast.test.ts
CLAUDE.md                  rules for the agent (see section 12)
NEXT_STEPS.md              backlog and milestone plan
implementation.md          log of what was built, why, how it was checked
```
Files are `kebab-case.ts`; tests are `name.test.ts` beside the file; UI render functions are `renderX` and return an element.

---

## 4. Layers and the architecture test

- `core` imports nothing from `state` or `ui`. It has no `Date.now`, `new Date`, `Math.random`, `window`,
  `document`, `localStorage`, `fetch`.
- `state` never imports `ui`. Only `state` touches `localStorage` and `location`/`history`. The clock is read in
  exactly one file (`state/clock.ts`).
- `ui` is the only layer touching the DOM; no `innerHTML`/`insertAdjacentHTML` anywhere in `ui`.
- Nothing makes network requests and no file references another host.

**How the test works** (copy the idea): load sources with `import.meta.glob("./core/**/*.ts", { query: "?raw",
import: "default", eager: true })`, drop `*.test.ts`, strip comments, then regex over imports and forbidden
identifiers. First assert the globs found files, or the rules check nothing. No linter needed.

---

## 5. Core: pure domain engine

- Own input/output types in `core/types.ts` (money and time only, never display concerns).
- **Money as integers in minor units**, never floats. Convert to display only in the UI formatter; parse typed amounts
  from the digits, not via a float. Round in exactly one place with one rule (`roundToOre`).
- Dates are value types (`YearMonth`), never raw `Date`.
- Limits live in one constant (`PLAN_LIMITS`) chosen so every result stays below `Number.MAX_SAFE_INTEGER`; the engine
  throws a `RangeError` rather than return an inexact number; a test checks the largest allowed input still fits.
- No magic numbers: `MONTHS_PER_YEAR`, `yearsToMonths()`.
- Every function has unit tests incl. edge cases (cap, before start, zero rate, unreachable goal).
- **Pinned reference values:** a test holds results checked by hand and by an independent script, to the last unit.
  If a change moves one, it is a bug or a rule change that needs a decision.
- Write core functions **test first**.

---

## 6. State: the document, validation, storage, sharing

**The document.** One versioned, JSON-friendly type (`PlanDocument`) with real domain dates (not offsets). A mapper
turns it into the engine input. It is the only thing persisted or shared.

**Reading untrusted data.** `readPlanDocument(unknown)`: check shape field by field, run migrations by `version`, then
`validatePlanDocument`. The same reader serves `localStorage`, share links and imported files. Add a migration
whenever the format changes (v1 -> v2 gets defaults for new fields). A broken save falls back to the default with a
notice and is left in place until the next change overwrites it.

**Validation lives in `state/`** and throws a `PlanError` (a `RangeError` carrying a `PlanProblem`). UI parsers only
give friendlier messages while typing. Every change goes through one function (`withPlanChange`): invalid change ->
state unchanged + a notice. A change that leaves the data equal returns the same object (not saved, not marked dirty).

**Notices are data.** `state` never writes a sentence. A `PlanProblem` is a code plus parts (`{ code: "amount", field,
min, max }`); the UI turns it into words in the user's language (`noticeText`, `problemText`).

**Storage.** One key namespaced by app (`<app>:plans`, because GitHub Pages shares `localStorage` across all of a
user's `*.github.io` sites). Versioned wrapper `{ version, activeId, plans: [...] }`. Every I/O call in
try/catch with a fallback; blocked/full storage is reported once and the app keeps working in memory. Keep old keys
readable and delete them on the next save.

**Sharing without a backend.** `<page>#plan=<token>`, token = `z.` + base64url(deflate(JSON)) using the browser's
`CompressionStream`, fallback `u.` + base64url(JSON). The hash never goes to a server. Treat as untrusted: limit token
length and inflated size (decompression-bomb guard), then the normal reader. A shared plan opens as an extra, unsaved
plan with a banner ("Keep as new" / "Back to mine"); opening a link never touches the user's own data.

**Several documents.** A `PlanSet` (`plans`, `activeId`, `returnId`, each entry `{ id, plan, origin }`). Pure
functions (`addPlan`, `deletePlan`, `restorePlan`, ...) run through `withPlanSetChange` (refused change -> unchanged +
notice). Ids are local, never shared.

**View model.** `buildScenarioView(plan)` runs the engine and shapes the result for display (labels, per-event
effects, status flags like `before-start`/`after-horizon`). Cache it per document id + view settings so selection,
theme and notice changes don't recompute.

**Undo, not "are you sure".** Removal actions return an `Undo` closure; the UI shows a toast with Undo for ~8 s.
State has `restoreX` functions that put things back by id (next free id if taken).

---

## 7. UI: rendering and events

- **DOM helpers** `h(tag, attrs, ...children)` / `s(...)` for SVG; attributes starting with `on` are listeners;
  `null` children are skipped. Never `innerHTML` with user text.
- **Store** is ~20 lines: `get`, `update(patch)`, `subscribe`. No global mutable variables; the store is created in
  `main.ts` and passed in.
- **Actions** (`ui/actions.ts`) is an interface of everything the UI can ask for; `main.ts` implements it with
  `commitPlan(change)` / `commitPlanSet(change)` (apply pure change -> store -> persist if it changed).
- **Full re-render** on every store update, via `createRenderScheduler`: defers one tick and waits for `pointerup`.
  Why: `change` fires while focus is leaving a field and a re-render would put focus back (Tab stuck) or replace a
  button under the pointer (lost click). Always trigger renders through the store.
- **Inputs commit on `change`, not `input`** (a re-render would rebuild the field mid-typing). Live feedback while
  typing (validation) stays local to the field. The one live exception is sliders: on `input` they render a *preview*
  (hero + chart only, rAF-coalesced, not in the store); on `change` they commit.
- **Focus survives re-renders:** elements carry `data-key`; focus is restored by key; when the focused element
  disappears its `data-focus-next` names who gets focus. Notices are announced through one `#announcer`
  `aria-live` region outside the re-rendered tree.
- **Dialogs** (`openModal`) are appended to `<body>` so re-renders can't remove them, keep their own state, validate
  as the user types, and touch the store only on Save. A shared form shell avoids repeating the plumbing.
- **Own month picker** instead of `<input type="month">` (missing in Firefox/desktop Safari): a text field plus a
  calendar popover that fires the field's own `input`/`change`.
- **Presentation math** (chart scales, geometry) may live in `ui`; domain math may not.

---

## 8. Interface text (i18n without a library)

- `i18n/en.ts` is the source: a nested object, texts with parts to fill are **functions** (`(n) => ...`), the caller
  formats numbers and dates so a language can reorder them.
- `Messages` type is derived from `en`; `sv.ts` (or any language) is typed `Messages`, so a missing or misshaped text
  is a compile error. A test checks nothing is empty and no translation equals English except a listed allow-list.
- One place picks the language at page load (saved choice, else browser, else English), so `messages` is a plain
  constant. Switching saves the choice and **reloads**.
- Number/date formats come from `messages.locale`; formatters are created from those settings so tests can format in
  any language. The core holds no display text. Data written at creation time stays in its original language.

---

## 9. Design system and accessibility

- All colours are CSS custom properties in `tokens.css` (light + dark, `prefers-color-scheme` plus a manual
  toggle). Also tokens for depth (shadows), radius, border, icon sizes, spacing, durations, easing, press scale.
- BEM-style class names; state via ARIA attributes (`[aria-pressed="true"]`), not extra classes. A global
  `[hidden] { display: none !important }`.
- **`contrast.test.ts`** parses `tokens.css` and fails when a text colour is under 4.5:1 or key UI colours under 3:1
  on the backgrounds they sit on, in both themes. Change a colour -> run the tests.
- Rules: real `<button>`s and labelled inputs; scrolling regions are keyboard reachable and named; targets >= 24 px;
  disabled controls have their reason read out (`aria-describedby`) because disabled buttons can't focus; charts get a
  data table; layout works at 375 px with no horizontal scroll; layout must not jump when a view switch changes text
  (render both wordings in one grid cell, hide the unused one).
- **Motion is small and optional:** one rule turns all transitions/animations off under `prefers-reduced-motion`;
  one `motionAllowed()` check for script. Chart paths glide between shapes with `requestAnimationFrame`
  interpolation (only when point counts match). Do not put transitions on things that must follow the pointer.
- Fonts: self-hosted variable woff2, fallback faces sized to the font's metrics to avoid layout shift.

---

## 10. Privacy and security

- No analytics, no CDN, no web fonts from third parties; the architecture test fails on `fetch`, `XMLHttpRequest`,
  `WebSocket`, `sendBeacon` and on any `http(s)://` host in HTML/CSS other than your own.
- CSP meta tag in the build (above). Pages can't send headers, so no `frame-ancestors`.
- All external input (storage, URL, file) is hostile: size limits, shape check, validation, no `innerHTML`.
- A visible disclaimer if the domain is advice-like (finance, health).

---

## 11. Testing strategy

| Kind | Where | Purpose |
|---|---|---|
| Core unit tests (test first) | `core/*.test.ts` | Exact numbers, edge cases |
| State tests | `state/*.test.ts` | Pure changes, validation, migration, storage with a fake, share-link round trip |
| Pinned references | `reference-values.test.ts` | Hand/script-checked results |
| Architecture | `architecture.test.ts` | Layer, purity, privacy rules |
| i18n | `messages.test.ts` | Complete, non-empty, translated |
| Design | `contrast.test.ts` | WCAG contrast of tokens |
| UI logic | small `*.test.ts` | Parsers, formatters, geometry, option builders |

Before any PR: `npm run typecheck`, `npm test`, `npm run build`, then check the change **in a real browser** (console
clean, interaction works, reduced motion, narrow width, both themes/languages if touched).

---

## 12. Working with the agent (the `CLAUDE.md` pattern)

`CLAUDE.md` in the repo root is the contract. Sections that earned their keep:

1. **Project**: what, for whom, the problem it solves, deliverable, status.
2. **Tech stack** table with a "why" for each choice.
3. **Code conventions**: formatting, naming, types, imports, comment policy, CSS naming.
4. **Architecture**: layers, data flow, every decided rule and the reason (this is where decisions are recorded so
   they are not re-litigated).
5. **Design**: tokens, depth levels, accessibility rules.
6. **Rules** (hard "do not"): no framework, no new dependency without asking, no backend/tracking, no `any`, no
   logic in `ui`, don't commit/push unless asked, update `implementation.md` every step.
7. **Project structure** tree with one line per file.
8. **Setup / run / test** commands.

Plus `NEXT_STEPS.md` (milestones, open decisions) and `implementation.md` (log: what, why, how checked, known gaps).
Update the docs in the same PR as the code, or they rot.

**Workflow per step:** agree scope (ask only for genuinely open decisions) -> branch `feature/<name>` from fresh
`main` -> tests first for core -> implement -> typecheck/tests/build -> browser check -> update CLAUDE.md,
implementation.md, NEXT_STEPS.md -> report -> commit, push, PR when asked -> user merges -> next step. Check the
previous PR is merged (not just open) before reusing a branch; check a PR is still OPEN before pushing to its branch.

---

## 13. Bootstrap checklist for a new project

1. `git init`, GitHub repo, enable Pages (Source: GitHub Actions).
2. `npm init`, install `typescript vite vitest` as dev deps; add scripts, `tsconfig.json`, `vite.config.ts` (set
   `base`), `.gitignore` (`node_modules dist .DS_Store *.log .env*`).
3. Copy `deploy.yml`; push to `main` once to confirm the pipeline.
4. Create `index.html` (title, metas, `#app`, `#announcer`), `src/main.ts`, folders `core state ui styles`.
5. Write `architecture.test.ts` **first**, so the rules exist before the code.
6. Write `CLAUDE.md` (sections above) and `NEXT_STEPS.md`; start `implementation.md`.
7. Model the domain: `core/types.ts`, then the engine test-first; pick the minor unit and limits.
8. Define the document type + validator + `readX` with `version: 1`; storage and share link.
9. Store, `Actions`, render scheduler, `h()` helpers; render one screen end to end.
10. Add `tokens.css` + `contrast.test.ts`, self-hosted fonts, CSP plugin.
11. Move all text into `i18n/en.ts` from the start (retrofitting is a whole milestone).
12. Then features, one small PR each.

---

## 14. Lessons and pitfalls

- Retrofit cost: i18n, the document version and "notices as data" are cheap at the start and a milestone later.
- A test that reads files can pass on nothing: always assert the inputs are non-empty.
- Full re-render + focus: forget the scheduler or `data-key` and Tab/clicks break in subtle ways.
- Sliders: a held reference is stale after a `change` re-render; re-query.
- Anything that must track the pointer (chart cursor) gets no position transition; delays read as lag.
- Reduced motion: one global rule beats per-component checks.
- Storage on `github.io` is shared across the account's sites: namespace keys.
- Push over HTTPS with the `gh` credential helper if SSH keys aren't available.
- Don't remove a native control (month input) without a replacement that works in every browser.
- Cap everything at limits that keep integer math exact, and test the worst case.
