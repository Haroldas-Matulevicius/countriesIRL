---
phase: 02-region-variants-advanced-features-1-5-2-weeks
plan: "30"
subsystem: transactions
tags: [export, camera-lease, transaction-hook, composition-root, filename]

requires:
  - phase: 02-18
    provides: finalizeSelectedScene and the crossfade outgoing-scene layer
  - phase: 02-21
    provides: pure exportMapPng with the composition tripwire and the named-filename sanitizer
  - phase: 02-29
    provides: the single-owner MapCanvasHandle and CameraFreezeLease contract
provides:
  - useCompositionExportTransaction — the export lease transaction extracted out of App
  - One outermost finally that releases the camera lease, the activation lock, and the busy lock on every path
  - F5.5 end to end — the last committed save/load name reaches the export filename
affects: [02-22 controls consolidation, 02-23 App composition root, 02-27 final integration, 02-28 acceptance matrix]

tech-stack:
  added: []
  patterns:
    - "Transaction hook = pure factory (node-testable) + thin React wrapper that owns only React state"
    - "A hook that owns a lock creates its transaction exactly once and reads its options through a ref"
    - "Owner callbacks are reported after the lease is released and can never propagate a throw into the lock"

key-files:
  created:
    - src/hooks/useCompositionExportTransaction.ts
    - src/hooks/useCompositionExportTransaction.test.tsx
  modified:
    - src/App.tsx
    - tests/e2e/phase2-composition.spec.ts
    - .planning/coding-rules/frontend.md
    - .planning/coding-rules/export.md

key-decisions:
  - "The composition name does NOT belong to the export transaction — it is composition identity shared with save and load, so the hook takes a getCompositionName() accessor and App owns the state"
  - "The transaction is built exactly once per owner and reads its options through a ref; a useMemo-rebuilt transaction would carry a fresh, unlocked activation flag"
  - "No re-validation of the export source shape in the transaction — exportMapPng already refuses disconnected/multi-SVG/sibling-legend sources before capture, and a second copy of those rules is drift, not safety"
  - "A concurrent activation is refused silently: reporting it would raise a second toast for a click that changed nothing"
  - "Failure reasons stay truthful — preparation-failed before capture begins, export-failed once html2canvas is running, the five ExportFailureReason values passed through unchanged"

requirements-completed: [F5.1, F5.2, F5.3, F5.5, NFR4, NFR11]

duration: 35min
completed: 2026-07-25
---

# Phase 2 Plan 30: Exact Export Orchestration Summary

**The export transaction now lives in `useCompositionExportTransaction`, where the camera lease, the activation lock, and the busy lock are released from one outermost `finally` on every path — refusal, thrown preparation, thrown capture, thrown status callback — and the last committed save/load name finally reaches the PNG filename.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 1 of 1 (executed as RED → GREEN → extra browser proof)
- **Files created:** 2
- **Files modified:** 4
- **Commits:** 3 (`2b99c5c`, `9476064`, `618be42`)

## What this actually is

A refactor with one deliberate behavior addition (F5.5). The extracted transaction reproduces
`App.handleExport` step for step:

| Step | Old (`App.tsx`) | New (hook) |
|---|---|---|
| re-entrancy | `exportInProgressRef` | activation flag, checked synchronously before any `await` |
| legend gate | `showError(legendExportBlocker)`, no lease | `legend-blocked` outcome carrying the same message, no lease |
| missing handle | generic failure toast | `map-canvas-unavailable` → same toast |
| freeze → commit → finalize → source → capture | identical order | identical order |
| cleanup | `finally { lease?.release(); ...ref; setIsExporting(false) }` | outermost `finally`, activation flag → lease → busy, each guarded |
| outcome | toast after the `finally` | reported after the `finally`, same toasts |

Three things are stricter than the code it replaces, all of which were reachable strands:

1. `setIsExporting(true)` used to run **outside** the `try`. A throw there left the button
   disabled forever. It is now inside.
2. `legendExportBlocker` / handle resolution throwing produced an unhandled promise rejection
   (`void handleExport()` had no catch). They now resolve to `preparation-failed`.
3. A throwing status callback (`showStatus`/`showError` after an unmount) propagated out of the
   handler. It is now logged via `console.error` and cannot reach the locks — which are already
   released by then, since reporting happens after the `finally`.

The activation lock is also genuinely single now. In `App` it was a `useRef`, which is stable;
had the transaction been built with `useMemo([...deps])` in the hook, every dependency identity
change would have handed out a fresh unlocked transaction mid-export. The hook therefore builds
the transaction once, lazily, inside the returned callback, and reads all options through a ref.
That also makes `exportPng` stable, so the toast retry can call it directly.

## The F5.5 ownership call (asked for explicitly)

**The composition name does not belong in this hook, and it is now wired anyway — end to end.**

Reasoning: the name is *composition identity*, not export state. Save writes it, load reads it,
and a future title/header will display it. If the export transaction owned it, the exporter
would become the source of truth for a value two other transactions already own, and the name
would evaporate whenever the export hook was remounted. So the hook takes a
`getCompositionName(): string | undefined` accessor — it must *pass* a name, it must not *hold*
one — and `App` holds `compositionName`, set only on a **committed** save or load (a refused
save must never name the export after a map that was never written).

`App` holding it is a small, contained move that `02-23` can lift into the composition root
unchanged; leaving it out would have deferred F5.5 for a second consecutive plan behind a plan
that does not own the requirement. F5.5 is claimed complete on browser evidence, not on the
sanitizer's unit tests:

- unnamed → `CountriesIRL_<date>.png`
- after saving `Baltic  Tour /2026!` → `Baltic_Tour_2026_<date>.png`

both asserted against real Chrome downloads in
`tests/e2e/phase2-composition.spec.ts:1002`.

## Live invariants — checked, not assumed

1. **History stays colors-only.** `compositionName` is React state in `App`, outside
   `useMapState` and outside `useCompositionState`; no history snapshot gained a field, and
   undo/redo never writes it.
2. **No raw `legend.position` read** was added — the hook never touches legend geometry, only
   the pre-computed blocker string.
3. **One handle, one SVG.** The transaction resolves the handle **once per activation** and
   holds it; a mid-export remount cannot receive the release for a lease it never issued
   (unit-tested) and the existing 1200px-transition browser test still passes.
4. **Save reads the camera live and non-locking** — untouched; `readCurrentCamera` is asserted
   *not* called by the export path.
5. **Export takes an idempotent lease released in the outermost `finally` on every path** —
   this is the whole point of the plan; see the test table below.

## Test coverage — `useCompositionExportTransaction.test.tsx` (22 cases)

| Case | Proves |
|---|---|
| success | exact call order `busy:true → freeze → commit(frozen) → finalize → source → capture → release → busy:false → outcome`, exact source and name passed through, `readCurrentCamera` never called |
| concurrent activation | second run returns `already-active`, one freeze, no second outcome; lock clears and a later export runs |
| legend blocked | no freeze, no busy lock, no capture; message returned verbatim |
| no handle | no busy lock, no capture |
| rebound handle | each activation resolves the *current* handle; both leases released once |
| remount mid-export | the activation handle's source is captured and its lease released; the remounted handle is never frozen |
| null export source | `export-source-unavailable`, lease released, busy cleared |
| 5 × capture reasons | each `ExportFailureReason` surfaced unchanged, release ordered before the outcome |
| capture throws | `export-failed`, lease released |
| freeze throws | `preparation-failed`, no lease, busy cleared, activation lock clear for the next run |
| commitCamera / finalize / getExportSource throw | `preparation-failed`, lease released, no capture |
| legend-blocker read throws | `preparation-failed`, no busy lock |
| status callback throws | outcome still returned, release ordered before the throwing callback, `console.error` logged, next run works |
| busy callback throws | lease still released once, activation lock clear |
| double release | second `release()` is a no-op, effective release count stays 1 |
| immediate save | the frozen camera is what a read during and after capture sees |

## Verification — what I ran vs what I assumed

**Ran and observed green:**

- `npx vitest run src/hooks/useCompositionExportTransaction.test.tsx` — 22/22
- RED proven honestly: the implementation file was moved aside and the suite failed to import
  before the test-only commit `2b99c5c`
- `npx vitest run` — **442/442** (two clean full runs)
- `npm run lint` — clean, zero warnings
- `npx tsc -b` — clean
- `npm run build` — clean (pre-existing >500 kB chunk advisory only)
- `npx playwright test --project=chrome` — **49/49**, including the pre-existing
  `real app export failure and frozen load both release without false success` (which exercises
  the extracted transaction through a real mid-export responsive remount and a frozen load) and
  the new filename case

**Assumed, not verified:**

- Edge was not re-run for this plan (Chrome only, per the success criteria). Nothing in the
  change is engine-specific — no new browser API is touched.
- I did not visually inspect a PNG. Pixel-level acceptance remains an `02-28` owner item.
- `NFR11` is claimed on the strength of the release/ordering tests and the browser lease cases;
  I did not construct a fault-injection matrix inside `html2canvas` itself beyond the reasons
  `exportMapPng` already returns.

## Deviations from Plan

### Auto-added / expanded scope

**1. [Rule 3 — blocking] `src/App.tsx` edited (not in `files_modified`)**
- Extracting the transaction without removing the original would have left two
  implementations of the camera-lease contract. The plan's `<execution_notes>` say "App wiring
  is Plan 23", which I read as the composition-root *restructure*; the export handler had to
  move now or the hook would be dead code.
- `App` lost `exportInProgressRef`, the `isExporting` state, the `exportMapPng` import, and the
  55-line handler; it gained three accessors, an outcome mapper, and the hook call.
- **Commit:** `9476064`

**2. [Rule 2 — missing functionality] `compositionName` state in `App` + `getCompositionName`**
- F5.5 was left partial by `02-21` and is in *this* plan's `requirements`. See the ownership
  call above. Set on committed save/load only.
- **Commit:** `9476064`

**3. [Rule 2] `tests/e2e/phase2-composition.spec.ts` gained one case**
- Without it, F5.5 would rest on a unit assertion that the hook forwards a string. The browser
  case proves the whole chain: save dialog → composition identity → transaction → sanitizer →
  a real Chrome download. It also proves the lease and busy lock released, since a second
  export would otherwise be refused.
- **Commit:** `618be42`

### Deliberate non-deviation

**The plan asked the hook to reject "missing/disconnected/multiple-SVG/no-legend/sibling-legend
sources before capture". It only rejects a `null` source.** `exportMapPng` already refuses
disconnected sources, a source without exactly one canonical SVG, and a sibling or duplicate
legend — all before it builds a frame or calls html2canvas, so "before capture" is satisfied.
Re-implementing those rules in the transaction would be a second copy of the legend-placement
contract that produced the clipped-legend regression, free to drift from the first. A
**missing** legend is deliberately *not* rejected anywhere: a map with no colors has no legend
entries, and that must still export a white square.

## Known issues (not mine)

`src/utils/historicalPreparationCli.test.ts` — the tracked flake. Observed here in the
`identityKey`/deterministic-bytes family: three consecutive isolated runs gave 1 failure, 2
failures, then 28/28, while two full-suite runs gave 442/442. Fully self-contained
(`node:fs`, `node:crypto`, temp dirs) and imports nothing this plan touched. Not chased, no
assertion weakened.

## Threat Flags

None. No new network endpoint, auth path, file access pattern, or schema change. `T-02-78`
(camera lock DoS) and `T-02-79` (stale frozen state) are the two threats this plan owned; both
are mitigated in the outermost `finally` and the pre-capture `commitCamera`, and both are
covered by the test table above. `T-02-50` (filename injection) stays mitigated in the
sanitizer — the new call site passes a user string through the same unchanged function.

## Known Stubs

None.

## Self-Check: PASSED

- `src/hooks/useCompositionExportTransaction.ts` — FOUND
- `src/hooks/useCompositionExportTransaction.test.tsx` — FOUND
- `src/App.tsx` — FOUND
- `tests/e2e/phase2-composition.spec.ts` — FOUND
- `.planning/coding-rules/frontend.md` — FOUND
- `.planning/coding-rules/export.md` — FOUND
- commit `2b99c5c` — FOUND
- commit `9476064` — FOUND
- commit `618be42` — FOUND
