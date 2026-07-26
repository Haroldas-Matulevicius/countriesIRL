---
phase: 02-region-variants-advanced-features-1-5-2-weeks
plan: "24"
subsystem: styles
tags: [css, tokens, responsive, accessibility, preferences, export-isolation, e2e]
status: complete
completed: 2026-07-25
requires: ["02-22", "02-23"]
provides:
  - "The exact UI-SPEC token contract in theme.css, with fixed --map-* export tokens and glass as progressive enhancement over opaque fallbacks"
  - "Executable static CSS contract (src/styles/phase2CssContract.test.ts)"
  - "Chrome responsive/preference evidence (tests/e2e/responsive.spec.ts), including a byte-level proof that the PNG is theme- and DPR-independent"
affects:
  [
    src/styles,
    src/components/MapNavigation.tsx,
    src/components/OnboardingBanner.tsx,
    tests/e2e,
  ]
tech_stack:
  added: []
  patterns:
    - "A brace-matching CSS walker in the contract test, so nested at-rules (@supports wrapping @media) are inspected rather than flattened away"
    - "Preference emulation via page.emulateMedia, with unsupported preferences asserted statically instead of simulated"
    - "Export independence proven by comparing a 64-point pixel probe of the downloaded PNG across three browser contexts"
key_files:
  created:
    - src/styles/phase2CssContract.test.ts
    - tests/e2e/responsive.spec.ts
  modified:
    - src/styles/theme.css
    - src/styles/App.css
    - src/styles/Controls.css
    - src/styles/MapCanvas.css
    - src/components/MapNavigation.tsx
    - src/components/OnboardingBanner.tsx
    - .planning/coding-rules/frontend.md
decisions:
  - "MapNavigation and OnboardingBanner received class hooks (no markup, no behavior change). Styling them otherwise required either positional selectors, which this phase banned, or [data-editor-only] as a styling hook, which is an export-semantics attribute."
  - "The app bar was made sticky; .app lost its overflow-x, which would have silently disabled stickiness. Horizontal containment stays on body."
  - "prefers-reduced-transparency is asserted statically only. Playwright cannot emulate it, and simulating it would be labelling a non-check as browser evidence."
  - "The 200% zoom cell uses a halved CSS viewport, labelled as the zoom EQUIVALENT. Physical browser zoom stays with 02-28."
  - "The horizontal-overflow check measures element rects, not scrollWidth: body's overflow-x: hidden makes the page-level comparison vacuously true."
metrics:
  tasks: 3
  commits: 3
  unit_tests: "492/492 (37 files)"
  e2e: "Chrome 65/65 · Edge 65/65"
---

# Phase 2 Plan 24: CSS Contract and Responsive Slice Summary

The Phase 2 visual system is now executable rather than advisory. `theme.css` carries the exact
UI-SPEC token contract, the responsive workspace matches the declared breakpoint hierarchy in a
real browser, and two new suites — a static CSS contract and a Chrome responsive/preference
slice — fail on the drift classes that previously would have shipped silently.

## What was already true, and what changed

The important context was right: much of the responsive behavior existed. The breakpoints, the
one-active-DOM branch, the safe-area gutters, the compact grid, and the mobile sheet were all
already in place and are unchanged. What was missing was mostly **exactness** and **enforcement**.

| Area | State before | State now |
|---|---|---|
| Token values | Phase 1 indigo/grey palette (`--accent: #4338ca`, `--surface-page: #f3f4f6`) | Exact UI-SPEC 4/5 values, asserted literally |
| `--motion-scene` / `--motion-camera` | Absent | Declared, and zeroed under reduced motion |
| Glass surfaces | Not implemented at all | Three approved surfaces, opaque-first, with fallbacks for three preferences |
| Border / focus weights | Hard-coded `1px` in 40+ rules | `var(--border-width)` / `var(--focus-width)`, so `prefers-contrast: more` strengthens every boundary in one place |
| Desktop inspector | Four stacked cards in a scrolling column | One shell; sections are transparent panes divided by hairlines |
| Inspector column width | 360px | 376px (UI-SPEC 7.1) |
| App bar | Static, no bar treatment | Sticky, full-bleed, one bottom hairline, glass over opaque |
| `MapNavigation` | Entirely unstyled | One bordered glass cluster; pan controls placed by direction class |
| Legend editor / Locate | Entirely unstyled | Rows, swatches, validation, radio groups, combobox popup |
| `touch-action` | `manipulation` on the canvas | `none`, scoped to `svg.map-canvas` and asserted to be the only owner |
| Contract enforcement | Prose in `02-UI-SPEC.md` | 20 static assertions + 12 Chrome cases |

## The invariants, and how each was held

| Invariant | Evidence |
|---|---|
| 3 — one camera owner across 1200px | `expectOneCameraOwner` from `02-23`'s harness, reused unchanged, at 1440 / 1024 / 800 |
| 7 — PNG theme- and DPR-independent | **Proven, not argued.** `preference-independent export` exports the real app three times in separate browser contexts (light/DPR 1, dark/DPR 3, forced-colors/DPR 2) and asserts a 64-point pixel probe of the downloaded PNG is identical, at exactly 1080×1080 each time |
| 9 — landmark counts at both layouts | `expectLandmarks` asserts banner 1 / main 1 / complementary 1-or-0 at every viewport in the new spec |
| 10 — legend inside the canonical SVG | Untouched. `App.test.tsx` and `phase2-composition.spec.ts` containment assertions still pass |
| 12 — 48px minimum control height | Statically (`min-height` may never resolve below the token scale) and physically (every visible button measured at 360px) |
| Positional-selector ban (`02-22`) | Now enforced, not documented — see below |

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 2 — missing critical functionality] The positional-selector ban was not actually enforced**

- **Found during:** Task 1
- **Issue:** `02-22` fixed `Controls.css` but the same defect class still lived in `App.css`:
  `.app > aside button:first-child` painted the onboarding accent CTA. Reordering the banner
  would have moved the accent onto `Dismiss Help` with nothing failing.
- **Fix:** `OnboardingBanner` gained `onboarding__action--accent`; the contract test now fails
  on **any** positional pseudo-class in a selector that reaches a `button`, `input`, `select`,
  `a`, or `summary`, across all four stylesheets.
- **Commit:** `5737be3`

**2. [Rule 3 — blocking] `MapNavigation` had no styling hooks**

- **Found during:** Task 3
- **Issue:** The component rendered class-less `div`s. Styling the cluster required either
  positional selectors (banned) or `[data-editor-only]` (an export-semantics attribute, not a
  styling hook).
- **Fix:** Added `map-navigation`, `__cluster`, `__control`, `__popover`, and
  `__pan--{direction}` classes. No markup, ordering, ARIA, or behavior change; the inline 44px
  sizing that `MapNavigation.test.tsx` asserts is untouched.
- **Commit:** `a279146`

**3. [Rule 1 — bug] `.app { overflow-x: hidden }` would have silently disabled the sticky bar**

- **Found during:** Task 2
- **Issue:** On a non-viewport element, `overflow-x: hidden` computes `overflow-y: auto`, making
  `.app` its own scroll container. The app bar would have stuck to `.app` and never moved, and
  no test would have failed.
- **Fix:** Removed; `body` already carries the horizontal containment, where the value
  propagates to the viewport. Proven by `the app bar stays pinned while the responsive
  workspace scrolls`.
- **Commit:** `35b4043`

**4. [Rule 1 — bug] `filter: brightness(0.96)` on the country hover state**

- **Found during:** Task 3
- **Issue:** UI-SPEC 3/6 prohibit filters on map geometry; html2canvas approximates filters
  differently than the browser paints them. `sanitizeExportClone` strips the `hovered` class, so
  this was latent rather than live — but it is exactly the property the export must never carry.
- **Fix:** Hover is now a darker boundary only. `filter` was also dropped from the
  `.country-path` transition list, and the contract test bans `filter`, `box-shadow`,
  `text-shadow`, `mix-blend-mode`, `mask`, and `clip-path` on every export-content selector.
- **Commit:** `a279146`

### Two test-authoring traps caught during execution

Both would have produced a **green but meaningless** assertion:

1. **The dark/light stroke comparison initially failed** — not because the export leaked a theme
   token, but because country paths carry a 150ms stroke transition and the read sampled a colour
   in flight. Investigated rather than loosened; the settled value is `#0f766e` in both themes,
   which is `--map-border-focus` behaving exactly as Task 1 intended. The test now polls to a
   settled value.
2. **The focus-order test tabbed from the middle of the document.** `waitForApp` dismisses
   onboarding, which parks focus on the map, and blurring does not reset the sequential
   navigation starting point. It "passed through" the country browser and would have proved an
   order beginning wherever focus happened to land. Fixed by clicking the product title first.

Both lessons are now rules in `frontend.md`.

## Honest gaps — not delivered by this plan

These are **composition-root placement** decisions in `src/App.tsx`, outside this plan's declared
file set (`src/styles/*`, two test files) and not safely expressible in CSS:

1. **`MapNavigation` is not an overlay on the square.** UI-SPEC 10 places the cluster at the
   top-left of the map square; it is currently rendered inside `workspace__actions`, i.e. in the
   desktop inspector. It is now styled as one cluster, which reads correctly where it sits, but
   its **position** does not match the spec.
2. **Consequently the compact focus order is `action strip → map navigation → composition bar →
   map`,** not UI-SPEC 20's `action strip → composition bar → map → map navigation`. The new
   test asserts the order that actually exists and names the deviation in a comment rather than
   asserting a fiction.
3. **`GlobalActions` is not in the app bar.** UI-SPEC 8 lists Undo/Redo/Save-Load/Export on the
   desktop app bar; they live in the inspector. This is why the sticky bar carries only the
   title, subtitle, and `Show Help`.
4. **`prefers-reduced-transparency` has no browser evidence.** Playwright cannot emulate it. The
   fallback is asserted statically and belongs to `02-28`'s physical matrix.
5. **200% zoom is a CSS-viewport equivalent, not physical zoom.** Explicitly labelled as such in
   the spec file. `02-28` still owns the physical cell.

Items 1–3 are a coherent unit of work for a follow-up plan that is allowed to touch `App.tsx`.

## Verification

| Gate | Result |
|---|---|
| `npm run lint` | clean |
| `npx tsc -b` | clean |
| `npx vitest run` | **492/492**, 37 files (was 469/469, 36 files) |
| `npm run build` | clean |
| `npx playwright test --project=chrome` | **65/65** (was 53/53) |
| `npx playwright test --project=msedge` | **65/65** (Edge was last run at `02-21`, 48/48) |

The `historicalPreparationCli.test.ts` flake did **not** reappear across four full unit runs.

## Self-Check: PASSED

- `src/styles/phase2CssContract.test.ts` — FOUND
- `tests/e2e/responsive.spec.ts` — FOUND
- `5737be3` `feat(2-styles): define Phase 2 visual tokens` — FOUND
- `35b4043` `feat(2-styles): compose responsive world workspace` — FOUND
- `a279146` `feat(2-styles): style world navigation and legend` — FOUND
