---
phase: 02-region-variants-advanced-features-1-5-2-weeks
wave: 6
source_review: .planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-REVIEW-wave6.md
fixed_at: 2026-07-25
fixed_against: f32b42d (02-30 landed; review was pinned to e188827..d31d3ee)
findings_in_scope: 8
fixed: 7
already_resolved: 1
skipped: 0
status: all_dispositioned
---

# Wave 6 Review — Findings Disposition

Every finding was re-verified against current `HEAD` before any code was written, because
`02-30` (`2b99c5c`, `9476064`, `618be42`, `f32b42d`) landed after the review's pinned range and
moved the export handler out of `App.tsx` into `useCompositionExportTransaction`.

| ID | Severity | Disposition | Commit |
|---|---|---|---|
| HIGH-1 | high | fixed | `e3f1fa2` |
| MEDIUM-2 | medium | fixed (test) | `8641878` |
| MEDIUM-3 | medium | **already resolved by 02-30** | — |
| MEDIUM-4 | medium | fixed | `2084ee4` |
| MEDIUM-5 | medium | fixed | `2084ee4` |
| LOW-6 | low | fixed | `e54601a` |
| LOW-7 | low | fixed | `e54601a` |
| LOW-8 | low | fixed | `8d6d898` |

---

## HIGH-1 — `invalid-composition` had no message of its own — FIXED (`e3f1fa2`)

**Still reproduced at HEAD.** After `02-30` the discard moved but survived:
`useCompositionExportTransaction` passes `capture.reason` through unchanged, and
`App.handleExportOutcome` special-cased `legend-blocked` only, so `invalid-composition` fell
into `showExportFailure()` → *"Refresh the page and try Export PNG again."* + a retry button.

**Fix.** `handleExportOutcome` now branches on `invalid-composition` and reports a new allowlisted
message: *"The map layout could not be captured. Your map is unchanged. Move the legend, then try
Export PNG again."* No refresh instruction; no retry affordance (`ToastRegion.canRetryExport` is
gated on the generic message, so the retry button is structurally unreachable for it).

**Evidence.** New real-app browser test `phase2-composition.spec.ts:1040` detaches the legend from
the canonical SVG, asserts the new copy, asserts the absence of "Refresh the page", of
"Try Export Again", of any download, and that the colors survive — then reattaches the legend and
exports successfully, proving the gate is not stuck and the camera lease was released. Proven RED:
with `src/App.tsx` stashed the test fails; with it, it passes. Plus a `ToastRegion` unit case that
the message renders verbatim with no retry even when a `retry` callback is supplied.

**Coding rules.** `export.md` gained "Every refusal reason needs its own creator-facing message",
with the reason → message-shape → retry table.

---

## MEDIUM-2 — legend-containment assertions had no real-app counterpart — FIXED (`8641878`)

**Still reproduced at HEAD.** `export.spec.ts:224` asserts `svg.map-canvas > [data-layer="legend"]`
against `fixtures/export.html`, which passes its own `legendSlot` into `MapCanvas` and therefore
proves only that `MapCanvas` fills the slot it is handed.

**Fix (test-only).** `persistence.spec.ts` "real app saves and loads the complete composition" now
asserts, against `page.goto('/')`: the modern map listbox exists exactly once and contains **no**
`[data-layer="legend"]`; `svg.map-canvas > [data-layer="legend"]` has count 1; and `Move legend`
has no `[role="listbox"]` ancestor. The HIGH-1 test adds a second real-app instance of the same
containment assertion.

**Evidence that it catches the regression 02-22/02-23 could introduce.** `App.tsx` was temporarily
patched to render `<LegendOverlay/>` inside a sibling `<svg>` instead of through `legendSlot` — the
exact refactor the review describes. The canonical-SVG assertion went `1 → 0` and the test failed;
reverted, it passes. Note that in that simulated state the source contains no legend either, so
`isSingleCanonicalComposition` would have **passed** and shipped a legend-less PNG — the assertion,
not the gate, is what catches it.

**Coding rules.** `export.md`: "A fixture cannot prove legend placement — only the real app can",
with the general rule *when a fixture re-implements the wiring under test, its assertion is about
the fixture*.

---

## MEDIUM-3 — named export unreachable from production — ALREADY RESOLVED BY 02-30

No change manufactured. Evidence at `HEAD`:

- `src/App.tsx:203` — `const [compositionName, setCompositionName] = useState<string | null>(null)`
- `src/App.tsx:729-732` — `getCompositionName` accessor
- `src/App.tsx:751-757` — passed into `useCompositionExportTransaction`
- `src/App.tsx:771-777` — set on a **committed** save only (and the load equivalent below it)
- `useCompositionExportTransaction.ts:146-150` — forwarded to `exportMapPng` as `mapName`
- `phase2-composition.spec.ts:1002` — real Chrome downloads assert `CountriesIRL_<date>.png`
  unnamed and `Baltic_Tour_2026_<date>.png` after saving `Baltic  Tour /2026!`

The review's own text anticipated this (`02-30 owns the wiring`). F5.5 is genuinely shipped;
the 02-28 acceptance cell should be marked delivered, not deferred.

---

## MEDIUM-4 — nested confirmation did not hide the dialog behind it — FIXED (`2084ee4`)

**Still reproduced at HEAD.** The dirty-load confirmation rendered inside the outer
`role="dialog" aria-modal="true"`, whose subtree still contained Save, Delete, Close, and the name
input. Mouse was blocked by CSS, `Tab` by the trap — browse/virtual-cursor mode by nothing.

**Fix.** The confirmation is now a **sibling** of `.save-load-dialog` under the same overlay (an
inert ancestor would remove the confirmation itself from the tree). While `pendingLoad !== null`
the dialog carries `inert` **and** `aria-hidden="true"`, set imperatively in an effect because
React 18 does not serialize the `inert` prop. The key handler moved to the overlay, since an inert
dialog can hold no focus and a handler bound there could never fire. `Keep Editing` now restores
focus from an effect (the target is still inert while the click handler runs).

**Evidence.** `persistence.spec.ts` asserts the `inert` attribute, that `Delete Saved Map: …`,
`Close Saved Maps`, and the `Map name` textbox are **not exposed by role** while the confirmation
is open, that the confirmation itself still is, and that `inert` is gone after `Keep Editing`.
Proven RED against the prior component.

---

## MEDIUM-5 — Escape during a delete confirmation closed the whole modal — FIXED (`2084ee4`)

**Still reproduced at HEAD** (`pendingDeleteKey` was not considered). Escape now dismisses the
innermost open layer: `pendingLoad` → `pendingDeleteKey` (restoring focus to that row's
`Delete Saved Map`) → close.

**Evidence.** `persistence.spec.ts` presses Escape during the delete confirmation and asserts the
prompt closed, the Save/Load dialog is **still visible**, and focus returned to `Delete Saved Map`.
Proven RED by restoring only the old two-way branch: the "still visible" assertion failed.

**Coding rules.** `frontend.md` "Nested Confirmation Dialogs" gained the inert rules and the
Escape-layering rule (*add the branch in the same change that adds the confirmation*).

---

## LOW-6 — blanket `id` stripping — FIXED (`e54601a`)

Confirmed latent, not live (no `url(#`, `<defs>`, gradient, clip path, mask, marker, or `<use>`
in `src/`). Fixed anyway, because both suites assert `ids === 0` and would have **confirmed** the
break: `sanitizeExportClone` now collects every reference in the clone first — `url(#…)` in any
attribute or inline style, plus `href` / `xlink:href` beginning with `#` — and keeps the ids they
resolve. Unreferenced ids are still stripped.

**Evidence.** New unit case adds a `<defs>` gradient, a clip path, a `<use>` target, an unused
gradient, and an unreferenced swatch id: referenced ids survive, unreferenced ones do not, paint
attributes are untouched, and a sweep asserts **no surviving reference dangles**. Fails against the
prior sanitizer. `export.spec.ts` (`clone.ids === 0` on the real fixture) still passes, since
nothing there is referenced.

---

## LOW-7 — `svgLegends <= 1` admits zero legends — FIXED (`e54601a`)

Split into the two conditions the guard actually enforces (duplicate legend; legend present in the
source but not in the canonical SVG), with the zero-on-both-sides case allowed **deliberately and
documented**: an uncolored map has no legend entries and must still export a white square. It was
*not* tightened to `=== 1`, which would have broken that live invariant. A new unit case pins the
legend-less export as `ok`.

---

## LOW-8 — save failures reported with load copy — FIXED (`8d6d898`)

`map-canvas-unavailable` on **Save Current Map** rendered *"This saved composition could not be
loaded"*, and `map-not-found` fell through to *"This browser blocked local saves"*. Both reasons
are now mapped by an exhaustive `getSaveFailureMessage` `switch` over
`CompositionSaveFailureReason`, so a new reason becomes a type error rather than a wrong sentence;
`map-not-found` also refreshes the list, as it already did on the load path. Unit tests assert the
six messages are distinct and that none says "loaded".

---

## Live invariants — re-checked, none regressed

1. Selection/color still cannot reach a country outside the active scene; history stays
   colors-only; `savedColorsBaseline` and `compositionName` remain outside the history snapshot
   (no state shape was touched).
2. No new raw `legend.position` read: the fixes touch messaging, DOM attributes, and the export
   sanitizer only.
3. One `MapCanvasHandle`, one `svg.map-canvas` across the 1200px transition — asserted by the
   unchanged responsive tests, all passing.
4. CountryList/Locate catalog untouched.
5. Period selector untouched; historical snapshots remain unreachable.
6. Legend opacity untouched.
7. PNG contract untouched — `export.spec.ts` pixel evidence (1080 square, opaque white corners)
   still passes, and the sanitizer change only *preserves* attributes.
8. `CameraFreezeLease`: no early return was added anywhere inside the transaction. The HIGH-1
   change is downstream of the outermost `finally` (it runs in `onOutcome`), and the new browser
   test proves a second export succeeds after a refusal.

## Verification

- `npx tsc -b` — clean
- `npm run lint` — clean, zero warnings
- `npx vitest run` — **447/447** (35 files)
- `npx playwright test --project=chrome` — **50/50**
- `npm run build` — clean (pre-existing >500 kB chunk advisory only)

The tracked `historicalPreparationCli.test.ts` flake did **not** surface in this run; no assertion
was weakened.

---

_Fixed: 2026-07-25 · Source: `02-REVIEW-wave6.md` · Fixer: Claude (gsd-code-fixer)_
