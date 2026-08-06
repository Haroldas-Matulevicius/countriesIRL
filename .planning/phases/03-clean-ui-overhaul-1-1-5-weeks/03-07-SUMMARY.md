---
phase: 03-clean-ui-overhaul-1-1-5-weeks
plan: 07
subsystem: editor-panels
tags: [period-hud, live-region, save-load-panel, nested-confirmation, approved-id-filter, legend-panel, countries-panel, red-probe, toast-allowlist, accent-budget]
status: complete

requires:
  - phase: 03-clean-ui-overhaul-1-1-5-weeks
    plan: 05
    provides: "the mountable boundary, the container retirements, and the ten-row relocation table this plan closes out"
  - phase: 03-clean-ui-overhaul-1-1-5-weeks
    plan: 06
    provides: "the rail, the one flyout panel, `TOOL_DEFINITIONS`, and the `saved`/`countries`/`legend` panel shells this plan fills"
provides:
  - "`src/components/editor/PeriodHud.tsx` — the `.period-hud` canvas-region surface: inert Modern-only pill from resolved manifest options, the byte-identical period status live region, `Reset View` (interim), and the visually hidden workspace-landmark label"
  - "the retirement of `src/components/CompositionBar.tsx` — D-11 complete; every container it held has a named owner"
  - "`SaveLoad` as the `saved` panel's content: no dialog, no opener, the nested-confirmation contract verbatim, and the approved-id filter on `getPeriodShortLabel` (OPEN ITEM 4)"
  - "the legend and countries panels restyled to the 280px column contract: card entry rows, weight-carried hierarchy, option pills, the 3×3 position grid with a Custom cell, the panel body as the single scroll container"
  - "assertions 13 (unit + source + e2e), 14 (markup string + resolve half), 15 (completion, per panel state), and 23 (allowlist pinned by hard numbers) — all RED-proven"
  - "`--destructive-fill` — a mode-invariant destructive fill following the `--accent-fill` precedent, with its namespace-allowlist entry"
  - "`coding-rules/frontend.md` § The Period HUD + § Tool-panel content styling; `storage.md` § What 03-07 actually landed; `data.md` § the approved-id filter"
affects: [03-08, 03-09, 03-10, 03-11, 03-12]

actuals:
  tokens: 45200
  tasks: 4
  commits: 7

tech-stack:
  added:
    - "a click-bearing visually hidden input (full-cover, opacity 0) for custom-styled radios — a 1px clipped input sits under its label, which intercepts the pointer events `.check()` and a real click aim at the input"
    - "an approved-id filter threaded as a prop from the one resolved catalog, so a presentation resolver and the period surface read the SAME approval source"
  patterns:
    - "an aria-describedby audit over the whole composed DOM: every id named by any `aria-describedby` must resolve to an element that exists"
    - "an allowlist pinned by SOURCE-entry counts as literals, with the entry-line classifier exercised against entries and non-entries in the same test"
    - "a singleton assertion evaluated in EVERY panel state, not only the default one — a control that exists twice only while its panel is open passes a default-state count"

key-files:
  created:
    - src/components/editor/PeriodHud.tsx
  modified:
    - src/App.tsx
    - src/App.test.tsx
    - src/components/SaveLoad.tsx
    - src/components/SaveLoad.test.tsx
    - src/components/LegendEditor.tsx
    - src/components/LegendEditor.test.tsx
    - src/components/CountryList.tsx (untouched in the end — its stack already fit; CSS only)
    - src/components/MapWorkspace.tsx
    - src/components/MapWorkspace.test.tsx
    - src/components/Controls.tsx
    - src/components/Controls.test.tsx
    - src/components/MapNavigation.test.tsx
    - src/styles/Controls.css
    - src/styles/MapCanvas.css
    - src/styles/editor.css
    - src/styles/theme.css
    - src/styles/themeTokens.test.ts
    - src/styles/uiContract.test.ts
    - tests/e2e/history.spec.ts
    - tests/e2e/persistence.spec.ts
    - tests/e2e/transactions.spec.ts
    - tests/e2e/phase2-composition.spec.ts
    - tests/e2e/final-integration.spec.ts
    - tests/e2e/navigation.spec.ts
    - tests/e2e/responsive.spec.ts
    - tests/e2e/fixtures/history.html
    - tests/e2e/fixtures/legend.html
    - .planning/coding-rules/frontend.md
    - .planning/coding-rules/storage.md
    - .planning/coding-rules/data.md
    - .planning/phases/03-clean-ui-overhaul-1-1-5-weeks/deferred-items.md
  deleted:
    - src/components/CompositionBar.tsx

key-decisions:
  - "`Reset View` lives in the PeriodHud as an INTERIM home: it travelled with the CompositionBar responsibilities this plan rehomes, it keeps assertion 15's singleton countable, and `03-08`'s plan already names the floating cluster as its final home"
  - "The select id `composition-bar-period` was kept byte-identical alongside the mandated status id: the e2e fixture's NFR3 diagnostics query it, and renaming it would have churned a diagnostic that measures the product"
  - "OPEN ITEM 4 decided as the UI-SPEC recommended: approved-id filter on the resolver, storage validator untouched — and an unapproved V2 record is NOT relabelled as a legacy map, because 'opens with modern borders' would be a false claim about a record that refuses to load"
  - "After a successful load the panel stays open and focus goes to the map — the dialog used to close itself; a panel is not modal and closing it for the creator would be the panel deciding what they do next"
  - "SaveLoad no longer grabs focus on mount: a dialog focused its name input because opening a modal moves focus by contract; opening a tool panel does not"
  - "`--destructive-fill` (#b42318, fixed both modes) fills the committed `Delete Map` step instead of the SPEC's `--themely-red` + on-accent, for the measured reason the repo already solved once with `--accent-fill`: white on the dark-mode red is 2.78:1"
  - "The dirty-load confirmation swaps in place of the ROW's actions, exactly like the delete confirmation — one inline confirmation shape instead of one inline and one modal"

requirements-completed: [D-11, D-14, D-15, A-13, A-14, A-15, A-23, OPEN-ITEM-3, OPEN-ITEM-4]
---

# Phase 3 Plan 07: Period HUD, Saved Maps, Legend and Countries Panels Summary

The migration is finished: the period surface and its live region live in a new `.period-hud` in
the canvas region, `CompositionBar` is deleted, the Save/Load dialog dissolved into the `saved`
panel with its confirmation contract intact, the legend and countries tools are restyled to the
280px column contract, and assertions 13, 14, 15, and 23 are landed and RED-proven. The approved
catalog still holds exactly `Modern`, and the one place a deferred snapshot id could surface a
label — a hand-crafted storage record — now resolves to no label at all.

**The defect class this plan existed to prevent did not ship.** The period control's
`aria-describedby` target kept its byte-identical id through the move, and the assertion that
guards it audits every `aria-describedby` in the composed DOM for an element that exists —
RED-proven by orphaning the reference, which no visual check catches.

---

## OPEN ITEM 4 — decision and reasoning (recorded here and in `data.md`)

**Decided: the approved-id filter is adopted on the saved-map short-label RESOLVER; the storage
validator is NOT changed.**

- **The fact** (verified in the UI-SPEC, pre-existing Phase 2 behaviour): `storage.ts` builds
  `SNAPSHOT_IDS` from all five `SNAPSHOT_CATALOG` entries and its record validator admits any id
  in that set, so a hand-crafted record carrying `"snapshotId": "1914"` validates, and the old
  `getPeriodShortLabel` then resolved it to `1914` on the row.
- **The change:** `getPeriodShortLabel(snapshotId, approvedPeriodIds)` resolves through the ids
  the approved manifest actually yields — `App` derives the set from `useSnapshotCatalog`'s
  resolved options, the same source `resolvePeriodOptions` reads — and returns `null` otherwise.
  The row renders **no period label**. Label text still comes only from the approved registry,
  never manifest text (T-02-40 intact).
- **Why not the validator:** changing `SNAPSHOT_IDS` alters which stored records are *admitted* —
  a data-layer behaviour change outside a chrome phase's scope. `git diff` over the whole plan
  shows `src/utils/storage.ts` byte-unchanged.
- **The false comment at the former `SaveLoad.tsx:127-131`** (*"the catalog is the only label
  source, therefore a stored record can never name a deferred period"*) is deleted; the new
  comment states the filter and its reason.
- **One deliberate divergence from the old behaviour:** an unapproved **V2** record is no longer
  relabelled with the legacy line. `Legacy map · Opens with modern borders and whole-world view`
  would be a false claim — loading such a record refuses with the period-unavailable message. The
  row keeps its real legend/view metadata and simply omits the period token.

RED-proven end to end: with the filter removed, the planted-`1914` e2e failed with
`Received string: "1914 · 1 legend entry · Custom view"` (see Probe 4).

---

## `02-22` action-order semantics — disposition, per semantic

The roadmap gate requires each `02-22` semantic to be preserved or superseded **in writing**:

| `02-22` semantic | Disposition |
|---|---|
| Action order `Undo → Redo → Save or Load Maps → Reset All Colors → Export PNG` (the UI-SPEC §8 compact row order) | **Superseded** — by `03-06`'s rail (tools, then Undo/Redo rows, then the footer's Export, pinned by `rail.spec.ts`'s focus-order test) and completed here: the `Save or Load Maps` **control is retired**, because opening the `saved` rail row IS opening Save/Load. The relative order Undo → Redo → Export survives translated into rail rows before the footer. The unmounted `app-bar`/`strip` variants keep the old order for `03-09`'s decision |
| Every action carries a stable `data-action` and role class; `Export PNG` the only `controls__action--primary`; `Reset All Colors` the only destructive | **Preserved and strengthened** — assertion 15 now counts the singletons in every panel state; the filled class still renders from exactly one component; the new confirm treatment (`saved-map-delete--confirm`) is a role class |
| No positional selector styles an interactive control | **Preserved** — assertion 16 is landed and green; every new rule here keys on a role class or data attribute (`data-entry-invalid`, `--position-cell--top-left`, …) |
| Native `disabled` + `aria-busy`; `Export PNG` ⇄ `Exporting PNG…` label swap; synchronous export activation lock | **Preserved** — untouched |
| The bounded status allowlist and its coverage tests | **Preserved** — byte-unchanged, and now pinned by assertion 23's hard numbers |

**The nested-confirmation contract survives the dialog's retirement verbatim** (it originates in
02-20/02-22-era SaveLoad work and was never about the modal): a confirmation renders as a
**sibling** of the surface it interrupts (the row's action group swaps in place); it carries its
own **`tabIndex={-1}`** (a mouse-down on the body text must not drop focus to `document.body`, or
the panel's keydown handler never fires and Escape dies); **`Escape` dismisses the innermost**
open confirmation, branching load-confirm then delete-confirm, and only an Escape that closes
nothing propagates to the tool panel's own close; **focus returns from an effect keyed by the
stable row key** (`name.length:name:timestamp`). All four properties are exercised by
`persistence.spec.ts` in the panel world, including the click-the-prompt-text case.

---

## RED probes (7 executed, with output)

Immutable Safety Constraint 10. Every probe used the scratchpad copy-and-restore protocol from
`coding-rules/general.md` § Git safety. **`git checkout --` was not run at any point in this
plan, on any file.** Every restore is confirmed by a SHA-256 match against the pre-probe value.

### Probe 1 — assertion 14, the live region deleted

**Break:** the `role="status"` region removed from `PeriodHud.tsx`.

```
 FAIL  src/App.test.tsx > App composition root > keeps the rehomed period live region resolvable from the control (assertion 14)
AssertionError: expected '<div class="map-editor" data-panel-op…' to contain
'id="composition-bar-period-status" role="status" aria-live="polite"'
```

Red on the exact-markup half. **Restore:** `cp "$SP/PeriodHud.tsx.pre" …`, SHA-256
`8ac3c18ff6c6f2e2266394c8c91b09580d5d331abaa7f4287f95f2fb5d7f2d32`, byte-identical.

### Probe 2 — assertion 14, the load-bearing half on its own subject

Probe 1 fails at the first `expect`, so the resolve half never executed — proving it requires a
break the markup-string half cannot see. **Break:** the pill's `aria-describedby` pointed at
`composition-bar-period-status-orphaned` with the region still rendered.

```
AssertionError: expected [ …(2) ] to include 'composition-bar-period-status'
 ❯ src/App.test.tsx:674:28
    674|     expect(describedByIds).toContain('composition-bar-period-status');
```

The resolve half failed **on its own assertion** while the markup-string half stayed green —
which is exactly the orphaned-description defect D-15 names. **Restore:** copied back, same SHA.

### Probe 3 — assertion 13, `SNAPSHOT_CATALOG` rendered in the period surface

**Break:** the pill's value mapped over the five-entry label registry.

```
 × never references the snapshot label registry
 × renders the period surface from resolved options only, scoped to the period HUD (assertion 13)
AssertionError: expected 'class="period-hud" data-editor-only="…' not to contain '1492 — Early modern Europe'
Received: "…<span class=\"period-hud__value\">Modern — current borders · 1492 — Early modern
Europe · 1700 — Post-Westphalia Europe · 1815 — Congress of Vienna · 1914 — Before World War I</span>…"
AssertionError: PeriodHud reads the five-entry label registry directly. …: expected true to be false
```

Both the scoped-markup half and the source-scan half went red. **Restore:** copied back, SHA
byte-identical.

### Probe 4 — OPEN ITEM 4, the approved-id filter removed against a planted `1914` record

**Break:** the `approvedPeriodIds.has` guard deleted from `getPeriodShortLabel`.

```
Error: expect(locator).not.toContainText(expected) failed
Locator: getByRole('listitem').filter({ hasText: 'Hand-crafted period map' }).locator('.saved-map-metadata')
Expected substring: not "1914"
Received string: "1914 · 1 legend entry · Custom view"
  1 failed  [chrome] › persistence.spec.ts › a stored record naming a deferred period renders no period label on its row
```

**Restore:** `cp "$SP/SaveLoad.tsx.pre" …`, SHA-256
`e0e9512f674bcbbeeb7ea0cde74f0f0944b63b159b300e233a8813aef6128afe`, byte-identical. Re-run: green.

### Probe 5 — assertion 15, a second filled action on a CONDITIONAL control (recorded honestly)

**Break:** `controls__action--primary` added to `Show Help` in `App.tsx`.

```
 × has no second implementation anywhere under src/
AssertionError: a second file renders the filled primary action. …: expected [ Array(2) ] to
strictly equal [ 'components/Controls.tsx' ]
```

The one-implementation source gate went red — but the composed-DOM count stayed green, because
`Show Help` is unmounted while onboarding is visible. **A probe against a conditionally rendered
control does not exercise the DOM half**, so a second probe was run rather than claiming this one
sufficed. **Restore:** SHA `37bd8b87e1cff3b184f752143014e2fec77f14d6cad0f654372fc4730649e775`.

### Probe 6 — assertion 15, a second filled action on an ALWAYS-rendered control

**Break:** `controls__action--primary` added to the PeriodHud's `Reset View`.

```
 × mounts exactly one Controls, and it is the rail footer carrying the only fill
 × puts a neutral theme toggle in the footer that names its destination
 × keeps Reset View, Reset All Colors, and the filled action singletons across every panel (assertion 15)
AssertionError: colors: the one filled action: expected 2 to be 1
```

Assertion 15 failed on its own subject in every panel state. **Restore:** copied back, SHA
`8ac3c18f…f2d32` byte-identical.

### Probe 7 — assertion 23, a status message introduced without a test

**Break:** `'Panel layout refreshed.',` added to `APPROVED_STATIC_MESSAGES`.

```
 × pins the allowlist entry counts as hard numbers
AssertionError: APPROVED_STATIC_MESSAGES grew or shrank. A new entry is a new creator-facing
message: it needs its own positive test, and this phase claims to introduce none.: expected 26 to be 25
```

**Restore:** `cp "$SP/ToastRegion.tsx.pre" …`, SHA-256
`ecd2a6fbeb8d7842ceff2ac4b4bc22cb014775596f22ea3d04b3c8e797d455e4`, byte-identical —
`git status` shows the file clean against HEAD.

---

## New copy strings — each identified as a label, not a message

| String | Where | Kind |
|---|---|---|
| `Save Map` | the `saved` panel's submit (replaces `Save Current Map` / `Replace Saved Map`; the overwrite notice carries the replace semantics) | control label |
| `Custom` | the position grid's centre cell (visually hidden radio label) | control label |
| `Replace the current map?` + the loading prompt + `Load Saved Map` / `Keep Editing` | the inline dirty-load confirmation | pre-existing copy, relocated verbatim |

**None reaches `onStatusMessage`, `showStatus`, or `showError`.** The `ToastRegion` allowlist is
byte-unchanged and assertion 23 pins it: **25** source entries in `APPROVED_STATIC_MESSAGES`,
**7** load-warning entries, **11** period announcements, **4** dynamic-pattern declarations, and
**14** positive tests in `ToastRegion.test.tsx` — all as literals.

**Two inline SaveLoad error strings were corrected, not added** (they render as inline
`role="alert"` text inside the panel and never cross `ToastRegion`): the save-failure retry now
says *"Try Save Map again."* (the control that exists), and the period-unavailable message drops
*"or close this window"* (there is no window). Retired with the dialog: the `Save or load maps`
heading, `Save Current Map`, `Replace Saved Map`, and two of the three `Close Saved Maps`.

---

## Relocated controls reachability cross-check (T-03-31, against 03-05's table)

Every control in `03-05`'s ten-row relocation table is reachable in the composed DOM:

| Control (03-05 row) | Where it is now | Evidence |
|---|---|---|
| Product `h1` + tagline | HUD header, visually hidden | `App.test`: exactly one `<h1>`, after `.tool-rail__header` |
| `Show Help` | canvas region, with the onboarding card | `App.test` onboarding test; `shell.spec` |
| Undo / Redo | rail rows | `App.test`: one `Undo Color Change`, one `Redo Color Change` |
| `Save or Load Maps` (desktop) | **superseded in writing**: the `saved` rail row IS Save/Load; the opener control is retired | `persistence.spec`: save form + rows reachable via `openRailTool` |
| `Export PNG` | rail footer, the one fill | `App.test`; `rail.spec` |
| compact strip variant | declared, unmounted — `03-09`'s call | `Controls.test` variant set |
| Selection panel · Color picker · `Reset All Colors` | `colors` panel | assertion 15 per-panel render; `rail.spec` |
| Legend disclosure + editor | `legend` panel | `persistence.spec` legend flow; per-panel render |
| Country list + Locate | `countries` panel | `history.spec` drops-selection flow; `locate.spec` |
| Onboarding banner | canvas region | `App.test` |
| Period selector · `Reset View` · period status live region | `PeriodHud`, canvas region | assertions 13/14/15; `history.spec` |
| Camera cluster | `navigationSlot`, unchanged | `navigation.spec`; `MapWorkspace.test` |

---

## What shipped, per task

### Task 1 (tracer) — the period surface and the rehomed live region (commit `b278ad6`)

`PeriodHud.tsx` renders the options `useSnapshotCatalog` resolves over the approved manifest —
currently exactly one, so the surface is a **visibly inert read-only pill** (`Map period` eyebrow
over `Modern — current borders`, Porcelain, hairline, `--radius-pill`, no dropdown affordance, no
chevron, no deferred-feature copy). The interactive `<select>` path stays reachable in code and is
proven by the five-option unit render and the routed-catalog e2e. Both ids are byte-identical to
Phase 2; the pill and the select both carry `aria-describedby` pointing at the status region.
`CompositionBar.tsx` is deleted; `MapWorkspace`'s slot renamed `periodHud` and its
`MAP_PREVIEW_LABEL_ID` import re-pointed; the e2e fixture drives `PeriodHud` through the same
props. Tracer verified end-to-end before expansion: `history.spec.ts` 11/11 plus the full unit
gate.

### Task 2 — Saved Maps in the panel (commits `d5b1f00`, and the copy in § OPEN ITEM 4)

The modal machinery — dialog role, modality attribute, overlay, focus trap, imperative `inert`,
opener button, `restoreSaveLoadFocus` and its two tests — retired **with** the dialog. Rows follow
UI-SPEC 8: Porcelain card, 32×32 Platinum chip with the vendored `map` glyph (whose own
provenance note already named this consumer), one-line ellipsised name, tabular meta, ghost
`Load This Map`, destructive `Delete Saved Map`, never one-shot. `Save Map` is the panel's one
Apple Blue. Empty state uses the compact dashed recipe with copy unchanged.

### Task 3 — legend and countries panels (commit `3d0c253`, interception fix `643623a`)

Entry rows are Porcelain cards with a 20×20/6px swatch, a transparent bottom-edge label input (no
inner hairline), the `aria-live="off"` counter turning `--destructive` at the limit, a red left
edge keyed on `data-entry-invalid`, and 44px icon-only reorder actions on their own row with
**unchanged accessible names** (keyboard arrows primary, drag the enhancement). Style controls
are Porcelain-card fieldsets with `--text-body-sm` weight-500 legends and option pills over
visually hidden radios; the position picker is the 3×3 grid with the four corners plus `Custom`,
announcing only existing approved strings. The `legend` panel carries no accent (the range
slider's `accent-color` went Slate Blue). The countries panel keeps the unfiltered 195-core
catalog with out-of-scene rows disabled, and the panel body is now the single scroll container —
the inspector-era inner scroll cap on the list is gone. The legend itself never moved: it is
still a canvas overlay inside the export-bearing composition, and `svg.map-canvas >
[data-layer="legend"]` is asserted in the persistence flow.

### Task 4 — assertions 15 and 23 (commit `47ac012`)

Assertion 15 renders the app **in each of the four panel states** (seeded through the stored
last-open-tool preference) and counts: one `Reset View` always, `Reset All Colors` exactly once
in the Colors panel and zero anywhere else, one `controls__action--primary` always, keyed on the
role class. Assertion 23 pins the allowlist as hard numbers (25 / 7 / 11 / 4 patterns / 14
positive tests) with the entry-line classifier exercised both ways.

---

## Deviations from plan

### [Rule 1 — Bug] The hidden option radios intercepted their own clicks (commit `643623a`)

The pills hid their radios with the 1px clip-path pattern; the label then intercepted the pointer
events `.check()` — and a real click — aims at the input, and three real-app e2e tests timed out
(`final-integration` legend-position, `phase2-composition` collapsed-legend, `transactions`
refusal-classes). The inputs are click-bearing now: full-cover, opacity 0. Caught by the full
Chrome gate, fixed and re-proven — the three tests pass and the full suite settled back to the
known 12.

### [Rule 1 — Bug] The legend fixture's bare `svg` rule inflated the new glyphs to 540px squares

`fixtures/legend.html` sized every `svg` to 540×540 for its canvas; the new inline reorder glyphs
matched it, rows grew to ~1700px tall, and the drag e2e failed. The rule is scoped to
`svg[data-legend-canvas='true']`.

### [Rule 2 — Correctness] `--destructive-fill` instead of the SPEC's filled `--themely-red`

White on `--themely-red` measures 3.19:1 light / 2.78:1 dark — below AA. The committed
`Delete Map` step fills from a new mode-invariant `--destructive-fill: #b42318` (white on it:
6.57:1 both modes), the same move the owner made for `--accent-fill`. The token-namespace
allowlist gate fired on the new name, exactly as designed, and the name was added to the closed
list deliberately with the measurement recorded (`themeTokens.test.ts`).

### [Rule 2 — Correctness] Slate Blue where the SPEC says ghost gray

UI-SPEC 7/8 put the counter and row meta in `--themely-ghost-gray`; the landed contrast gate
forbids painting text with that token (3.60:1 on dark Powder) and names `--themely-slate-blue` as
the tertiary-meta replacement. The gate won, as it did for 03-06's 48px rows.

### [Rule 2 — Correctness] Row padding `--space-sm`, not the SPEC's raw 12px

Application spacing comes from the token scale (a landed gate; 12px is not on it). The saved-map
row uses `--space-sm`/`--space-md`.

### [Rule 2 — Correctness] An unapproved V2 record is not relabelled as legacy

See § OPEN ITEM 4 — the legacy line would falsely claim the record opens with modern borders.
`SaveLoad.test.tsx`'s unknown-period expectation was updated accordingly.

### [Rule 2 — Correctness] Two inline SaveLoad error strings corrected for retired controls

`Try Save Current Map again.` → `Try Save Map again.`; `…or close this window.` dropped. Neither
crosses `ToastRegion`; the allowlist is untouched.

### [Rule 3 — Blocking] `files_modified` omits sixteen files the change requires

The plan lists fifteen. Also modified: `MapWorkspace.tsx` (+ its test — it imported
`MAP_PREVIEW_LABEL_ID` from the deleted file and named the slot), `Controls.tsx` /
`Controls.test.tsx` / `MapNavigation.test.tsx` / `navigation.spec.ts` (stale CompositionBar
comments), `theme.css` + `themeTokens.test.ts` (the destructive fill), `Controls.css` (all panel
styling lives there until 03-10 splits it), both e2e fixtures, `transactions.spec.ts`,
`phase2-composition.spec.ts`, `final-integration.spec.ts`, `responsive.spec.ts` (minimal opener
repair in a passing test), and `.planning/coding-rules/data.md` (the plan's own § E asks for it).
All listed in `key-files`. `LocateCountry.tsx` and `LegendDisclosure.tsx` are named in the plan
but needed no source change (CSS only); `CountryList.tsx` likewise.

### [Verify-script deviation] The raw-`legend.position` grep gate has never passed here

The plan's script (`grep -rn 'legend\.position' src …`) matches **8 pre-existing lines at the
plan's base commit** — every one a sanctioned pattern: the position passed INTO
`resolveLegendPosition` (the invariant's own entry point), `.preset` reads driving control state,
and the storage canonicalisation/copy paths. Run as written it fails before and after this plan.
The honest form is the baseline diff: this plan adds exactly **+2** matches, one resolver
argument (`setCustomPosition`) and one `.preset === null` control-state read (the Custom radio),
both duplicates of pre-existing sanctioned lines. Live Invariant 3's subject — render/export
position math goes through the resolvers — holds: `src/utils/legend.ts` is byte-unchanged and
the overlay/export still read through `resolveLegendRender`.

### [Scope — recorded] Three responsive-red rows now also reference retired Save/Load copy

The `03-09`-owned red list is unchanged at 12 (re-measured, denominator 90), but the two app-bar
rows and the responsive-focus-order row now cross the retired opener; `03-09` rewrites rather
than repairs them. Itemised in `deferred-items.md`.

---

## Verification

```
$ npm run lint              -> clean
$ npm test                  -> Test Files 42 passed (42) · Tests 615 passed (615)
$ npm run build             -> tsc -b clean; built in ~93ms
$ npm run data:world:check  -> World GeoJSON check passed: 248 units, 195 selectable core states

$ npx vitest run src/App.test.tsx                    -> 18 passed
$ npx vitest run src/styles/uiContract.test.ts       -> 51 passed
$ npx vitest run src/components/ToastRegion.test.tsx -> 14 passed (unchanged)
$ npx vitest run src/components/SaveLoad.test.tsx    -> 14 passed

$ npx playwright test tests/e2e/history.spec.ts --project=chrome      -> 11 passed
$ npx playwright test tests/e2e/persistence.spec.ts --project=chrome  ->  7 passed
$ npx playwright test tests/e2e/legend.spec.ts tests/e2e/locate.spec.ts --project=chrome -> 10 passed
$ npx playwright test tests/e2e/rail.spec.ts tests/e2e/persistence.spec.ts tests/e2e/history.spec.ts --project=chrome -> 28 passed
$ npx playwright test --project=chrome
      -> 78 passed, 12 failed (all responsive.spec.ts, the same 12, re-measured; denominator 89 -> 90)
```

Plan gates, run as specified except where § Deviations records otherwise:

```
PERIOD_HUD_OK               (no SNAPSHOT_CATALOG reference; status id carried)
COMPOSITION_BAR_RETIRED     (src/components/CompositionBar.tsx does not exist; nothing references it)
PUBLIC_DATA_UNTOUCHED       (git diff b22b6e6..HEAD -- public/data/ is empty)
MODAL_RETIRED               (no dialog role / modality attribute in SaveLoad.tsx)
VALIDATOR_UNTOUCHED         (src/utils/storage.ts byte-unchanged over the whole plan)
LEGEND_UTIL_UNTOUCHED       (src/utils/legend.ts byte-unchanged; the per-line table stays with 03-11)
EXPORT_TS_UNTOUCHED         (git diff --stat b22b6e6..HEAD -- src/utils/export.ts is empty)
SNAPSHOT_CATALOG            five entries, ids and labels byte-identical
LAST_UPDATED_OK 2           (frontend.md, storage.md, data.md each at exactly 2)
```

**Test counts.** Unit: 611 → **615** (+7 new, −2 retired with `restoreSaveLoadFocus`, −1 net
consolidation in SaveLoad metadata tests; no test weakened — the two deletions' subject no longer
exists). Chrome e2e: 89 → **90** (`persistence.spec.ts` adds the planted-`1914` row test).
Passing e2e: 77 → **78**.

**Chrome 151.0.7922.75 is the only browser with evidence.** Edge is **not installed** on this
machine (D-33) and no Edge result is reported. Firefox, Safari, and previous-version
certification have never been run here and are not claimed.

---

## Threat Flags

None new. The plan's six threats were all exercised:

| Threat ID | Disposition | Evidence |
|---|---|---|
| T-03-27 (a deferred snapshot nameable in the period surface) | mitigated | `PeriodHud` renders resolved options only; assertion 13 scoped to `.period-hud` in unit + e2e; the source scan forbids the registry; RED-proven (Probe 3) |
| T-03-28 (a stored record naming `1914` on a row) | mitigated | approved-id filter on the resolver, threaded from the one resolved catalog; validator deliberately unchanged and that boundary recorded; RED-proven (Probe 4) |
| T-03-29 (losing the control's accessible description) | mitigated | assertion 14's resolve half audits every `aria-describedby` in the composed DOM; RED-proven on its own subject (Probe 2) |
| T-03-30 (an unbounded string reaching a creator surface) | mitigated | allowlist byte-unchanged and pinned by hard numbers; RED-proven (Probe 7) |
| T-03-31 (a control lost between two plans) | mitigated | the reachability cross-check table above; assertion 15 in every panel state; RED-proven (Probes 5+6) |
| T-03-32 (legend content clipped by a raw position read) | mitigated | `legend.ts` byte-unchanged; +2 baseline-diff reads, both sanctioned patterns; the persistence flow asserts the legend inside `svg.map-canvas` before a real export |

---

## Known Stubs

| Stub | File | Why it is intentional | Resolved by |
|---|---|---|---|
| `Reset View` renders in the PeriodHud rather than the floating cluster | `src/components/editor/PeriodHud.tsx` | Interim home carried from CompositionBar so the singleton stays countable; `03-08`'s plan already names the cluster as its final home and re-verifies assertion 15 there | `03-08` |
| `Controls` variants `app-bar` / `strip` stay declared, tested, unmounted — and their `Save or Load Maps` opener now points at the saved tool | `src/components/Controls.tsx` | `03-09` owns the responsive rewrite and the D-20 bottom sheet; the opener callback opens the `saved` tool so the path stays honest if ever mounted | `03-09` |
| `snapshotScene.ts` still resolves the default snapshot manifest URL | `src/utils/snapshotScene.ts` | Carried unchanged from `03-05`/`03-06`; reached only by a historical snapshot, and none is reachable while the approved catalog holds exactly `Modern` | a plan that makes an approved historical snapshot reachable, via the approval chain |

No file created or modified by this plan renders a hardcoded empty value, a placeholder string,
or an unwired data source.

---

## Carry-forward for later plans

- **`03-08`:** `Reset View` is yours to move from `.period-hud` into the floating cluster —
  assertion 15 (unit, per-panel) and `history.spec`'s Reset View test both count it and must be
  re-pointed, and `rail.spec` asserts it inside `.map-workspace` (still true after your move).
  The period HUD owns the canvas region's **top-inline-start** corner; the cluster owns
  bottom-inline-end and `.editor-help` bottom-inline-start.
- **`03-09`:** the red list is still exactly **12**, re-measured against 90 tests; three rows now
  also cross retired Save/Load copy — rewrite, don't repair. D-5 (rail height) is unchanged by
  this plan. The `app-bar`/`strip` variants and their opener are yours to keep or retire.
- **`03-10`:** `Controls.css` gained the panel-content styling (SaveLoad, legend, countries,
  position grid) — it is all in the one file your split owns. `--success`/`--warning` (CF-7)
  untouched.
- **`03-11`:** `src/utils/export.ts` and `src/utils/legend.ts` are **byte-unchanged** by this
  plan; `LEGEND_CHARACTERS_PER_LINE` / `LABEL_CHARACTERS_PER_LINE` were not touched (D-25 is
  yours). CF-2 untouched.
- **Anyone styling a custom radio/checkbox:** hide the input with the full-cover opacity-0
  pattern, never a 1px clip — the clipped form makes the label intercept the input's own clicks.
- **Anyone writing a fixture:** scope element-type CSS (`svg { … }`) to the subject; the editor's
  components now carry inline SVG glyphs.

---

## What is NOT done

- **No visual, touch, or screen-reader claim is made anywhere in this plan.** Every result is a
  `node` assertion, a source scan, or a measured browser behaviour. **PENDING: a human look at
  the period pill, the saved panel with its inline confirmations, the legend pills and position
  grid, the countries panel at 195 rows, and both theme modes.** The plan's own by-hand check
  (`npm run dev`, confirm the pill reads `Modern — current borders` with no dropdown affordance)
  is a **visual judgement** and is PENDING with the rest — the automated equivalents (assertion
  13's three halves) are landed, but an automated result may never substitute for a physical
  check (Immutable Safety Constraint 8).
- **The owner authorization in force is a blanket, in-advance, sight-unseen
  PROCEED-authorization**, given before this session began. It is **not** a content review and
  **not** hash-bound. Nothing here was reviewed by the owner and no diff was inspected by them.
  The OPEN ITEM 4 decision was taken as the approved UI-SPEC's recorded recommendation, and the
  basis is documented in § OPEN ITEM 4.
- **Historical geometry is unchanged.** The approved catalog still holds exactly `Modern`; the
  1492 / 1700 / 1815 / 1914 packets remain **deferred for missing rights-cleared source
  material**. `SNAPSHOT_CATALOG` is byte-unchanged, `public/data/` is untouched, and this plan
  *narrowed* the ways a deferred snapshot can be named (the row resolver filter) while making
  none reachable.
- **`responsive.spec.ts` is red** — the same 12, re-measured at 78/90, itemised, owned by
  `03-09`. `03-12`'s full-gate evidence is not honest until it is clear.
- **Embedding is not authorized and was not approached.** No backend, auth, network call,
  deployment config, environment variable, or Themely import. `MapEditor.tsx` is byte-unchanged;
  its host-global allowed set is still empty; storage is still reached through
  `useEditorConfig().createStorage()` with exactly one production `localStorage` site.
- **Chrome 151.0.7922.75 only.** Edge is not installed (D-33); Firefox, Safari, and
  previous-version certification have never been run here and are not claimed.
- **`.planning/STATE.md` and `.planning/ROADMAP.md` are UNTOUCHED.** `git status --porcelain` on
  both is empty. Neither `state.advance-plan`, `state.update-progress`, nor
  `roadmap.update-plan-progress` was run.

---

## Commits

| Hash | Message |
|---|---|
| `b278ad6` | `feat(3-07): rehome the period surface and live region as PeriodHud, retire CompositionBar` |
| `d5b1f00` | `feat(3-07): dissolve the Save/Load dialog into the saved panel, filter the row resolver` |
| `3d0c253` | `feat(3-07): restyle the legend and countries panels to the 280px column contract` |
| `47ac012` | `test(3-07): complete assertion 15 and pin the toast allowlist as hard numbers` |
| `643623a` | `fix(3-07): make the hidden option radios click-bearing, not clipped` |
| `8ba7f67` | `docs(3-07): close deferred item D-4 and re-measure the responsive red list` |
| *(this commit)* | `docs(3-07): complete the panel-migration plan` |

---

## Self-Check: PASSED

| Claim | Check |
|---|---|
| `src/components/editor/PeriodHud.tsx` | FOUND, SHA `8ac3c18f…f2d32` matches the pre-probe value |
| `src/components/SaveLoad.tsx` | FOUND, SHA `e0e9512f…8afe` matches the pre-probe value |
| `src/App.tsx` | FOUND, SHA `37bd8b87…9775` matches the pre-probe value |
| `src/components/ToastRegion.tsx` | FOUND, SHA `ecd2a6fb…55e4` matches the pre-probe value, clean against HEAD |
| `src/components/CompositionBar.tsx` | DELETED; no live reference anywhere in `src/` or `tests/` (the one grep hit is PeriodHud's own history comment) |
| `src/components/LegendEditor.tsx` | FOUND |
| `.planning/coding-rules/{frontend,storage,data}.md` | FOUND, each at exactly 2 `Last updated` entries |
| `deferred-items.md` — D-4 closed, D-1 re-measured at 12/90 | FOUND |
| commits `b278ad6` `d5b1f00` `3d0c253` `47ac012` `643623a` `8ba7f67` | all FOUND in `git log` |
| unit slice | `App.test` 18 · `uiContract` 51 · `SaveLoad.test` 14 · `ToastRegion.test` 14 (measured, corrected in § Verification before commit) |
| `src/utils/{export,legend,storage}.ts`, `public/data/`, `SNAPSHOT_CATALOG` | byte-unchanged over the whole plan (`git diff b22b6e6..HEAD` empty for each) |
| `.planning/STATE.md`, `.planning/ROADMAP.md` | untouched — `git status --porcelain` empty on both; no gsd-sdk state verb was run |
| `git checkout --` usage | **none, on any file, at any point** |
