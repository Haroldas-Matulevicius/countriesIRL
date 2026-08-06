---
phase: 03-clean-ui-overhaul-1-1-5-weeks
plan: 08
subsystem: map-chrome
tags: [floating-cluster, letterbox-gutter, container-query, reset-view, tooltip, fixed-tokens, non-colourable-units, red-probe, assertion-12, ui-spec-defect]
status: complete

requires:
  - phase: 03-clean-ui-overhaul-1-1-5-weeks
    plan: 03
    provides: "`.map-frame` and the `container-type: size` canvas region whose `min(100cqw, 100cqh)` this plan's placement shares"
  - phase: 03-clean-ui-overhaul-1-1-5-weeks
    plan: 07
    provides: "`Reset View`'s interim home in the period HUD, assertion 15's per-panel singleton count, and the rail/panel harness every new e2e drives"
provides:
  - "the floating camera cluster in the letterbox gutter: one bordered accent-free surface of four 44x44 icon-only controls, inside `.map-workspace__canvas` and after `div.map-export-source`"
  - "`Reset View` in its D-21 home, icon-only, exactly once in the composed DOM; `period-hud__reset-view` and its two props retired"
  - "assertion 12 — non-intersection of the cluster rect with `.map-frame` at every gate viewport x every legend preset, presets enumerated two-way from `LEGEND_CORNER_OPTIONS`/`LEGEND_CORNERS`"
  - "the bounded near-square exception, DERIVED at ~124px and asserted as a bound in its own test rather than as an escape hatch inside assertion 12"
  - "the D-22 dark ink chip with the colour readout and the honest reason as different elements, so the readout's absence is observable"
  - "the D-23 e2e gate: cursor, solid neutral fill, honest reason, and the colour readout asserted ABSENT — RED-proven twice"
  - "`hoverUnit` — a real pointer hover aimed by outline sampling plus `elementFromPoint`, because a bounding-box-centre hover on a world map lands on a different country"
  - "`LEGEND_CORNER_OPTIONS` / `LEGEND_CUSTOM_POSITION_LABEL` exported from `LegendEditor.tsx` so a gate enumerates the presets instead of restating them"
  - "`coding-rules/frontend.md` sections The Floating Camera Cluster and The Map Tooltip, including the record that the UI-SPEC's published placement formula is wrong"
affects: [03-09, 03-10, 03-11, 03-12]

actuals:
  tokens: 61000
  tasks: 3
  commits: 4

tech-stack:
  added:
    - "`@container (aspect-ratio > 1)` — the cluster's orientation follows the gutter it occupies, with no measurement and no observer"
  patterns:
    - "a bounded exception asserted as a BOUND in its own test, never as an `OR` inside the assertion it would weaken"
    - "a viewport excluded from a gate with the measured reason and the re-add condition written beside it, rather than dropped"
    - "a real pointer hover aimed by sampling the subject's own geometry and confirming with `elementFromPoint` — never `force: true`, never `dispatchEvent`"
    - "poll to two equal consecutive layout reads before measuring, because a registered custom property interpolates after its ARIA state has already flipped"

key-files:
  created: []
  modified:
    - src/components/MapNavigation.tsx
    - src/components/MapNavigation.test.tsx
    - src/components/editor/PeriodHud.tsx
    - src/components/MapWorkspace.tsx
    - src/components/MapWorkspace.test.tsx
    - src/components/MapCanvas.test.tsx
    - src/components/Tooltip.tsx
    - src/components/Tooltip.test.ts
    - src/components/LegendEditor.tsx
    - src/App.tsx
    - src/App.test.tsx
    - src/styles/MapCanvas.css
    - src/styles/editor.css
    - tests/e2e/navigation.spec.ts
    - tests/e2e/history.spec.ts
    - tests/e2e/transactions.spec.ts
    - tests/e2e/fixtures/navigation.html
    - .planning/coding-rules/frontend.md
    - .planning/phases/03-clean-ui-overhaul-1-1-5-weeks/deferred-items.md
  deleted: []

key-decisions:
  - "The UI-SPEC's published placement formula is a DEFECT and was not landed verbatim: it ADDS the gutter to the inset, which pushes the cluster away from the region edge and lands it `--space-sm` INSIDE the frame's bottom-inline-end corner at every aspect ratio. RED-proven on all four gate viewports. The landed rule is a corner anchor at `--space-sm` and lets the letterbox do the work"
  - "`Move Map` is RETAINED as the deliberate fourth control against D-21's three, on the NFR11 keyboard-pan grounds `03-UI-SPEC.md` Open Items item 2 already flagged. The alternative — three controls — has no keyboard pan replacement, and building one is not a chrome plan's work"
  - "The cluster's ORIENTATION follows the gutter through a container query. One fixed orientation fails at one of the two shapes: a row needs ~206px of block gutter (measured red at 800x900) and a column needs ~206px of inline gutter (measured red at 640x400)"
  - "The near-square exception band is ~124px, DERIVED from the cluster's own short side plus its margin, not the UI-SPEC's estimated ~96px. The stylesheet states the derivation so the next reader can check it"
  - "`640 x 400` is excluded from assertion 12's viewport set for a MEASURED reason owned by another plan (D-5's rail overflow makes the region 584x500), with the re-add condition recorded in `deferred-items.md`"
  - "The camera cluster is gated on a READY scene, so the loading state now WITHHOLDS all four camera controls instead of disabling one. Absent is the stronger claim; the two loading assertions were rewritten to it rather than deleted"
  - "The colour readout and the D-23 reason became DIFFERENT elements, which is what makes the readout's absence assertable at all"
  - "The cluster moved INSIDE `.map-workspace__canvas` so its inset math and `.map-frame`'s resolve against one container rather than two that happen to agree"

requirements-completed: [D-05, D-21, D-22, D-23, A-12]
---

# Phase 3 Plan 08: Map Chrome — Floating Cluster, Tooltip, Cursor Discipline Summary

The camera cluster is one bordered accent-free surface of four 44×44 icon buttons anchored in the
letterbox gutter, `Reset View` reached its D-21 home, the tooltip is the dark ink chip built from
four fixed tokens, and non-colourable units are gated so a regression to a colour readout or a
`pointer` cursor cannot pass. Assertion 12 measures **non-intersection** with `.map-frame` at every
gate viewport × every legend preset — RED-proven, and the probe that proved it is the UI-SPEC's own
published formula.

**The plan's stated placement math does not work, and that is this plan's most load-bearing
finding.** Applied verbatim it puts the cluster inside the frame at every aspect ratio. Details in
§ The UI-SPEC placement formula below; the deviation is recorded in `coding-rules/frontend.md` so
the next reader who "restores the spec" is stopped by a rule rather than by a red test.

---

## The UI-SPEC placement formula is wrong — recorded, not quietly replaced

`03-UI-SPEC.md` § Floating map controls publishes:

```css
inset-inline-end: max(var(--space-lg), calc((100cqw - var(--frame-side)) / 2 + var(--space-sm)));
inset-block-end:  max(var(--space-lg), calc((100cqh - var(--frame-side)) / 2 + var(--space-sm)));
```

`inset-inline-end` is the distance from the CONTAINER's inline-end edge to the ELEMENT's inline-end
edge, so adding the gutter to it pushes the cluster **away** from the region edge and **toward the
frame**. The frame's own inline-end edge is exactly `(100cqw − side)/2` from the region edge, so an
inset of `that + --space-sm` puts the cluster's edge `--space-sm` **inside** the frame. The same
holds on the block axis. The formula therefore lands the cluster just inside the frame's
bottom-inline-end corner at **every** aspect ratio — precisely the defect assertion 12 exists to
catch, and precisely what the spec's own § placement rule forbids.

**What landed instead:** `inset-block-end: var(--space-sm); inset-inline-end: var(--space-sm)` — a
corner anchor on the canvas region — plus a container query that lays the cluster **along** the
gutter it occupies. `--frame-side: min(100cqw, 100cqh)` stays the shared expression in the sense
that matters: the cluster now renders **inside the same `container-type: size` box** `.map-frame`
measures itself against, so the two cannot resolve their `cq` units against different elements.

**The exception is derived, not estimated.** Non-intersection needs a gutter of at least the
cluster's short side (54px = a 44px target + `--space-xs` padding + the hairline) plus its 8px
margin — 62px — i.e. a canvas region whose width and height differ by **~124px** or more. The
UI-SPEC's "~96px" is an estimate that no cluster built from 44px targets can meet. The stylesheet
states the derivation.

---

## RED probes (4 executed, with output)

Immutable Safety Constraint 10. Every probe used the scratchpad copy-and-restore protocol from
`coding-rules/general.md` § Git safety. **`git checkout --` was not run at any point in this plan,
on any file.** Every restore is confirmed by a SHA-256 match against the pre-probe value.

### Probe 1 — assertion 12, the UI-SPEC formula applied verbatim

**Break:** `.map-navigation`'s corner anchor replaced with the published `max(--space-lg, gutter +
--space-sm)` pair on both axes.

```
Error: the cluster intersects .map-frame at desktop 1440x900 / "Top left" — cluster
  {"left":1136,"top":678,"right":1190,"bottom":876} frame {"left":298,"top":0,"right":1198,"bottom":900}
Error: the cluster intersects .map-frame at desktop 1300x900 / "Top left" — cluster
  {"left":1066,"top":678,"right":1120,"bottom":876} frame {"left":228,"top":0,"right":1128,"bottom":900}
Error: the cluster intersects .map-frame at compact 800x900 / "Top left" — cluster
  {"left":578,"top":760,"right":776,"bottom":814} frame {"left":56,"top":78,"right":800,"bottom":822}
Error: the cluster intersects .map-frame at mobile 360x740 / "Top left" — cluster
  {"left":138,"top":460,"right":336,"bottom":514} frame {"left":56,"top":218,"right":360,"bottom":522}
  4 failed / 8 passed
```

RED on assertion 12's own subject at **every** gate viewport, and the measured rects are the
evidence for § The UI-SPEC placement formula above. **Restore:** `cp "$SP/MapCanvas.css.pre" …`,
SHA-256 `5361d1140bf14bfd8d67a73b673ed8b1383369aa184890d0fb35ccf5ac13398a`, byte-identical.

### Probe 2 — assertion 4, a `.dark` override for `--tooltip-surface`

**Break:** `--tooltip-surface: #16181c;` added inside `theme.css`'s `.dark` block.

```
 FAIL  src/styles/uiContract.test.ts > Phase 3 export firewall (assertions 4 and 5) >
       declares no export token outside the unconditioned root
AssertionError: theme.css: "--tooltip-surface" is mode-invariant and must stay fixed; found
under [] .dark. Redefining it makes the exported PNG follow the viewer theme.:
expected true to be false

$ node -e "…"   ->  tooltip token redeclared in .dark: --tooltip-surface   (exit 1)
```

Both assertion 4 and the plan's own script gate went red. **Restore:** `cp "$SP/theme.css.pre" …`,
SHA-256 `8ef1280d3ac5d94f247d1fc60912bf0b1493d0cc2ffafcf6fc50d6c17e82a658`; `git status --porcelain`
on the file is empty.

### Probe 3 — D-23, a colour readout emitted on the non-colourable branch

**Break:** `Tooltip.tsx`'s non-colourable branch rendered `.map-tooltip__reason` **and** a
`.map-tooltip__color` readout.

```
Error: expect(locator).toHaveCount(expected) failed
Locator:  locator('.map-tooltip').locator('.map-tooltip__color')
Expected: 0
Received: 1
  1 failed  [chrome] › navigation.spec.ts › non-colourable units stay honest (D-23)

 ×  states the honest reason for a non-colourable unit and announces no colour
AssertionError: expected '<div class="map-tooltip" data-input-m…' not to contain
'class="map-tooltip__color"'
```

The NEGATIVE half went red in both tiers — which is the point: a presence-only check on the reason
string stays green against this exact break. **Restore:** `cp "$SP/Tooltip.tsx.pre" …`, SHA-256
`96b804c6f9e28e36384fb39737eb128b4bc6e9487db6929158f1ef228d233b34`, byte-identical.

### Probe 4 — D-23, a `pointer` cursor on a non-colourable unit

**Break:** `.map-unit-path { cursor: pointer }` in `MapCanvas.css`.

```
Error: expect(received).toBe(expected) // Object.is equality
Expected: "default"
Received: "pointer"
  1 failed  [chrome] › navigation.spec.ts › non-colourable units stay honest (D-23)
```

A second probe rather than one, because the cursor half and the copy half are independent claims
and Probe 3 cannot reach the cursor. **Restore:** `cp "$SP/MapCanvas.css.pre2" …`, SHA-256
`90f395c256d38003f09fd081c24c742d3f0936dead35abea2d893e0afa7b5805`, byte-identical.

---

## `Move Map` — retained by decision (NFR11)

**D-21 names three controls. Four shipped.** `Move Map` and its pan popover are retained because
they are the **only keyboard pan affordance in the app**: the map's own arrow-key handling moves
the roving tab stop between countries, not the camera, and Locate moves the camera only to a
searchable core state. Dropping the popover would leave a keyboard-only creator with no way to pan
at all, which regresses NFR11 and the keyboard-navigation acceptance cells.

This was **flagged for owner awareness in `03-UI-SPEC.md` § Open Items item 2**, not decided
silently, and the plan's own `must_haves` carries it as a truth. It is recorded here as a
**retained-by-decision** item, not as an accident:

- **If the owner wants the three-control cluster D-21 describes, keyboard panning needs a
  replacement FIRST** — e.g. arrow keys panning the camera while the SVG itself holds focus, which
  is a camera-controller change and not chrome.
- No owner review of this decision has taken place. The authorization in force is a blanket,
  in-advance, sight-unseen PROCEED-authorization.

The retention is asserted, not merely described: `transactions.spec.ts` counts four controls in the
cluster, `MapNavigation.test.tsx` counts four buttons closed and eight open, and
`navigation.spec.ts` counts eight in the fixture.

---

## What shipped, per task

### Task 1 (tracer) — the floating cluster (commit `cd30062`)

`MapNavigation` gained `Reset View` as an icon-only fourth control wired to `handleResetView`;
`PeriodHud` lost the button, `isResetViewDisabled`, and `onResetView`, and its `.period-hud__reset-view`
rules were deleted rather than left orphaned. The cluster is one bordered Porcelain surface with a
hairline and the popover-tier shadow, and its controls carry **no border and no fill of their own**
— that is the difference between one surface and four pills. No accent anywhere (asserted in
`MapNavigation.test.tsx` against `apple-blue`, `accent`, and both accent hexes); the only Apple
Blue that can appear is the global `:focus-visible` ring authored in `theme.css`.

`MapWorkspace` renders `navigationSlot` **inside** `.map-workspace__canvas`, after `.map-frame` and
after `div.map-export-source` — asserted as an index relationship (`</svg></div>` before the
cluster, cluster before the region's closing `div`), which a `data-editor-only` check cannot do.
The whole `.map-navigation` rule set moved into `MapCanvas.css` beside `.map-frame`'s; `editor.css`
no longer anchors it, because two files anchoring one element is how a placement ends up
half-overridden.

`.map-workspace__warning` moved off the cluster's corner to the one free corner (top-inline-end,
capped at a measure). Its previous comment claimed the cluster overlaid the top-left, which had
been false since `03-03`.

**Tracer gate:** `navigation.spec.ts` 12/12, `export.spec.ts` green, the retired-token script
clean, and `npm run lint && npm test && npm run build` all green before any expansion task began.

### Task 2 — the dark ink chip (commit `6834e57`)

The four tooltip tokens were already fixed in the unconditioned `:root` (landed by `03-04`) and
already consumed by `.map-tooltip`; what this task added is the discipline around them. The chip
carries `data-editor-only="true"` on top of living outside `svg.map-canvas`; both detail lines
carry `--text-caption`; and the colour readout and the D-23 reason became **different elements**
(`.map-tooltip__color`, monospace because it spells a hex, and `.map-tooltip__reason`). The reason
string is exported so gates import it rather than restate it. Contrast is unchanged and unmeasured
by this plan: white on `#061b31` is the 17.9:1 figure `theme.css` already records.

### Task 3 — cursor and copy discipline (commit `37ae5ca`)

D-23's behaviour was **already implemented** — both resolvers return `NEUTRAL_UNIT_COLOR`,
`.map-unit-path` carries `cursor: default`, the tooltip states the honest reason. What was missing
was a gate that can fail on it. The new e2e asserts, in one test: the cursor on both kinds; the
solid neutral fill and `filter: none` on the unit; the colour readout present for a colourable unit;
and for a non-colourable one the reason present, `.map-tooltip__color` **count 0**, no
`Current color`, and no hex anywhere in the chip's text.

The unit tier gained the claim that actually matters: `getSceneFeatureColor` and
`getEffectiveFeatureColor` are asserted **equal** in one place. Each already had a passing test in
its own file, and two passing tests in two files never made the "both resolvers agree" claim —
which is exactly how the render-side copy silently won last time.

`src/utils/scene.ts`, `src/components/MapCanvas.tsx`, and `src/constants/colors.ts` are
**byte-unchanged**: this plan restyled and gated, it did not reclassify a unit.

---

## Deviations from plan

### [Rule 1 — Bug] The UI-SPEC's placement formula lands the cluster inside the frame

See § The UI-SPEC placement formula. Landing it verbatim, as the plan's action text asks, would
have shipped the defect assertion 12 exists to catch. RED-proven on all four gate viewports and
recorded in `coding-rules/frontend.md` as a rule, so a later "restore the spec" is stopped by
documentation rather than by a red test.

### [Rule 1 — Bug] A single cluster orientation cannot clear both gutters

A 4×44 row is 198×54 and a column is 54×198. A row needs ~206px of BLOCK gutter and fails at
800×900 (78px available); a column needs ~206px of INLINE gutter and fails at 640×400 (92px). The
orientation follows the gutter through `@container (aspect-ratio > 1)` — still pure container math,
still no measurement and no observer.

### [Rule 1 — Bug] `--panel-width` interpolates after its ARIA state has flipped

`aria-expanded="false"` is true a quarter second before the canvas region has finished widening.
At 1300×900 the mid-transition region is near-square, and assertion 12 failed on the **animation**
rather than on the placement. `waitForSettledRegion` polls real frames to two equal consecutive
reads. Recorded as a rule — this is a trap for any future layout measurement in this app.

### [Rule 2 — Correctness] The warning banner shared the cluster's corner

`.map-workspace__warning` was a full-width bar at the bottom of the canvas region, directly under
the cluster, with a comment claiming the cluster was at the top-left. Pre-existing since `03-03`,
but this plan owns the cluster and `frontend.md` already forbids a banner sharing a corner with
floating chrome. Moved to top-inline-end and capped at a measure.

### [Rule 2 — Correctness] The loading state's claim changed from "disabled" to "absent"

The camera cluster is gated on a ready scene, so `Reset View` no longer exists during loading. Both
loading assertions (`MapWorkspace.test.tsx`, `history.spec.ts`) were **rewritten** to assert all
four camera controls are absent, which is strictly stronger — a disabled control can be re-enabled
by a stray prop; an absent one cannot be activated. Neither test was deleted, and both name the
change in a comment.

### [Rule 3 — Blocking] `files_modified` omits eight files the change requires

The plan lists nine. Also modified: `src/App.tsx` (the slot wiring and the two prop moves),
`src/App.test.tsx` (assertion 15 counts the accessible name now), `src/components/MapWorkspace.tsx`
and `.test.tsx` (the slot moved inside the canvas region), `src/components/LegendEditor.tsx`
(exports the preset list so the gate enumerates rather than restates),
`src/styles/editor.css` (hands the cluster's placement to `MapCanvas.css`),
`tests/e2e/history.spec.ts` and `tests/e2e/transactions.spec.ts` (both counted the old cluster),
and `tests/e2e/fixtures/navigation.html` (the new required prop). All are in `key-files`.

### [Scope — recorded] `640 × 400` is excluded from assertion 12's viewport set

Not a placement failure. D-5 (owner `03-09`) means the rail overflows below ~436px of viewport
height and stretches the grid row, so the measured canvas region at that viewport is **584 × 500**,
not `584 × 400` — an 84px difference, inside the near-square band. The exclusion, its measured
reason, and the re-add condition are written in the spec beside the list **and** in
`deferred-items.md` under D-5, so closing D-5 restores the coverage rather than leaving it lost.

### [Scope — recorded] The pan popover is deliberately outside assertion 12

The popover is transient chrome that exists only while the creator holds it open, and at a narrow
gutter it does overlap the frame; moving it out would put it off-region, where `overflow: hidden`
would clip the only keyboard pan affordance. Stated in the stylesheet and in the rules rather than
left as an unexplained gap in the assertion's scope.

### [Observation — not fixed] Three vendored icons still have no consumer

`CrosshairIcon`, `PlusIcon`, and `MinusIcon` carry provenance lines naming *"the floating map
controls, Reset View / Locate"* as their consumer, and the cluster still uses hand-written inline
SVG glyphs. No gate requires an icon consumer (`iconContract.test.ts` asserts inventory, sizing,
provenance, and forbidden constructs — not consumption), and swapping four glyphs for
`motion/react`-animated components is churn this plan's acceptance criteria do not ask for and
would put animation on camera chrome D-21 does not describe. **Carry-forward for `03-10`/`03-11`:**
either wire the three glyphs or correct the provenance lines' consumer claim.

---

## Verification

```
$ npm run lint              -> clean
$ npm test                  -> Test Files 42 passed (42) · Tests 620 passed (620)
$ npm run build             -> tsc -b clean; built in ~97ms
$ npm run data:world:check  -> World GeoJSON check passed: 248 units, 195 selectable core states

$ npx vitest run src/components/MapNavigation.test.tsx src/styles/uiContract.test.ts -> 62 passed
$ npx vitest run src/components/Tooltip.test.ts src/styles/uiContract.test.ts \
      src/styles/themeTokens.test.ts                                            -> 74 passed
$ npx vitest run src/components/MapCanvas.test.tsx                              -> 18 passed

$ npx playwright test tests/e2e/navigation.spec.ts --project=chrome              -> 13 passed
$ npx playwright test navigation + export + final-integration --project=chrome   -> 24 passed
$ npx playwright test navigation + history + rail + transactions + export        -> 45 passed
$ npx playwright test --project=chrome
      -> 88 passed, 12 failed (all responsive.spec.ts, the SAME 12, re-measured; denominator 90 -> 100)
```

Plan gates, run as specified:

```
MAP_CANVAS_CSS_CLEAN   (no --shadow-navigation, no --glass-*, no backdrop-filter)
TOOLTIP_FIXED_OK       (no tooltip token inside any .dark block)
NO_CSS_FILTER          (no `filter:` on map content in MapCanvas.css)
EXPORT_TS_UNTOUCHED    (git diff d6d2071..HEAD -- src/utils/export.ts is empty)
LEGEND_UTIL_UNTOUCHED  (src/utils/legend.ts byte-unchanged)
STORAGE_UNTOUCHED      (src/utils/storage.ts byte-unchanged)
SNAPSHOT_CATALOG       (src/constants/snapshots.ts byte-unchanged)
MAP_EDITOR_UNTOUCHED   (src/components/editor/MapEditor.tsx byte-unchanged)
PUBLIC_DATA_UNTOUCHED  (git diff d6d2071..HEAD -- public/data/ is empty)
STATE_ROADMAP_UNTOUCHED(.planning/STATE.md and .planning/ROADMAP.md byte-unchanged)
LAST_UPDATED_OK 2      (frontend.md at exactly 2 entries; the two oldest merged in the same edit)
```

**Test counts.** Unit: 616 → **620** (+1 MapNavigation accent test, +3 Tooltip content tests,
+1 both-resolvers test, −1 net from folding the PeriodHud loading test into a MapWorkspace one).
No test was weakened: the two rewritten loading assertions assert absence, which is stronger than
the disabled state they replaced. Chrome e2e: 90 → **100** (+10 in `navigation.spec.ts`).
Passing e2e: 78 → **88**.

**Chrome 151.0.7922.75 is the only browser with evidence.** Edge is **not installed** on this
machine (D-33) and no Edge result is reported. Firefox, Safari, and previous-version certification
have never been run here and are not claimed.

---

## Threat Flags

None new. The plan's five threats were all exercised:

| Threat ID | Disposition | Evidence |
|---|---|---|
| T-03-33 (the cluster overlapping exported content) | mitigated | Assertion 12 asserts non-intersection with `.map-frame` at four gate viewports × five legend presets; RED-proven by the UI-SPEC's own formula at every one; the near-square exception is bounded, commented, pointer-events-safe, and asserted as a bound in its own test |
| T-03-34 (a non-colourable unit presenting as colourable) | mitigated | e2e cursor + fill + copy gate with the colour readout asserted ABSENT; both resolvers asserted equal in one unit test; RED-proven twice (Probes 3 and 4) |
| T-03-35 (a CSS `filter` used for the neutral fill) | mitigated | Solid colour only; assertion 17's ban plus the per-file script plus a browser-side `getComputedStyle(...).filter === 'none'` on the unit itself |
| T-03-36 (a tooltip token flipping with the theme) | mitigated | All four tokens fixed in the unconditioned `:root`; assertion 4 guards the family; RED-proven (Probe 2), and the plan's script gate fired too |
| T-03-37 (losing the only keyboard pan affordance) | mitigated | `Move Map` retained as a deliberate fourth control with the NFR11 reason recorded here and in `coding-rules/frontend.md`, and the count asserted in three places |

**Export isolation is intact.** `src/utils/export.ts` is byte-unchanged; the cluster and the chip
are both siblings of `div.map-export-source` by placement, asserted as index relationships;
`uiContract.test.ts`'s export-unsafe guard and `EXPORT_CONTENT_PATTERN` are untouched, and
`.map-navigation` is not matched by them because it is not exported content.

---

## Known Stubs

| Stub | File | Why it is intentional | Resolved by |
|---|---|---|---|
| `640 × 400` is absent from `GUTTER_VIEWPORTS` | `tests/e2e/navigation.spec.ts` | Blocked by D-5's rail overflow, which makes the canvas region 584×500 there. The measured reason and the exact re-add instruction are written beside the list and in `deferred-items.md` | `03-09`, when D-5 closes |
| `CrosshairIcon` / `PlusIcon` / `MinusIcon` are vendored with no consumer, while their provenance names the floating map controls | `src/components/icons/` | No gate requires a consumer; swapping the cluster's four inline glyphs for `motion/react` components is churn outside this plan's acceptance criteria and would animate camera chrome D-21 does not describe | `03-10`/`03-11` — wire them or correct the provenance claim |
| `Controls` variants `app-bar` / `strip` stay declared, tested, unmounted | `src/components/Controls.tsx` | Unchanged by this plan; `03-09` owns the responsive rewrite | `03-09` |

No file created or modified by this plan renders a hardcoded empty value, a placeholder string, or
an unwired data source.

---

## Carry-forward for later plans

- **`03-09`:** the red list is still exactly **12**, re-measured at 88/100. **Five** of the twelve
  are now rewrites rather than repairs — `03-07`'s three plus two this plan added
  (`the map navigation cluster sits below the square…` and `the navigation cluster never overlaps
  the legend at any legend position`); both are itemised in `deferred-items.md` with the reason a
  repair is wrong. D-5 gained a measured second consequence and **re-adding `640 × 400` to
  `GUTTER_VIEWPORTS` is the observable test that it closed**. The D-20 narrow layout must keep the
  cluster outside the frame: at 360×740 it currently clears with 218px of block gutter, and a
  bottom bar eats into that.
- **`03-10`:** `MapCanvas.css` gained the whole `.map-navigation` rule set (placement, the container
  query, pointer-events, the popover) and the tooltip's typography split; `editor.css` lost its two
  `.map-navigation` rules. CF-7 (`--success`/`--warning`) is untouched. The three unconsumed icons
  are described under § Known Stubs.
- **`03-11`:** `src/utils/export.ts` and `src/utils/legend.ts` are **byte-unchanged** by this plan.
  CF-2 (latin-only Inter subset) untouched. `LEGEND_CORNER_OPTIONS` is now exported from
  `LegendEditor.tsx` and consumed by `navigation.spec.ts`; keep the two-way equality with
  `LEGEND_CORNERS`.
- **Anyone measuring layout in an e2e:** poll to two equal consecutive reads first.
  `--panel-width` interpolates after `aria-expanded` has already flipped, and the intermediate
  layout is a real shape that can satisfy or violate an assertion by accident.
- **Anyone hovering a map path in an e2e:** import `hoverUnit`'s approach, do not use
  `locator.hover()`. A bounding-box centre on a world map lands on a different country roughly as
  often as not.
- **Anyone adding a floating surface to the canvas region:** all four corners are now spoken for —
  period HUD top-start, `.editor-help` bottom-start, the cluster bottom-end, the warning banner
  top-end.

---

## What is NOT done

- **No visual, touch, or screen-reader claim is made anywhere in this plan.** Every result is a
  `node` assertion, a source scan, or a measured browser behaviour. **PENDING: a human look at the
  cluster in both gutters (resize wide→tall through near-square), at the four glyphs, at the dark
  ink chip in both theme modes, and at a hover over Kosovo confirming the cursor and the honest
  reason.** The plan's own by-hand check is a **visual judgement** and is PENDING with the rest —
  an automated result may never substitute for a physical check (Immutable Safety Constraint 8).
  The `Move Map` retention in particular is a keyboard-accessibility claim that has **not** been
  verified with a real screen reader here.
- **The owner authorization in force is a blanket, in-advance, sight-unseen PROCEED-authorization**,
  given before this session began. It is **not** a content review and **not** hash-bound. Nothing
  here was reviewed by the owner and no diff was inspected by them. The two unanticipated decisions
  — replacing the UI-SPEC's placement formula, and excluding `640 × 400` — were taken as the
  approved artifacts' own recorded requirements (the spec's § placement rule and assertion 12's
  non-intersection contract outrank the spec's arithmetic; D-5 is a recorded deferral owned by
  another plan), and the basis for each is documented above.
- **The near-square exception is real and unavoidable.** At a square canvas region there is no
  gutter, so any chrome overlaps. It is bounded, commented, pointer-events-safe, and asserted as a
  bound — it is not "fixed".
- **Historical geometry is unchanged.** The approved catalog still holds exactly `Modern`; the
  1492 / 1700 / 1815 / 1914 packets remain **deferred for missing rights-cleared source material**.
  `SNAPSHOT_CATALOG` is byte-unchanged and `public/data/` is untouched.
- **The non-colourable classification is unchanged.** `src/utils/scene.ts`,
  `src/components/MapCanvas.tsx`, and `src/constants/colors.ts` are byte-unchanged; the count of 12
  is now pinned by a test so a reclassification is visible rather than silent. The local debug note
  `.planning/debug/kosovo-renders-white-uncolorable.md` is a **diagnosis from before the fix landed
  in Phase 2** — it describes `.map-unit-path` as carrying zero CSS rules and both resolvers
  returning `DEFAULT_COLOR`, neither of which is true at HEAD. It stays untracked and unedited;
  read it as history, not as current state.
- **`responsive.spec.ts` is red** — the same 12, re-measured at 88/100, itemised, owned by `03-09`.
  `03-12`'s full-gate evidence is not honest until it is clear.
- **Embedding is not authorized and was not approached.** No backend, auth, network call,
  deployment config, environment variable, or Themely import. `MapEditor.tsx` is byte-unchanged and
  its host-global allowed set is still empty; storage is still reached through
  `useEditorConfig().createStorage()`.
- **Chrome 151.0.7922.75 only.** Edge is not installed (D-33); Firefox, Safari, and previous-version
  certification have never been run here and are not claimed.
- **`.planning/STATE.md` and `.planning/ROADMAP.md` are UNTOUCHED.** `git diff` on both over the
  whole plan is empty. Neither `state.advance-plan`, `state.update-progress`, nor
  `roadmap.update-plan-progress` was run.

---

## Commits

| Hash | Message |
|---|---|
| `cd30062` | `feat(3-08): anchor the four-control camera cluster in the letterbox gutter` |
| `6834e57` | `feat(3-08): re-tone the map tooltip as the dark ink chip from fixed tokens` |
| `37ae5ca` | `test(3-08): gate the cursor and copy discipline for non-colourable units` |
| `87f67ca` | `docs(3-08): re-measure the responsive red list and record two carry-forwards` |
| *(this commit)* | `docs(3-08): complete the map-chrome plan` |

---

## Self-Check: PASSED

| Claim | Check |
|---|---|
| `src/components/MapNavigation.tsx` | FOUND, four cluster controls, `aria-label="Reset View"` present exactly once |
| `src/components/Tooltip.tsx` | FOUND, SHA `96b804c6…d234` matches the pre-probe value |
| `src/styles/MapCanvas.css` | FOUND, SHA `90f395c2…b5805` matches the pre-probe value |
| `src/styles/theme.css` | FOUND, SHA `8ef1280d…a658` matches the pre-probe value, clean against HEAD |
| `tests/e2e/navigation.spec.ts` | FOUND, 13 Chrome tests, all passing |
| `.planning/coding-rules/frontend.md` | FOUND, exactly 2 `Last updated` entries |
| `deferred-items.md` — D-1 re-measured at 12/100, D-5 extended | FOUND |
| commits `cd30062` `6834e57` `37ae5ca` `87f67ca` | all FOUND in `git log` |
| `src/utils/{export,legend,storage}.ts`, `src/constants/snapshots.ts`, `src/components/editor/MapEditor.tsx`, `public/data/` | byte-unchanged over the whole plan (`git diff d6d2071..HEAD` empty for each) |
| `.planning/STATE.md`, `.planning/ROADMAP.md` | untouched — `git diff d6d2071..HEAD` empty on both; no gsd-sdk state verb was run |
| `git checkout --` usage | **none, on any file, at any point** |
