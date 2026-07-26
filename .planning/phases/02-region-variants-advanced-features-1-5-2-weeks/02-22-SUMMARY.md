---
phase: 02-region-variants-advanced-features-1-5-2-weeks
plan: "22"
subsystem: global-ui-surfaces
tags: [controls, header, onboarding, toast, copy, allowlist, a11y]
status: complete
completed: 2026-07-25
requires: ["02-08", "02-09", "02-18", "02-20", "02-21", "02-30"]
provides:
  - "Global action strip with truthful native state and a single filled CTA"
  - "Exact Phase 2 title/subtitle/help shell"
  - "Phase 2 onboarding guidance"
  - "Complete creator-safe status allowlist with bounded dynamic parameters"
affects: [src/App.tsx, tests/e2e]
tech_stack:
  added: []
  patterns:
    - "Action styling keyed on role classes, never on child position"
    - "Dynamic status messages bound their semantic parameter, not just a prefix"
key_files:
  created:
    - src/components/OnboardingBanner.test.tsx
  modified:
    - src/components/Controls.tsx
    - src/components/Controls.test.tsx
    - src/components/AppHeader.tsx
    - src/components/OnboardingBanner.tsx
    - src/components/ToastRegion.tsx
    - src/components/ToastRegion.test.tsx
    - src/utils/periods.ts
    - src/styles/Controls.css
    - src/App.tsx
    - tests/e2e/history.spec.ts
    - tests/e2e/persistence.spec.ts
    - tests/e2e/phase2-composition.spec.ts
    - .planning/coding-rules/frontend.md
    - .planning/coding-rules/export.md
decisions:
  - "Reset All Colors stays inside Controls as its own destructive action rather than moving into ColorPicker; UI-SPEC's compact row order is used for both layouts."
  - "The generic export failure copy was corrected to the Phase 2 contract; no export message may say 'Refresh the page'."
metrics:
  tasks: 2
  commits: 3
  unit_tests: "463/463 (36 files)"
  e2e: "Chrome 50/50"
---

# Phase 2 Plan 22: Global UI Surfaces Summary

Header, global action strip, onboarding, and the toast allowlist now match the Phase 2
copy contract exactly, with dynamic status messages bounded by their real semantics instead of
an arbitrary prefix.

## What was actually built

### Task 1 — global actions and header hierarchy (`d8b1529`)

- **Subtitle corrected** to `Color the world, frame your view, and export a polished map.`
  (was the Phase 1 line, `Color countries and export an Instagram-ready map.`).
- **Action order** is now `Undo Color Change`, `Redo Color Change`, `Save or Load Maps`,
  `Reset All Colors`, `Export PNG` — the exact UI-SPEC §8 compact row order, which also
  preserves the desktop relative order (Undo → Redo → Save or Load → Export) with the content
  reset held out as its own destructive action.
- **Every action carries a stable `data-action` and role class.** `Export PNG` is the only
  `controls__action--primary`; `Reset All Colors` is the only `controls__action--destructive`.
- **`Controls.css` no longer styles by position.** `button:nth-child(3)` (destructive tint) and
  `button:last-child` (filled CTA) were replaced by the role classes. This was a live latent
  defect: the reorder this plan required would have silently tinted `Save or Load Maps` red and
  filled `Export PNG`… only because it happened to stay last. Nothing would have failed.
- Native `disabled` + `aria-busy` retained, `Export PNG` ⇄ `Exporting PNG…` retained, and the
  synchronous export activation lock is unchanged.
- Tests pin labels, order, single filled action, busy/idle labels, native-only disabled state,
  the 48px control height already provided globally by `theme.css`, and the absence of
  `Reset View`, a period control, a `<select>`, and any region selector.

### Task 2 — onboarding and the complete safe-status allowlist (`792e637`)

- **OnboardingBanner** now renders UI-SPEC §16 verbatim: heading `Create your map`, the Phase 2
  body, the three Phase 2 steps (colors → camera/period → legend and exact-view export), CTA
  `Start Creating`, secondary `Dismiss Help`. The prop `onStartColoring` was renamed
  `onStartCreating`; behavior (dismiss + focus the first logical country path) is unchanged.
- **Export failure copy corrected** to the §17/§22 contract:
  `The PNG could not be created. Your map is unchanged. Try Export PNG again.` The old string
  told a creator to refresh a composition that lives only in browser memory.
- **`Centered on {country}.` is now bounded semantically**: initial uppercase letter, ≤60
  characters (longest shipped name is 36), control characters still refused. Previously it
  accepted any 1–100 characters, so `Centered on <64-char hash>.` passed the guard verbatim —
  proven by the new negative test, which failed before this change.
- **Latent bug fixed (Rule 1):** the previous charset allowlist rejected the real catalog name
  `Falkland Islands / Malvinas`, silently degrading its centering announcement to
  `Map updated.`. The new pattern was validated against all 248 shipped names — zero rejections.
- **Period load-failure copy** (`We couldn't load {period}. …`) joined
  `APPROVED_PERIOD_ANNOUNCEMENTS`, still generated from `SNAPSHOT_CATALOG`, so a manifest label
  can never reach the live region. This does not make a deferred snapshot reachable — the
  selector is still driven by `resolvePeriodOptions`.
- **Allowlist coverage tests**: one positive case per approved Phase 2 category (camera, period,
  legend creation/corner/custom/order, selection, color, history, save/replace/load/delete,
  legacy + partial-repair warnings, storage unavailable/full, PNG success, both PNG refusals),
  plus negatives for a raw 64-character hash, a hash smuggled through the bounded parameter,
  projection terms, schema/`schemaVersion` text, source paths and filenames, a stack frame and
  an `Error` header, `QuotaExceededError` / `DOMException` / `SecurityError`, deferred-feature
  copy, and arbitrary strings — each asserted against all four severities.
- **Role behavior pinned**: one polite `role="status"` for information/success, one assertive
  `role="alert"` for errors, one section, one exact `Dismiss Message` control, and the retry
  affordance present **only** for the recoverable generic failure.

## Verification

| Gate | Result |
|---|---|
| `npm run lint` | clean, zero warnings |
| `npx tsc -b` | clean |
| `npx vitest run` | **463/463**, 36 files (was 453/35) |
| `npx playwright test --project=chrome` | **50/50** |
| `npm run build` | clean (pre-existing >500 kB chunk advisory only) |

The tracked `historicalPreparationCli.test.ts` flake did not surface. No assertion was weakened.

### The predicted regression did not occur

`LegendOverlay` was not touched. `App` still passes it through `legendSlot` into the canonical
SVG. The real-app assertion `svg.map-canvas > [data-layer="legend"]` is untouched and passes in
all three of its locations (`persistence.spec.ts:372`, `phase2-composition.spec.ts:1056/1072/1102`).

## Accessibility landmarks — nothing moved or disappeared

Deliberately verified against invariant 9. Unchanged in structure: `<header>`, the
`<aside id="onboarding-help">` banner with its `aria-labelledby`/`aria-describedby` pair (only
its text content changed), `<section aria-labelledby="map-actions-heading">` with its `<h2>`,
the `Show Help` `aria-controls`/`aria-expanded` pair, the `role="status"` selection live region,
and the toast's `role`/`aria-live`/`aria-atomic`. **No `role`, `aria-*`, landmark, or heading was
removed, renamed, or relocated.** The only additions are `class` and `data-action` attributes,
which carry no semantics.

## Live invariants — re-checked

1. Selection/color still cannot reach a country outside the active scene; no state shape was
   touched; `savedColorsBaseline` and `compositionName` remain outside history.
2. No `legend.position` read was added anywhere.
3. One `MapCanvasHandle`, one `svg.map-canvas` — responsive tests unchanged and passing.
4. CountryList/Locate catalog untouched.
5. Period selector untouched; deferred snapshots remain structurally unreachable.
6. Legend opacity untouched.
7. PNG contract untouched — `export.spec.ts` pixel evidence still passes.
8. `CameraFreezeLease` untouched; the Controls activation lock still clears in `finally`.
9. See the landmark section above.
10. Nested-confirmation `inert`/Escape layering untouched.

## Deviations from plan

**1. [Rule 1 — Bug] `Falkland Islands / Malvinas` announcement degraded to the fallback**
- Found during Task 2 while validating the tightened pattern against the shipped catalog.
- The `/` was absent from the guard's charset, so a real country name failed the allowlist.
- Fixed as part of the same pattern change; regression-tested as a positive case.

**2. [Rule 3 — Blocking] E2E copy references updated**
- `Start Coloring` → `Start Creating` in three spec helpers, and the export failure string in
  three `phase2-composition.spec.ts` assertions. Without these the suite fails on the plan's own
  required copy. Only these lines changed — verified by diff.

**3. [Rule 2 — Correctness] `Controls.css` positional selectors replaced**
- Not named in the plan, but the plan's required reorder would otherwise have silently moved the
  destructive tint and the filled-CTA styling to the wrong buttons.

**4. [Rule 3 — Blocking] `src/App.tsx` prop rename**
- `onStartColoring` → `onStartCreating`, to keep the prop name honest after the CTA copy change.
  `App.tsx` is otherwise untouched and remains 02-23's to refactor.

**5. Scope note — `export.md` also updated**
- The generic failure copy is quoted in `export.md`'s per-reason refusal table, so leaving it
  would have made the rules file wrong the moment the copy changed.

## Reported honestly

- **Already satisfied before this plan, not re-invented:** the synchronous export activation
  lock, native `disabled`/`aria-busy` states, the 48px minimum control height (global
  `theme.css` rule), the `Reset View`-lives-only-in-`CompositionBar` invariant (already asserted
  in `MapNavigation.test.tsx` and `MapWorkspace.test.tsx`; this plan adds the `Controls`
  counterpart), the legend/persistence/storage message categories, and the `legend-blocked` /
  `invalid-composition` refusal messages from the wave 6 fixes.
- **Not covered by a unit test:** the export double-activation lock. Vitest runs on the `node`
  environment with `renderToStaticMarkup` only — there is no DOM to click twice. The lock's
  behavior is exercised in the browser suite; its code is unchanged by this plan.
- **TDD:** both tasks were written test-first and proven RED before implementation (Task 1: 4 of
  7 cases failing; Task 2: 5 cases failing). RED and GREEN were committed together because the
  plan specifies exactly one commit per task; the RED evidence is described here rather than in
  separate `test(...)` commits.

## Commits

| Commit | Scope |
|---|---|
| `d8b1529` | `feat(2-controls): update global composition actions` |
| `792e637` | `feat(2-feedback): update and test safe status copy` |

## Coding rules updated in the same commits

- `frontend.md` → **Global Action Strip (Phase 2)**: position-free styling, single filled CTA,
  native disabled/busy, content-vs-camera reset separation, synchronous activation lock.
- `frontend.md` → **Creator-Safe Status Copy (Phase 2)**: bound the parameter not the prefix,
  derive bounds from real data, generate catalog copy from catalog constants, one positive test
  per emitted message, never advertise deferred features.
- `export.md` → the refusal table now quotes the corrected generic copy and adds the absolute
  "no export message may say *Refresh the page*" rule.

## Self-Check: PASSED

Created files exist; both task commits (`d8b1529`, `792e637`) are present in `git log`.
