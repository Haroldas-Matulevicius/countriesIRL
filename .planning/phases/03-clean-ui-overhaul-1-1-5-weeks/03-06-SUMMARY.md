---
phase: 03-clean-ui-overhaul-1-1-5-weeks
plan: 06
subsystem: editor-rail
tags: [tool-rail, flyout-panel, hud, theme-toggle, storage-adapter, red-probe, roving-tabindex, accent-budget]
status: complete

requires:
  - phase: 03-clean-ui-overhaul-1-1-5-weeks
    plan: 03
    provides: "the `.map-editor` shell grid, the reserved panel track, and `uiContract.test.ts`"
  - phase: 03-clean-ui-overhaul-1-1-5-weeks
    plan: 04
    provides: "the Themely token system, the class-driven dark palette, `--radius-row` / `--radius-pill`, and the mode-invariant `--accent-fill` pair"
  - phase: 03-clean-ui-overhaul-1-1-5-weeks
    plan: 05
    provides: "`MapEditor`'s props boundary, the storage adapter as a factory, the one-production-storage-site gate, and the retirement of the app bar and inspector as containers"
provides:
  - "`src/components/editor/ToolRail.tsx` + `ToolRailRow.tsx` — the 56px strip and the signature row, translated from Themely rather than copied"
  - "`src/components/editor/ToolPanel.tsx` — the one 280px flyout, and the persistent `main` landmark"
  - "`src/components/editor/HudHeader.tsx` / `HudFooter.tsx` — pinned identity and pinned Export, siblings of the only scrolling element"
  - "`src/components/editor/ThemeToggle.tsx` — the neutral D-30 control; `.dark` is React state on the mount root with no OS query anywhere"
  - "`src/constants/tools.ts` — one ordered tool inventory read by the rail, the panel title, and the stored-preference validator"
  - "four `StorageAdapter` methods for the two new preference keys, bounded before interpretation and absent-tolerant"
  - "`Controls` variant `rail`, added not copied, with exactly one instance mounted"
  - "`tests/e2e/rail.spec.ts` — 10 tests; assertion 15 (rail half) and the spec'd focus order live here"
  - "assertion 27 in `uiContract.test.ts` — exactly one roving-tabindex writer, with its classifier exercised both ways"
  - "the production-source half of assertion 1 — no `.ts`/`.tsx` under `src/` reads `prefers-color-scheme`"
  - "`openRailTool` / `legendDisclosure` in `tests/e2e/support/appHarness.ts`"
  - "`coding-rules/frontend.md` § The Tool Rail and its Panel; `coding-rules/storage.md` § What `03-06` actually landed"
affects: [03-07, 03-08, 03-09, 03-10, 03-11, 03-12]

actuals:
  tokens: 51500
  tasks: 4
  commits: 4

tech-stack:
  added:
    - "an imperative-handle render prop (`renderIcon(iconRef)`) so one row component drives any of the fourteen vendored icons without importing fourteen handle types"
    - "a `:not([state])` hover exclusion, because `:hover` outranks a plain attribute selector and silently repaints the active row"
    - "a storage method that returns `T | null` for absent rather than applying the default, keeping the adapter a boundary and the boundary prop alive"
  patterns:
    - "a state-transition test that asserts INEQUALITY between states as well as constancy of the ink — three identical values satisfy 'the colour never changes' perfectly"
    - "a text-scan classifier exercised against both classes of input in the same test, so its expected set is a measurement rather than the only value it can return"
    - "a landmark census that asserts a retired landmark is ABSENT rather than dropping it from the list"

key-files:
  created:
    - src/components/editor/ToolRail.tsx
    - src/components/editor/ToolRailRow.tsx
    - src/components/editor/ToolPanel.tsx
    - src/components/editor/HudHeader.tsx
    - src/components/editor/HudFooter.tsx
    - src/components/editor/ThemeToggle.tsx
    - src/constants/tools.ts
    - tests/e2e/rail.spec.ts
  modified:
    - src/App.tsx
    - src/App.test.tsx
    - src/components/Controls.tsx
    - src/components/Controls.test.tsx
    - src/components/ColorPicker.tsx
    - src/components/ColorPicker.test.tsx
    - src/components/MapWorkspace.tsx
    - src/components/MapWorkspace.test.tsx
    - src/components/ErrorBoundary.test.tsx
    - src/components/editor/MapEditor.test.tsx
    - src/constants/config.ts
    - src/hooks/useLocalStorage.ts
    - src/types/ui.ts
    - src/utils/storage.ts
    - src/utils/storage.test.ts
    - src/styles/editor.css
    - src/styles/App.css
    - src/styles/Controls.css
    - src/styles/uiContract.test.ts
    - src/styles/themeTokens.test.ts
    - tests/e2e/support/appHarness.ts
    - tests/e2e/phase2-composition.spec.ts
    - tests/e2e/final-integration.spec.ts
    - tests/e2e/history.spec.ts
    - tests/e2e/persistence.spec.ts
    - tests/e2e/transactions.spec.ts
    - tests/e2e/shell.spec.ts
    - tests/e2e/responsive.spec.ts
    - .planning/coding-rules/frontend.md
    - .planning/coding-rules/storage.md
    - .planning/phases/03-clean-ui-overhaul-1-1-5-weeks/deferred-items.md
  deleted:
    - src/components/AppHeader.tsx

key-decisions:
  - "Rail rows are 48px, not Themely's 36px. The 48px minimum-target rule is a LANDED gate in `uiContract.test.ts`, and the rail is the app's only icon-only control strip — honouring a desktop-sidebar utility would have meant weakening an accessibility gate on the surface where the target matters most. This is the difference between translating a recipe and copying one (P-5)"
  - "Nothing in the rail is a scroll container. Every row is icon-only and carries a tooltip that must escape the 48px column; `overflow-y: auto` computes `overflow-x: auto` and clips it. The cost is measured (a viewport under ~436px tall overflows) and recorded as deferred item D-5 for `03-09`"
  - "The panel track IS the `main` landmark. The panel BODY unmounts whenever no tool is open (D-18 opens a first run closed), so a landmark inside the body would come and go with the open tool. Empty is fine; absent is not"
  - "`AppHeader` is retired as a container: the product `h1` and tagline become a visually hidden block in the HUD header (the document keeps exactly one `h1`), and `Show Help` travels with the onboarding card into the CANVAS region — a first run opens with the panel closed, so onboarding parked in the panel would be hidden behind a panel the creator has not opened"
  - "`Controls` gains `rail` and keeps `app-bar` and `strip` declared but unmounted. The rail is present at every width, so one instance carries the one filled action at every width; deleting a rendering path is `03-09`'s call when it rewrites the responsive layout"
  - "`getThemeMode` returns `EditorThemeMode | null` and does NOT apply the `light` default. The adapter is a storage boundary, not a policy engine, and baking the default in would make `MapEditor`'s `initialThemeMode` prop dead code for every host that mounts with storage available"
  - "`closed` is a real stored value for the last-open tool, distinct from an absent key: a creator who closed the panel and reloaded must get it back closed, and 'absent' already means 'never chose'"
  - "Preference reads deliberately bypass `recordResult` in `useLocalStorage`, so a blocked backend cannot set the storage error that disables persistence and raises a toast. The theme and the panel are cosmetic"

requirements-completed: [D-05, D-12, D-13, D-16, D-17, D-18, D-29, D-30, A-15, A-27]
---

# Phase 3 Plan 06: The Tool Rail Summary

The rail is the phase's signature surface and it is built: a 56px icon strip that is always
present, four tool rows that open exactly one 280px panel at a time, a pinned identity header, a
pinned Export, and a theme toggle that actually flips `.dark` and remembers it. `AppHeader` is
retired, the inspector's flat stack is gone, and every control it held now lives in the tool that
owns it.

**Three of the ways this could have quietly regressed had already happened in this repository.**
None of them recurred: there is still exactly one roving-tabindex writer (gated, RED-proven), the
accent is still keyed on a role class rather than on a position, and `Controls` gained a variant
instead of a copy — with a gate that fails if a second file ever renders the filled role class.

**A fourth one was caught by a test written for it.** `.tool-rail__row:hover` outranks
`.tool-rail__row[aria-expanded="true"]`, so hovering the OPEN tool repainted it from Powder back to
Porcelain — the active row losing its only state signal under the pointer, with everything still
working. The e2e that found it compares the three states for *inequality* as well as asserting the
ink is constant, because three identical backgrounds satisfy "the colour never changes" perfectly.

---

## What the rail actually is

```
.map-editor  [data-panel-open]  [.dark]          ← mount root, one writer of each
├── .tool-rail                 56px              data-editor-only
│   ├── .tool-rail__header     64px, pinned      D-12 chip · name · Saved/Unsaved pill
│   │                                            + the visually hidden product h1
│   ├── .tool-rail__tools      the only unpinned block
│   │     colors · countries · legend · saved    aria-expanded + aria-controls
│   │     undo · redo                            no aria-expanded; they expand nothing
│   └── .tool-rail__footer     112px, pinned     D-13 Export (the one fill) · D-30 toggle
├── main.tool-panel  0 | 280px                   THE `main` LANDMARK — always mounted
│   └── .tool-panel__body                        unmounted when closed; the one scroll container
│         .tool-panel__title-row  sticky         `Close <Tool>`
│         .tool-panel__content                   one tool at a time
└── section.map-workspace  1fr
      .composition-bar · svg.map-canvas · .map-frame · MapNavigation · .editor-help
```

The header and footer are **siblings** of the tools rather than children of them, which is what
makes "identity and Export never scroll away" structural instead of a styling promise. Both widen
over the panel track when a tool is open (56px → 336px) and `.tool-panel__body` reserves their
fixed heights at both ends — heights that deliberately do **not** change with the panel state,
because a reservation that moves is wrong for one frame of every toggle.

---

## RED probes (4 required, 4 executed, plus one extra)

Immutable Safety Constraint 10: *a gate must be able to fail on the bug it covers.* Every probe used
the scratchpad copy-and-restore protocol. **`git checkout --` was not run at any point in this plan,
on any file.** Every restore is confirmed by a SHA-256 match against the pre-probe value and by an
empty `git status` on the file.

### Probe 1 — the absent last-open-tool key defaults to open instead of closed (D-18)

**Break:** `getLastOpenTool` returns `'colors'` for an absent key instead of `null`.

```
 FAIL  src/utils/storage.test.ts > the last-open-tool preference (D-18) > resolves an ABSENT key to closed
AssertionError: expected { ok: true, value: 'colors', …(1) } to deeply equal { ok: true, value: null, warnings: [] }

  {
    "ok": true,
-   "value": null,
+   "value": "colors",
    "warnings": [],
  }
```

**Restore:** `cp "$SP/storage.ts.pre" src/utils/storage.ts`. SHA-256 before and after:
`10a55ac8fc51b59d04dc7b04528cbb274e808c157f002fbe6de48a46a2391fb5`, byte-identical. Re-run: 42
passed.

### Probe 2 — a second roving-tabindex writer, in the rail (assertion 27)

**Break:** `tabIndex={isExpanded === true ? 0 : -1}` on `ToolRailRow`'s button — a roving group over
six near-identical icon rows, which is exactly how this would arrive in real life.

```
 FAIL  src/styles/uiContract.test.ts > Phase 3 one roving-tabindex writer (assertion 27) > has exactly one, and it is the map canvas
AssertionError: a second production file computes a tabindex per element. The rail rows are
plain tab stops; a roving group there is the regression commit 074173e fixed.: expected
[ 'components/MapCanvas.tsx', …(1) ] to strictly equal [ 'components/MapCanvas.tsx' ]

  [
    "components/MapCanvas.tsx",
+   "components/editor/ToolRailRow.tsx",
  ]
```

**Restore:** copied back. SHA-256 `6cd33feceaa38c27b5050c874deaf206e84ac2bf92bf0c417c1eea612eb068e4`,
byte-identical.

### Probe 3 — a second `Reset All Colors` in the Colors panel (assertion 15, rail half)

**Break:** a second `<ResetColorsAction>` rendered beside the first.

```
Error: expect(locator).toHaveCount(expected) failed
Expected: 1
Received: 2
  > 219 |     ).toHaveCount(1);
  [chrome] › rail.spec.ts › assertion 15: one Reset View, one Reset All Colors, one filled action
  1 failed
```

**Restore:** copied back. SHA-256 `ca762d0dbce5a0a82d3c2275c4c791f1859cc23614ce5d869e2f5ab85527615a`.

### Probe 4 — the focus order, against the arrangement it replaces

The plan requires *"a RED probe against the arrangement it replaced"* for every focus-order claim.
**Break:** the HUD footer rendered before the tools in `ToolRail.tsx` — the app-bar-first order the
rail replaces.

```
Error: expect(received).toEqual(expected) // deep equality

  Array [
+   "Export PNG",
+   "Switch to dark theme",
      "Colors",
      "Countries",
      "Legend",
      "Saved Maps",
-   "Export PNG",
-   "Switch to dark theme",
  ]
```

**Restore:** copied back. SHA-256 `4438ee1b8b116e06631b977283613df996346178997e36c339fbfe7fc27f776d`.

### Probe 5 (extra) — an OS colour-scheme read in a production module (assertion 1, TS half)

Not required by the plan. Run because `03-06` is the plan that puts the theme in React state, which
makes a one-line `matchMedia('(prefers-color-scheme: dark)')` in a hook the cheapest way to
reintroduce the defect — and it is invisible to the stylesheet scan that already existed.

**Break:** a `prefersDarkScheme()` helper added to `src/utils/motion.ts`, beside the
reduced-motion helper that legitimately lives there.

```
 FAIL  src/styles/uiContract.test.ts > Phase 3 dark mode is a class, not a preference (assertion 1) > reads no operating-system colour preference in any production module
AssertionError: D-30: the theme is an explicit creator choice persisted through the storage
adapter, and light is the absent-key default. An OS query here is a second writer no control
and no host can override.: expected [ 'utils/motion.ts' ] to strictly equal []
```

**Restore:** copied back. SHA-256
`d063f3d9609f76bdff5fba047e4b5c1203a3ea7cefdcaf0c6c88024b1c70b725`.

---

## New copy strings — and the confirmation that none of them reaches `onStatusMessage`

| String | Where |
|---|---|
| `Colors` · `Countries` · `Legend` · `Saved Maps` | rail row `aria-label`, its tooltip, and the panel title |
| `Close Colors` / `Close Countries` / `Close Legend` / `Close Saved Maps` | the panel's ghost close control |
| `Switch to dark theme` / `Switch to light theme` | the theme toggle's accessible name; `aria-pressed` carries the mode |
| `Saved` / `Unsaved changes` | the HUD pill — two states, and there is no third |
| `Apply Color` | the Colors panel's submit (replaces `Apply Custom Color`) |

**Every one is a static control label, a heading, or a pill. None is passed to `onStatusMessage`,
`showStatus`, or `showError`.** `ToastRegion`'s allowlist is byte-unchanged and its positive-test
count is unchanged at **14 passing tests** (`npx vitest run src/components/ToastRegion.test.tsx`),
which is the gate the copy contract asks for: if the allowlist had grown, a message would have been
introduced without a test.

The `Saved` / `Unsaved changes` pill is driven by the composition root's existing dirty flag. On a
fresh map it reads `Saved`, which is the honest reading of "no unsaved changes" rather than a claim
that a stored record exists — recorded because it is a judgement call, not an obvious one.

---

## What shipped, per task

### Task 1 — the rail, the panel, and the colours tool end to end (commit `ce752d4`)

`ToolRailRow` is the translation of Themely's `PrimaryNavRow`: instant background-only state,
constant `--themely-nav-ink` across inactive / hover / active, the glyph animation triggered from
**row** hover through the imperative handle (`startAnimation()` reduced-motion-gated,
`stopAnimation()` unconditional), 20px glyphs through the `size` prop, and a plain tab stop.

`ToolPanel` owns one-at-a-time, the sticky title row inside the one scroll container, and `Escape`
→ close → focus back to the row that opened it. `App` keeps the single `data-panel-open` writer and
gains a `toolRowsRef` so the focus return goes to the *opening* row rather than to wherever focus
happened to be.

**The three relocations this forced**, all of them "a control whose new home is not built stays
rendered" (T-03-20) resolved rather than deferred:

| Control | New home | Why |
|---|---|---|
| Product `h1` + tagline | HUD header, visually hidden | the shell has no product-identity surface; the document still needs exactly one `h1` |
| `Show Help` | canvas region, beside the onboarding card | it is the control that brings that card back; separating them makes one unreachable |
| Onboarding banner | canvas region (`MapWorkspace.helpSlot`) | D-18 opens a first run CLOSED — onboarding in the panel would be hidden behind a panel the creator has not opened |

### Task 2 — the theme toggle (commit `b461f4f`)

`themeMode` is React state, seeded from the boundary prop, and the only writer of `.dark` on the
mount root. The toggle is neutral by contract (D-05 spends the rail's one accent on Export) and its
accessible name states the **destination**.

`Controls.test.tsx` grew four assertions: the declared variant set is exactly `rail | app-bar |
strip`; no second production file renders the filled role class; the rail variant carries the
primary action **alone**; and the fill is `--accent-fill`, not the flipping accent.

**The one-implementation gate fired on prose during authoring** — `App.tsx`'s comment named the
role class while explaining why only one component may render it — and **the comment was reworded,
not the gate loosened**. That is the third recorded instance of this discipline (`03-03`, `03-05`,
now here), and the gate carries a note saying so.

### Task 3 — the two persisted preferences (commit `84d8eab`)

Four adapter methods, two constants, and ten new storage tests. The bound is applied to the **raw
string before the value is interpreted at all**; neither key is ever `JSON.parse`d, which is
precisely why the rule needed restating rather than assuming.

```
ONE_STORAGE_SITE_OK        (exactly src/utils/storage.ts)
$ npx vitest run src/utils/storage.test.ts        -> 42 passed
$ npx vitest run src/components/ToastRegion.test.tsx -> 14 passed (unchanged)
```

### Task 4 — the colours panel and the two assertions (commit `1332c79`)

The preset grid keeps its derived tracks and gains the SPEC treatment: 48px Platinum tiles, a 24px
swatch with the mode-invariant `--swatch-border`, instant hover, `--themely-powder` when selected,
and a 16px `check` glyph at the trailing-top corner **on the tile background**. `Apply Color` is the
panel's one accent surface, filled from `--accent-fill` for the same AA reason Export is.

`rail.spec.ts` lands 10 tests and imports every fixture from `support/appHarness.ts`.

---

## Deviations from plan

### [Rule 2 — Correctness] Rail rows are 48px, not the SPEC's 36px

The plan's Task 1A translates Themely's `h-9` to `block-size: 36px`. `uiContract.test.ts` also
asserts that **no control declares a `min-height` below 48px**, and the global `button` rule sets
`min-height: var(--space-2xl)` — so a 36px row required *overriding* that floor on the app's only
icon-only control strip. Two landed contracts pointed opposite ways and the accessibility one won.
The rail is 56px wide with `--space-xs` padding, so its content column is 48px and the rows are
square, which is the right shape for an icon strip anyway. Recorded in `frontend.md` as a
translation rather than a copy — the P-5 distinction the plan itself raises.

### [Rule 2 — Correctness] `.tool-rail__tools` stopped being a scroll container

`03-03` authored `overflow-y: auto` there. Every rail row is icon-only and carries a tooltip that
has to escape the 48px column, and `overflow-y: auto` computes `overflow-x: auto` and clips it. An
icon-only rail with no tooltips is unusable, so the tooltip won and the cost was **measured**
(≈436px of height needed) rather than estimated. Filed as deferred item **D-5**, owner `03-09`.

### [Rule 2 — Correctness] The panel track became the `main` landmark

The plan does not say where the landmark goes. Left inside the panel body — where `03-05` had it —
it would have unmounted with the panel, so a first run (closed, per D-18) would have had **no `main`
at all**, and `ErrorBoundary.test.tsx`'s boundary assertion would have passed vacuously against
markup that contained neither the boundary's subject nor the landmark. The landmark and the tool
content's error boundary both moved outward: the boundary now wraps the whole `ToolPanel`, the
`main` is the panel track, and the `workspace--desktop` / `--compact` hooks `03-09` keys on ride on
it.

### [Rule 3 — Blocking] `files_modified` omits fourteen files the change requires

The plan lists seventeen. Also created or modified: `src/constants/tools.ts`, `src/types/ui.ts`,
`src/hooks/useLocalStorage.ts`, `src/components/MapWorkspace.tsx` (+ its test),
`src/components/ErrorBoundary.test.tsx`, `src/components/editor/MapEditor.test.tsx`,
`src/App.test.tsx`, `src/styles/App.css`, `src/styles/themeTokens.test.ts`, six existing e2e specs,
`tests/e2e/support/appHarness.ts`, and the three planning files this plan is required to update.
`src/components/AppHeader.tsx` was **deleted**. All are listed in `key-files`.

### [Rule 1 — Bug] Six e2e specs were made red by the migration and repaired here

Every real-app spec reaches for a control that now lives behind a rail row. `openRailTool` and
`legendDisclosure` were added to the shared harness and imported — **not re-declared per file**,
because two specs already carry duplicated camera helpers as a recorded pending todo and this would
have been the third. `getByRole('button', { name: /^Legend/ })` now matches two controls (the rail
row and the disclosure), so every caller **scopes** rather than taking `.first()`: an ordinal there
starts clicking the rail row the moment the rail's order changes.

`phase2-composition.spec.ts`'s inspector-state test could not survive as written — its four drafts
live in three different tools that are never mounted together. It was rewritten to fill each draft
in its own tool and then cycle tools *and* cross 1200px, which exercises the same
`useInspectorUiState` invariant **one unmount at a time** rather than four at once. Strictly
stronger, and it is the reason the hoisted state exists.

### [Rule 1 — Bug] Four `responsive.spec.ts` tests were made red and repaired; the list is back to 12

`03-06` briefly took `responsive.spec.ts` from 12 red to 16. All four extras were red for a reason
`03-06` introduced, not one `03-09` owns, so they were repaired here under the rule `03-04` and
`03-05` both applied. `expectLandmarks` now asserts the `banner` and `complementary` landmarks are
**absent** rather than dropping them from the census — "the banner is gone" has to keep failing if
one comes back. Itemised in `deferred-items.md` § D-1.

### [Rule 1 — Bug] Three window stubs were incomplete and threw inside the renderer

`App.test.tsx`, `ErrorBoundary.test.tsx`, and `MapEditor.test.tsx` stub `window` with a partial
object. The rail's vendored icons are `motion/react` components and framer's projection node
attaches a resize listener to `window` as it mounts, so the render threw — which would have read as
a defect in `App` rather than as a gap in the stub. Two no-ops added to each, with the reason
inline.

### [Rule 1 — Bug] `:hover` outranked the active-state rule

Found by this plan's own e2e. `.tool-rail__row:hover` (0,3,0) beats
`.tool-rail__row[aria-expanded="true"]` (0,2,0), so hovering the open tool repainted it from Powder
back to Porcelain. Landed as an exclusion: `.tool-rail__row:not([aria-expanded="true"]):hover`.

### [Rule 2 — Correctness] `getThemeMode` returns `EditorThemeMode | null`

The plan says *"an unrecognised theme value resolves to light"*. Implemented literally — the adapter
returning `'light'` for an absent key — `MapEditor`'s `initialThemeMode` prop becomes **dead code**
for every host that mounts the editor with storage available, because storage always answers. The
adapter now reports "no stored choice" and the default is applied one layer up, at
`DEFAULT_EDITOR_CONFIG.initialThemeMode = 'light'`. Every requirement the plan states still holds:
absent ⇒ light for the standalone app, unrecognised ⇒ light plus a `corrupt-data` warning, and no
operating-system preference on any path. Recorded in `storage.md`.

### [Scope — recorded, not fixed] `Close Saved Maps` is now three controls sharing one name

Filed as deferred item **D-4**, owner `03-07`. Both strings are approved copy, so renaming either is
a copy decision rather than an implementation detail. The dialog is modal and every e2e locator that
reaches a dialog close is scoped to `.save-load-dialog`; `03-07` closes the collision when the
dialog's contents move into the panel.

---

## Verification

```
$ npm run lint              -> clean
$ npm test                  -> Test Files 42 passed (42) · Tests 606 passed (606)
$ npm run build             -> tsc -b clean; built in 93ms
$ npm run data:world:check  -> World GeoJSON check passed: 248 units, 195 selectable core states

$ npx vitest run src/utils/storage.test.ts          -> 42 passed
$ npx vitest run src/components/Controls.test.tsx   -> 14 passed
$ npx vitest run src/styles/uiContract.test.ts      -> 44 passed
$ npx vitest run src/components/ToastRegion.test.tsx-> 14 passed (unchanged by this plan)

$ npx playwright test tests/e2e/rail.spec.ts --project=chrome   -> 10 passed
$ npx playwright test tests/e2e/export.spec.ts --project=chrome ->  9 passed
$ npx playwright test --project=chrome
                            -> 77 passed, 12 failed  (all responsive.spec.ts, itemised and owned)
```

Plan gates, run as specified except where noted:

```
INSTANT_HOVER_OK           (7 `.tool-rail__row` rules matched; none transitions a background)
ONE_STORAGE_SITE_OK        (exactly src/utils/storage.ts)
HARNESS_IMPORTED           (rail.spec.ts imports support/appHarness)
EXPORT_TS_UNTOUCHED        (git diff --stat 5c556b5..HEAD -- src/utils/export.ts is empty)
grep -c msedge tests/e2e/rail.spec.ts -> 0
LAST_UPDATED_OK 2          (frontend.md, storage.md each at exactly 2)
```

**Two of the plan's verify scripts are scoped to production source, and that is a deviation worth
naming.** As written they scan all of `src/` including tests:

- `grep -rn "prefers-color-scheme" src/` now matches `App.test.tsx`, which **asserts** the absence.
- `grep -rn "documentElement" src/` has matched `config/editorConfig.test.ts:282` since `03-05`
  landed the host-page-root gate there, so the script as written has never passed in this
  repository. `03-05`'s own SUMMARY used the narrower `documentElement.classList` form.

Run against production source, both are clean:

```
$ grep -rn 'prefers-color-scheme' src --include='*.ts' --include='*.tsx' | grep -v '\.test\.'
NO_OS_SCHEME_READ
$ grep -rn 'documentElement' src/ | grep -v '\.test\.'
MOUNT_ROOT_ONLY
```

The rule itself was **strengthened rather than narrowed**: assertion 1 now has a production-source
half in `uiContract.test.ts` that scans every non-test `.ts` and `.tsx` under `src/`, and it is
RED-proven (Probe 5). A grep in a plan is a one-time check; a gate in the suite fails every time.

**Test counts.** Unit: 584 → **606** (+22, all new; no existing test deleted, skipped, or weakened).
Chrome e2e: 79 → **89** (`rail.spec.ts` adds 10). Passing e2e: 67 → **77**.

**Chrome 151.0.7922.75 is the only browser with evidence.** Edge is **not installed on this
machine** (D-33) — verified again this session — and no Edge result is reported. Firefox, Safari,
and previous-version certification have never been run here and are not claimed.

---

## Threat Flags

None new. The plan's six threats were all exercised:

| Threat ID | Disposition | Evidence |
|---|---|---|
| T-03-21 (a raw `localStorage` write for the new keys) | mitigated | Both keys cross `StorageAdapter`; the one-site gate re-run and green; the `ONBOARDING_DISMISSED_KEY` precedent followed rather than widening the composition record, asserted by a test that lists the written keys |
| T-03-22 (a poisoned or oversized stored preference) | mitigated | `MAX_PREFERENCE_VALUE_LENGTH` checked on the raw string before interpretation; unrecognised id ⇒ closed, unrecognised theme ⇒ no stored choice ⇒ light; both raise `corrupt-data` and neither produces a creator-facing message. RED-proven by Probe 1 |
| T-03-23 (an unbounded string reaching a creator surface) | accepted, and the risk did not materialise | No new toast, status, or live-region message. `ToastRegion`'s positive-test count is unchanged at 14 |
| T-03-24 (a focus-order test documenting a deviation) | mitigated | `rail.spec.ts` asserts the SPEC'D order including the controls whose disabled state removes them, both before and after colouring; RED-proven against the arrangement it replaced (Probe 4) |
| T-03-25 (a second roving-tabindex writer) | mitigated | Assertion 27, asserted as a file SET with its classifier exercised both ways in the same test; rail rows are plain tab stops. RED-proven by Probe 2 |
| T-03-26 (the custom hex field) | mitigated | `normalizeColor` path unchanged; `aria-invalid` + `aria-describedby` wiring unchanged; only the submit's label and role class moved |

---

## Known Stubs

| Stub | File | Why it is intentional | Resolved by |
|---|---|---|---|
| The `saved` panel holds the button that opens the Save/Load dialog rather than the save form and the list | `src/App.tsx` (`savedMapsControls`) | The plan assigns the `saved`, `countries`, and `legend` panel CONTENTS to `03-07`; this plan builds the rail rows and the panel shell for all four and wires `colors` fully. Deleting the control before its new home exists is T-03-20 | `03-07` |
| `Controls` variants `app-bar` and `strip` are declared, tested, and unmounted | `src/components/Controls.tsx` | The rail is present at every width, so one instance covers every width. `03-09` owns the responsive rewrite and the D-20 bottom sheet, and deleting a rendering path it may need is its call, not this plan's | `03-09` |
| `.workspace__actions` / `.controls--app-bar` CSS remains for those two variants | `src/styles/Controls.css` | Same reason: the styling belongs to the variants, and retiring both together is one decision | `03-09` |
| `snapshotScene.ts` still resolves the default snapshot manifest URL | `src/utils/snapshotScene.ts` | Carried unchanged from `03-05`. Reached only by a historical snapshot, and none is reachable while the approved catalog holds exactly `Modern` | a plan that makes an approved historical snapshot reachable, which requires the approval chain first |

No file created or modified by this plan renders a hardcoded empty value, a placeholder string, or
an unwired data source. `ThemeToggle` and both storage keys were wired in the same plan that
introduced them, for exactly that reason.

---

## Carry-forward for later plans

- **`03-07`:** the `saved`, `countries`, and `legend` panels are shells with their existing controls
  moved in unrestyled — they are yours to restyle per UI-SPEC 7 and 8. `TOOL_DEFINITIONS` in
  `src/constants/tools.ts` is the one ordered inventory; the rail, the panel title, and the stored-
  preference validator all read it, so adding or renaming a tool is one edit. **Deferred item D-4 is
  yours**: three controls currently share the accessible name `Close Saved Maps`, and migrating the
  dialog into the panel is what removes one of them. Assertion 15 is half-landed — complete it once
  the remaining panels are migrated.
- **`03-08`:** the camera cluster is untouched and still in `navigationSlot`, still outside the
  canonical SVG. `.editor-help` is new in the canvas region at bottom-inline-start; the cluster is at
  bottom-inline-end, so check the two do not collide when you re-anchor to the letterbox gutter.
- **`03-09`:** `deferred-items.md` § D-1 is still **12**, re-measured against 89 tests. Two of those
  rows are now claims about surfaces that no longer exist (`the desktop app bar carries the global
  actions`, `the desktop focus order runs bar, composition bar, map, navigation, inspector`) and
  their replacements are already landed in `rail.spec.ts` — delete or rewrite the originals rather
  than repairing them. **Deferred item D-5 is yours**: the rail has no scroll container and a
  viewport under ~436px tall overflows. `expectLandmarks` now asserts `banner` and `complementary`
  are absent. `Controls`' `app-bar` and `strip` variants and their CSS are yours to keep or replace.
  CF-6 (re-arming assertion 24 against `.dark`) is unblocked: the toggle exists, `data-theme-toggle`
  is a stable hook, and `rail.spec.ts` already proves the round trip.
- **`03-10`:** the onboarding banner and `Show Help` are in the canvas region as `.editor-help`,
  which is where UI-SPEC 10 puts the card — the treatment is yours. `App.css` is down to 112 lines.
  CF-7 (`--success` / `--warning`) is untouched.
- **`03-11`:** `src/utils/export.ts` is **byte-unchanged** by this plan. CF-2 is untouched.
- **Anyone writing an e2e:** `openRailTool` and `legendDisclosure` are in
  `tests/e2e/support/appHarness.ts`. Import them. Any control that lives in a tool needs its row
  opened first, and `/^Legend/` matches two controls — scope, never `.first()`.
- **Anyone touching the rail:** rows are plain tab stops. Assertion 27 asserts the roving-writer set
  is exactly `MapCanvas.tsx`, and adding an entry is a change to the contract, not a test fix.

---

## What is NOT done

- **No visual, touch, or screen-reader claim is made anywhere in this plan.** Every result here is a
  `node` assertion, a source scan, or a measured browser geometry or computed style. **PENDING: a
  human look at the rail, the flyout panel, the HUD header and footer, the restyled colour grid, and
  both theme modes.** Nobody has seen any of it. In particular the 336px header/footer overhang over
  the panel track, the tooltip placement, and the dark-mode rail are visual judgements an automated
  result may never substitute for (Immutable Safety Constraint 8).
- **PENDING: the physical touch-target check on the rail.** The 48px decision is defended by a gate
  and by measurement, not by a finger on a screen.
- **The owner authorization in force is a blanket, in-advance, sight-unseen PROCEED-authorization**,
  given before this session began. It is **not** a content review and **not** hash-bound. Nothing
  here was reviewed by the owner and no diff was inspected by them.
- **`Design.md` § 7 is still `[FOR REVIEW]`.** This plan added nothing to it.
- **`responsive.spec.ts` is red** — 12 tests, re-measured against the new denominator, itemised,
  owned by `03-09`. The hazard `03-03` stated still stands: a suite that is red for several plans
  stops being read, and `03-12`'s full-gate evidence is not honest until it is clear.
- **Embedding is not authorized and was not approached.** No backend, auth, network call, deployment
  config, environment variable, or Themely import was added. `MapEditor.tsx` is byte-unchanged by
  this plan and its host-global allowed set is still **empty**. Storage is still reached through
  `useEditorConfig().createStorage()` and there is still exactly one production `localStorage` site.
- **Historical geometry is unchanged.** The approved catalog still holds exactly `Modern`; the
  1492 / 1700 / 1815 / 1914 packets remain **deferred for missing rights-cleared source material**.
  `SNAPSHOT_CATALOG` is byte-unchanged and nothing here makes a deferred snapshot nameable or
  reachable.
- **Chrome 151.0.7922.75 only.** Edge is not installed (D-33); Firefox, Safari, and previous-version
  certification have never been run here and are not claimed.
- **`.planning/STATE.md` and `.planning/ROADMAP.md` are UNTOUCHED.** Neither `state.advance-plan`,
  `state.update-progress`, nor `roadmap.update-plan-progress` was run.

---

## Commits

| Hash | Message |
|---|---|
| `ce752d4` | `feat(3-06): build the tool rail, the one flyout panel, and the colours tool` |
| `b461f4f` | `feat(3-06): add the neutral theme toggle and gate the one-Controls rule` |
| `84d8eab` | `feat(3-06): persist the last-open tool and the theme through StorageAdapter` |
| `1332c79` | `feat(3-06): restyle the colours tools and gate assertions 15 and 27` |

---

## Self-Check: PASSED

| Claim | Check |
|---|---|
| `src/components/editor/ToolRail.tsx` | FOUND, SHA `4438ee1b…f776d` matches the pre-probe value |
| `src/components/editor/ToolRailRow.tsx` | FOUND, SHA `6cd33fec…68e4` matches the pre-probe value |
| `src/components/editor/ToolPanel.tsx` | FOUND |
| `src/components/editor/HudHeader.tsx` | FOUND |
| `src/components/editor/HudFooter.tsx` | FOUND |
| `src/components/editor/ThemeToggle.tsx` | FOUND |
| `src/constants/tools.ts` | FOUND |
| `tests/e2e/rail.spec.ts` | FOUND, 10 passed in Chrome, imports `support/appHarness` |
| `src/App.tsx` | FOUND, SHA `ca762d0d…615a` matches the pre-probe value |
| `src/utils/storage.ts` | FOUND, SHA `10a55ac8…1fb5` matches the pre-probe value |
| `src/utils/motion.ts` | FOUND, SHA `d063f3d9…b725` matches the pre-probe value |
| `src/components/AppHeader.tsx` | DELETED, and every control it held is rendered elsewhere |
| `src/utils/export.ts` | byte-unchanged by this plan |
| `src/components/editor/MapEditor.tsx` | byte-unchanged by this plan |
| `.planning/coding-rules/frontend.md` § The Tool Rail and its Panel | FOUND, 2 `Last updated` entries |
| `.planning/coding-rules/storage.md` § What `03-06` actually landed | FOUND, 2 `Last updated` entries |
| `deferred-items.md` re-measured after `03-06`, + D-4 and D-5 filed | FOUND, § D-1 still 12 |
| commits `ce752d4` `b461f4f` `84d8eab` `1332c79` | all FOUND in `git log` |
| `.planning/STATE.md`, `.planning/ROADMAP.md` | untouched — `git status --porcelain` empty on both |
| `git checkout --` usage | **none, on any file, at any point** |
