---
phase: 03-clean-ui-overhaul-1-1-5-weeks
plan: 03
subsystem: shell
tags: [layout, css-grid, export-frame, contract-test, red-probe, wysiwyg, tracer]
status: complete

requires:
  - phase: 03-clean-ui-overhaul-1-1-5-weeks
    plan: 02
    provides: "`Design.md` as the normative contract; the `--motion-duration-base` / `--motion-ease-out` tokens the panel track transitions on"
provides:
  - "`src/styles/editor.css` — the `.map-editor` three-track grid, `.tool-rail`, `.tool-panel`, the canvas region, `--rail-width` / `--panel-width`"
  - "`.map-editor` as the mount root, with `html`/`body` reduced to unpainted layout-only rules (OQ-3)"
  - "`.map-workspace__canvas` (renamed from `__square`, full-bleed, `container-type: size`) and `.map-frame` carrying the relocated `aspect-ratio: 1`"
  - "`src/styles/uiContract.test.ts` — the successor contract test: parser ported verbatim, stylesheets discovered by directory walk, assertions 10 and 16, the export-unsafe guard, the D-32 frame-token and observer-ownership gates"
  - "`tests/e2e/shell.spec.ts` — assertion 11 (frame ↔ viewBox equality at three viewport shapes), the measured 56/0/280 tracks, non-overlay reflow, and a 1080×1080 export after four reflows"
  - "`Design.md` § 7.1 — the OQ-2 resolution with its two verified citations and the D-20 narrow-width contract as specification for 03-09"
  - "`coding-rules/frontend.md` § The Editor Shell"
affects: [03-04, 03-05, 03-06, 03-07, 03-08, 03-09, 03-10, 03-11, 03-12]

actuals:
  tokens: 78000
  tasks: 4
  commits: 5

tech-stack:
  added:
    - "`@property` custom-property registration — the panel track animates a typed `<length>`, not the grid's track list"
    - "CSS container queries (`container-type: size`, `100cqw`/`100cqh`) — the frame's side is `min(w,h)` in pure CSS, with no measurement and no observer"
  patterns:
    - "a contract test that discovers its inputs by walking a directory, so a file added later cannot escape every assertion in it"
    - "a two-valued DOM attribute gated on BOTH halves: the values styled in CSS and the count of source writers"
    - "an ownership-set gate instead of a blanket ban, for a rule that would otherwise be red on arrival and get deleted"
    - "a tolerance chosen from a measurement, after the proposed one was observed unable to fail its own probe"

key-files:
  created:
    - src/styles/editor.css
    - src/styles/uiContract.test.ts
    - tests/e2e/shell.spec.ts
    - .planning/phases/03-clean-ui-overhaul-1-1-5-weeks/deferred-items.md
  modified:
    - src/App.tsx
    - src/App.test.tsx
    - src/main.tsx
    - src/components/MapWorkspace.tsx
    - src/components/MapWorkspace.test.tsx
    - src/components/ErrorBoundary.test.tsx
    - src/styles/MapCanvas.css
    - src/styles/theme.css
    - src/styles/Controls.css
    - src/styles/phase2CssContract.test.ts
    - tests/e2e/phase2-composition.spec.ts
    - Design.md
    - .planning/coding-rules/frontend.md

key-decisions:
  - "The frame↔viewBox tolerance was tightened from the plan's 1px to 0.05px, because a 1px tolerance was MEASURED GREEN against the plan's own 1px-inset RED probe. Real error: 6e-14px"
  - "`grep -rn ResizeObserver src/` cannot return nothing — `Tooltip.tsx` has had one since Phase 2. The gate is an ownership set instead, which fails on a shell/camera/export observer and passes on the tooltip"
  - "The tracer's panel holds the existing app bar and inspector, defaulting OPEN. Not a design claim — it keeps every control reachable until 03-05 dissolves those containers"
  - "The panel body is UNMOUNTED when the track is 0px: a clipped 0px column still holds live tab stops"
  - "`--map-shadow` was deleted rather than left consumer-less, because the rule that read it went away with the boxed square"

requirements-completed: [D-11, D-16, D-19, D-32, A-10, A-11, A-16]
---

# Phase 3 Plan 03: The Shell Summary

One CSS grid on the editor mount root: a 56px rail, a panel track that reserves 0px or 280px, and
a full-bleed canvas region carrying a centred square frame that marks exactly what lands in the
1080×1080 PNG. Plus `uiContract.test.ts` as the successor contract test, with its parser ported
verbatim and every landed assertion proven able to fail.

**The map surface is now edge to edge with no top chrome, and the 1080×1080 export contract did
not move.** Both halves are measured in installed Chrome, not asserted.

---

## RED probes (4 executed, with output)

Immutable Safety Constraint 10: *a gate must be able to fail on the bug it covers.* Every probe
used the scratchpad copy-and-restore protocol from `coding-rules/general.md` § Git safety.
**`git checkout --` was not run at any point in this plan, on any file.** Every restore is
confirmed by a SHA-256 match against the pre-probe value.

### Probe 1 — assertion 10, a third panel state

**Break:** appended `.map-editor[data-panel-open='partial'] { --panel-width: 140px; }` to
`editor.css`.

```
$ npx vitest run src/styles/uiContract.test.ts

 ❯ src/styles/uiContract.test.ts (14 tests | 1 failed) 14ms
     × styles exactly the two states the attribute is allowed to hold 2ms

 FAIL  ... > Phase 3 panel track (assertion 10)
       > styles exactly the two states the attribute is allowed to hold
AssertionError: "partial" is styled off the panel state attribute. The attribute is
two-valued so a contract assertion can enumerate it; a third value is a state no gate
and no reader knows about.: expected false to be true

 Test Files  1 failed (1)
      Tests  1 failed | 13 passed (14)
```

**Restore:** `cp "$SP/editor.css.orig" src/styles/editor.css`. SHA-256 before and after:
`b35f164693ba6ee6d58cd1ca55b935be1e8eef7df444b0ace8599f7295c92daf`, byte-identical. Re-run: 14
passed.

### Probe 2 — assertion 10's other half, a second writer

The value half and the writer half are different claims, so the writer half was probed
separately. **Break:** added `data-panel-open={'true'}` to `MapWorkspace.tsx`'s section element.

```
$ npx vitest run src/styles/uiContract.test.ts

 ❯ src/styles/uiContract.test.ts (14 tests | 1 failed) 14ms
     × has exactly one writer, and it writes only those two values 3ms

AssertionError: the panel state attribute must have exactly one writer.:
              expected [ 'App.tsx', …(1) ] to have a length of 1 but got 2
```

**Restore:** copied back from the scratchpad. SHA-256 before and after:
`81089bf2065bcbc3572d3aaf7102ffa7930d387a535543229983af5217a6fe8b`, byte-identical.

### Probe 3 — assertion 16, a rail row styled by index

**Break:** appended `.tool-rail__tools button:nth-child(2) { background: var(--surface-hover); }`
to `editor.css` — exactly the bug a rail of near-identical icon rows invites.

```
$ npx vitest run src/styles/uiContract.test.ts

 ❯ src/styles/uiContract.test.ts (14 tests | 1 failed) 14ms
     × never styles an interactive control by its position 3ms

AssertionError: editor.css: ".tool-rail__tools button:nth-child(2)" styles a control by
position. Key on a role class or a stable data attribute instead.:
              expected true to be false
```

**Restore:** copied back. SHA-256 unchanged (`b35f1646…2daf`). Re-run: 14 passed.

### Probe 4 — assertion 11, the frame inset by 1px

**This probe is the reason the tolerance changed, and the finding is more important than the
probe.** Run first at the plan's proposed `≤ 1px` tolerance:

```
$ npx playwright test tests/e2e/shell.spec.ts --project=chrome --reporter=line
  3 passed (6.7s)
```

**GREEN on the defect.** Insetting the frame by 1px moves each edge by exactly 1px, and
`Math.abs(diff) <= 1` accepts exactly 1. As specified, assertion 11 could not fail on its own
probe — this repo's fifth "gate that cannot fail", caught before landing rather than after.

The real error was then measured by running the same spec at tolerance `0`:

```
Error: tall: the frame's top edge is 318 but the viewBox square projects to
318.00000000000006.
```

**6e-14 px** — floating-point noise, at the worst of the three viewport shapes. The tolerance is
now **0.05px**: two hundred times the observed error, three times Blink's 1/64px layout unit, and
twenty times too small for a 1px inset to slip through. Re-run of the same break:

```
$ npx playwright test tests/e2e/shell.spec.ts --project=chrome --reporter=line

    Error: tall: the frame's left edge is 337 but the viewBox square projects to 336.
    The frame is the creator's only signal of what lands in the PNG, so it has to be
    the same square, not a similar one.

  1 failed
  2 passed (7.7s)
```

**Restore:** `cp "$SP/MapCanvas.css.orig" src/styles/MapCanvas.css`. SHA-256 before and after:
`1db5f972f7c87f8806b30d69a8e77452587d0ba4bd5632469107faab05103965`, byte-identical. Re-run: 3
passed.

### Probe 5 — the frame moved inside the export source

**Break:** removed `.map-frame` from `MapWorkspace.tsx` and rendered it inside
`div.map-export-source` in `MapCanvas.tsx` — the exact defect T-03-07 names.

**First run exposed a weak assertion, and it was strengthened before the probe was accepted.**
The sibling check keyed on the literal `</svg></div>`, which only identifies the export source's
closing tag while that element has exactly one child. Moving the frame inside it made the marker
vanish entirely, so the test failed on a `-1` sentinel rather than on the placement, and the
intended comparison (`frameIndex > exportSourceEnd`) would have *passed* against `-1`. The check
now depth-walks the export source's own closing `</div>`. Re-probed:

```
$ npx vitest run src/components/MapWorkspace.test.tsx

 FAIL  ... > MapWorkspace export frame (D-32)
       > renders the frame as a sibling of the export source, never inside it
AssertionError: expected 1136 to be greater than 1203
 ❯ src/components/MapWorkspace.test.tsx:352:24
    352|     expect(frameIndex).toBeGreaterThan(exportSourceEnd);
```

**Restore:** both files copied back. SHA-256 after restore —
`MapWorkspace.tsx` `81089bf2…6fe8b`, `MapCanvas.tsx` `189d7532…13db3` — both byte-identical to the
pre-probe values. Re-run: 14 passed.

---

## What shipped

### Task 1 — the shell (commit `7e2834d`)

`.map-editor` is the mount root: `display: grid`, `grid-template-columns: var(--rail-width)
var(--panel-width) 1fr`, `block-size: 100dvh`, carrying `[data-panel-open]` at all times as
exactly `'true'` or `'false'`.

- `--panel-width` is registered with `@property` (`<length>`, `inherits: true`,
  `initial-value: 0px`) and **the custom property is transitioned**, over `--motion-duration-base`
  with `--motion-ease-out`. The registered-property transition **does work in installed Chrome
  151** — the plan's fallback ("accept an instant snap and record that") was not needed. The
  grid's track list is never animated, and a gate rejects it.
- `html` and `body` dropped to layout-only rules with **no themed background** (OQ-3).
  `overflow-x: hidden` stays on `body` and nowhere else.
- `.map-workspace__square` → `.map-workspace__canvas`: full-bleed, `container-type: size`,
  keeping `background: var(--map-surface)` and `overflow: hidden`, dropping the border, the
  radius, and `--map-shadow`.
- `.map-frame` carries the relocated `aspect-ratio: 1`, `--frame-side: min(100cqw, 100cqh)`,
  `inset: 0`, `margin: auto`, `pointer-events: none`, a `--map-frame-edge` hairline, and
  `box-shadow: 0 0 0 100vmax var(--map-frame-scrim)`.
- `--map-frame-edge: rgba(6, 27, 49, 0.55)` and `--map-frame-scrim: rgba(6, 27, 49, 0.06)` are
  declared once in the **unconditioned** `:root` of `theme.css` and in no conditional block.
- `MapWorkspace` renders the frame as a structural sibling of `div.map-export-source` with
  `data-editor-only="true" aria-hidden="true"`. **`legendSlot` and `navigationSlot` are
  byte-unchanged**, and the frame is not a third slot.
- **No `ResizeObserver` was added.**

```
NO_RESIZE_OBSERVER (outside the pre-existing tooltip pair)
PANEL_TRACK_OK
grep -rn "map-workspace__square" src/   -> no output
```

### Task 2 — `uiContract.test.ts` (commit `a609a14`)

Created as the successor to `phase2CssContract.test.ts`, which is **not deleted** — both run side
by side until `03-04` retires the Phase 2 token rules.

**Ported verbatim** (`03-RESEARCH.md` § Pattern 8's *"keep verbatim — infrastructure, not
policy"* list): `readStyleSheet` via `process.getBuiltinModule('fs')`, `stripComments`,
`parseRules`, `assertParsableStyleSheet`, `declarationsOf`, `findRule` **including its
duplicate-rule throw**, `tokensOf`, `resolveTokenValue`, `parseHexColor`, `relativeLuminance`,
`contrastRatio`.

**The glob seam landed now, not later.** Stylesheets are discovered by walking `src/styles/`
rather than from the four hard-coded filenames, so `03-10`'s `controls/*.css` split cannot escape
every assertion. `03-10` only has to add the count comparison.

```
GLOB_SEAM_OK
$ npx vitest run src/styles/uiContract.test.ts             -> 14 passed
$ npx vitest run src/styles/phase2CssContract.test.ts      -> 29 passed
```

Assertions landed: **10** (values styled, track 0px/280px, `@property` registration, the track
list not animated, exactly one source writer), **16** (no positional selector on an interactive
element), the **export-unsafe guard** with `EXPORT_CONTENT_PATTERN` still bound back to
`MapCanvas.tsx` source, the **D-32 frame tokens** fixed in the unconditioned root, the
**relocated squareness** claim, and the **observer ownership set**.

**The export-unsafe guard's reason is rewritten in `Design.md` § 8's words**, not Phase 2's: the
Phase 2 wording about html2canvas rasterising differently goes false when D-34 lands, and the true
post-D-34 reason is that an externally-styled effect inside an SVG-as-image isolated document
renders **not at all**.

### Task 3 — `tests/e2e/shell.spec.ts` (commit `fcdb94a`)

Imports the shared fixtures from `tests/e2e/support/appHarness.ts` and declares no camera or
browser helper of its own.

| Test | What it measures |
|---|---|
| frame ↔ viewBox | projects `(0,0)` and `(1080,1080)` through `svg.map-canvas`'s `getScreenCTM()` and compares to `.map-frame`'s client rect at **wide** (1440×820), **tall** (900×1200), and **near-square** (1000×980), plus a real-side check so a collapsed frame at the projected origin cannot pass four edge comparisons |
| panel track | rail 56px and panel 0px closed, 280px open, read from the resolved `grid-template-columns`; **the canvas region's own left edge moves right by exactly 280px** and its width shrinks by the same — an overlay panel is equally visible and equally wide, so only the rect distinguishes them |
| export after reflow | four open/close cycles, then an export asserted at exactly 1080×1080 from the PNG's IHDR |

```
$ npx playwright test tests/e2e/shell.spec.ts --project=chrome --reporter=line
  3 passed (6.8s)
$ grep -c msedge tests/e2e/shell.spec.ts   -> 0
HARNESS_IMPORTED
```

### Task 4 — the record (commit `69df8c5`)

`MapWorkspace.test.tsx` gained four assertions: the frame is a depth-walked sibling of the export
source inside the canvas region; it carries `data-editor-only` and `aria-hidden`; the two slot
declarations are asserted **byte for byte** and the slot set is asserted to be **exactly those
two**; and both slots still render into their documented positions (legend inside the canonical
SVG, navigation after the canvas region).

`Design.md` § 7.1 now records the OQ-2 resolution as D-32 states it, with the two verified
citations — `useCameraController.ts:310-313` and `MapCanvas.tsx:839-840` — the resulting
"no `ResizeObserver` may be added" rule, the measured 6e-14px agreement, and the **D-20
narrow-width contract as specification for `03-09`**, explicitly marked as not yet built.

```
RECORDED_OK
$ grep -c "^\*Last updated" Design.md   -> 2
```

---

## Deviations from plan

### [Rule 1 - Bug] The plan's frame tolerance could not fail its own probe

Covered in full under **Probe 4**. `≤ 1px` accepts a 1px inset exactly. Measured, tightened to
`0.05px` from a real measurement, and both the reasoning and the number are written into the spec
so a later reader cannot loosen it back by accident. **This is the single most important finding
in the plan.** Commit `fcdb94a`.

### [Rule 3 - Blocking] `grep -rn "ResizeObserver" src/` can never return nothing

The plan's Task 1 verify and its acceptance criteria both require that grep to be empty.
`src/components/Tooltip.tsx` has constructed one since Phase 2 to keep the tooltip chip inside the
viewport, and `Tooltip.test.ts` doubles it. Deleting it would break tooltip positioning; the gate
as written is red on arrival.

The rule D-32 actually needs is *no observer in the projection, camera, or export path*, so
`uiContract.test.ts` asserts the **ownership set** of files under `src/` that mention it is
exactly `{Tooltip.tsx, Tooltip.test.ts}`. That fails on a shell observer and passes on the
tooltip. A gate that is red on arrival gets deleted rather than obeyed — this is that class of
defect, caught at authoring time. Commit `a609a14`.

The identifier is **assembled at runtime** (`['Resize','Observer'].join('')`) rather than written
out, because the file is inside the tree it scans and spelling it would put the gate in its own
result set. Recorded because the trick is otherwise unexplained.

### [Rule 3 - Blocking] `files_modified` omitted the composition root

The plan lists only `editor.css`, `MapCanvas.css`, `uiContract.test.ts`, `main.tsx`,
`MapWorkspace.tsx`, `MapWorkspace.test.tsx`, and `shell.spec.ts`. The mount root, the rail, the
panel, and the panel-open state all live in `src/App.tsx`, and the plan's own `read_first` lists
`App.css` as *"the `.app`, `.app-bar`, `.workspace*` rules the grid replaces"*. `App.tsx`,
`App.test.tsx`, `ErrorBoundary.test.tsx`, `theme.css`, `Controls.css`, and
`phase2CssContract.test.ts` were therefore modified as well. Each is listed in `key-files`.

### [Rule 2 - Correctness] Four existing tests re-pointed, none weakened

| Test | Change | Why it is not a weakening |
|---|---|---|
| `phase2CssContract.test.ts` "keeps the composition square exactly square and opaque" | reads `.map-workspace__canvas` for background/overflow **and `.map-frame` for `aspect-ratio: 1`**, and asserts the region does **not** carry `aspect-ratio` | the plan's own instruction: the assertion survives, relocated. Asserting only the renamed region would have dropped the squareness claim on the rename |
| `App.test.tsx` "places map navigation after the square…" | the upper bound moved from the inspector's first section to the canvas region's own `</section>` | the old bound was "before the inspector", which is meaningless now that the inspector precedes the map. The export-membership claim is unchanged |
| `App.test.tsx` compact section order | `workspace__map` dropped from the list, and two new assertions added — rail before panel, and the canvas region after the last panel section | the map left the section list; the replacement asserts the new documented order rather than simply removing a row |
| `ErrorBoundary.test.tsx` | asserts a **second** boundary around the canvas region | the canvas region left the workspace landmark, so the boundary that covered it by covering the section list no longer reaches it. Without the new assertion the map could lose its boundary while the old test stayed green |

### [Rule 3 - Blocking] `--map-shadow` deleted

The full-bleed canvas region dropped the boxed square's `box-shadow`, which was `--map-shadow`'s
only consumer, and `phase2CssContract.test.ts`'s *"gives every `--map-* token a consumer"* went
red immediately. `Design.md` § 3 already records the token as **deleted** ("a full-bleed canvas
has nothing to elevate"), so it was deleted rather than kept alive by an invented consumer.
Commit `7e2834d`.

### [Rule 2 - Correctness] The pan popover opens upward

`MapNavigation`'s Move Map popover opened downward from a cluster that used to sit above the
inspector. In the canvas region the cluster sits at the bottom edge, so downward put the pad
outside the clipped region and made **the only keyboard pan affordance in the app** unreachable.
One rule in `editor.css` flips it upward for as long as the cluster lives at the bottom; `03-08`
owns the final anchoring. Commit `7e2834d`.

### [Rule 3 - Blocking] The comment discipline caught me once

The Task 1 gate greps for `transition[^;]*grid-template-columns`. My first `editor.css` comment
explained the rejected alternative using that exact literal, and the gate went red on the comment
rather than on any declaration. Reworded to describe the alternative without spelling it — which
is the plan's own comment-discipline rule, recorded here because it fired.

### [Scope — recorded, not fixed] `responsive.spec.ts` is red

See **Legacy e2e** below and `deferred-items.md` § D-1.

---

## Legacy e2e — the honest number

The full Chrome suite was run after the shell landed:

```
$ npx playwright test --project=chrome
  13 failed
  66 passed (5.9m)
```

**One of the 13 was fixed here** (commit `6b2c6eb`): `phase2-composition.spec.ts`'s
`expectDesktopWorkspaceShell` keyed on `main.workspace`'s children, so it failed on the shell
precondition and its real subject — *the inspector keeps its in-progress UI state across the
1200px transition* — never ran at all. It now asserts the canvas region as a **singleton outside
the workspace**, paired with "not inside the workspace", because dropping the row alone would let
the pair pass with no map in the document. That file is now 11/11 green.

**The remaining 12 are all in `responsive.spec.ts` and are deliberately left red**, itemised
test-by-test with their owning plan in
`.planning/phases/03-clean-ui-overhaul-1-1-5-weeks/deferred-items.md` § D-1. `03-09` is already
scoped by the ROADMAP to rewrite that file. Repairing them now would mean asserting an interim
layout that `03-05` replaces, and three of them would have to assert behaviour that approved
decisions have already retired (`--glass-*` deleted by D-06, `prefers-color-scheme` forbidden by
D-30, the app bar dissolved by D-11).

**The hazard is stated rather than smoothed over:** a suite that is red for several plans stops
being read, and `03-12`'s full-gate evidence is not honest until it is clear.

---

## Interim states a later plan must resolve

These are consequences of landing a shell one plan before the containers it replaces are
dissolved. None is a design claim.

1. **The panel holds the old app bar and inspector, and defaults OPEN.** `03-05` dissolves both
   as containers and `03-06` fills the rail; until then this is what keeps every control
   reachable. Three transitional rules in `editor.css` (`.tool-panel__body > .workspace`,
   its control column, and `> header`) neutralise the 1440px page measure inside a 280px track
   and are removed with the containers.
2. **The panel body is unmounted while the track is 0px.** A clipped 0px column still holds live
   tab stops, which is a keyboard trap with nothing visible in it. `03-06` may replace this with
   `inert`; the requirement is that the tab stops go away, not the mechanism.
3. **The shell is structurally correct and visually unpainted.** `.map-editor` consumes
   `var(--themely-platinum)`, which does not exist until `03-04`, so the editor wall paints
   transparent; the rail and panel hairlines consume `--border-default`, which `03-04` retires.
   Both are the delete-don't-alias mechanism working as intended — they fail loudly at `03-04`'s
   gate. Recorded in `deferred-items.md` § D-2.
4. **The composition bar and the navigation cluster are absolutely placed in the canvas region**
   as interim homes. `03-07` builds the real `.period-hud`; `03-08` re-anchors the cluster with
   the letterbox-gutter math and lands assertion 12.

---

## Carry-forward for later plans

- **CF-1 is unchanged by this plan.** `03-02` recorded `--motion-ease-snappy`,
  `--motion-ease-in`, and `--motion-duration-slow` as having the TS mirror for their only reader.
  The shell consumes `--motion-duration-base` and `--motion-ease-out` — genuinely, in
  `editor.css`, for the panel transition — but **neither of those is one of the three**. All
  three remain mirror-only and **`03-04` still owns closing that**.
- **CF-2 (the latin-only Inter subset) is untouched.** Still routed to `03-11`.
- **`03-04`:** `resolveRootTokens` is the one ported helper deliberately **not** carried into
  `uiContract.test.ts` — it has no consumer until the `.dark` contrast matrix lands, and an unused
  function fails lint. Port it with that matrix. Also: `editor.css`'s `--border-default` and
  `--themely-platinum` references (§ Interim 3) are yours.
- **`03-06`:** the rail trigger is a single `<button data-tool="tools" aria-expanded
  aria-controls>` writing `isToolPanelOpen`. Replace the trigger, keep the state and the
  attribute — assertion 10's writer-count gate will fail if a second writer appears.
- **`03-09`:** `deferred-items.md` § D-1 is your worklist, and `Design.md` § 7.1's narrow-width
  table is the specification you implement against rather than invent.
- **`03-10`:** the glob seam exists; assertion 20 is a count comparison against `main.tsx`'s
  import list, which currently has five stylesheets.

---

## What is NOT done

- **No visual, touch, or screen-reader claim is made anywhere in this plan.** The `done` criterion
  asked for a hand check via `npm run dev`; that is a physical claim and an automated result may
  never be substituted for one (Immutable Safety Constraint 8). Every result here is a `node`
  assertion, a file read, or a **measured** browser geometry. **PENDING: a human look at the
  shell.**
- **Chrome 151 is the only browser with evidence.** Edge is **not installed on this machine**
  (D-33) and no Edge result is reported; Firefox and Safari have never been run here and are not
  claimed.
- **`responsive.spec.ts` is red** — 12 tests, itemised and owned. Not "flaky", not "will sort
  itself out".
- **Narrow width is specified, not built.** `Design.md` says so in the section itself.
- **`Design.md` § 7 remains `[FOR REVIEW]`.** The owner has reviewed none of it, including the
  § 7.1 text added here.
- **Nothing is themed yet.** `03-04` lands the palette.
- **Historical geometry is unchanged.** The approved catalog still holds exactly `Modern`; the
  1492 / 1700 / 1815 / 1914 packets remain **deferred for missing rights-cleared source
  material**. Nothing here makes a deferred snapshot nameable or reachable.
- **`.planning/STATE.md` and `.planning/ROADMAP.md` are untouched** — `git status --porcelain` on
  both is empty. Neither `state.advance-plan`, `state.update-progress`, nor
  `roadmap.update-plan-progress` was run.

---

## Known Stubs

One, and it is the plan's own design rather than an omission.

| Stub | File | Why it is intentional | Resolved by |
|---|---|---|---|
| The rail holds one generic `Map tools` trigger instead of the four tool rows, the HUD header, and the HUD footer | `src/App.tsx` (the `.tool-rail` block) | The plan specifies exactly this: *"one keyboard-reachable trigger is enough; 03-06 replaces the trigger with the rail rows. That swap is a trigger change, not an architectural change."* The state, the attribute, the track, and the gates are all real | `03-06` |

No file created by this plan renders a hardcoded empty value, a placeholder string, or an unwired
data source.

---

## Threat Flags

None new. The four threats the plan's register names were all exercised:

| Threat ID | Disposition | Evidence |
|---|---|---|
| T-03-07 (frame placement crossing into the export) | mitigated | Probe 5, after the sibling check was strengthened from a fragile literal to a depth walk. `data-editor-only` is the second line of defence and is asserted separately |
| T-03-08 (shell CSS reaching exported content) | mitigated | the export-unsafe guard is ported at high priority with `EXPORT_CONTENT_PATTERN` bound back to `MapCanvas.tsx`; `.map-frame`'s `box-shadow` is outside the pattern **because the frame is outside the export source**, which is the same fact T-03-07 rests on |
| T-03-09 (animating the grid's track list) | mitigated | the registered `@property` transition, plus a gate that rejects the track list — which fired once, on a comment |
| T-03-10 (a layout gate that cannot fail) | mitigated, and it **caught a live instance** | assertion 11 was GREEN against its own probe as specified. Probes 1-5 above, each with captured output |

---

## Verification

```
$ npm run lint      -> clean
$ npm test          -> Test Files 41 passed (41) · Tests 559 passed (559)
$ npm run build     -> tsc -b clean; built in 85ms

$ npx vitest run src/styles/uiContract.test.ts src/styles/phase2CssContract.test.ts
                    -> Test Files 2 passed (2) · Tests 43 passed (43)
$ npx playwright test tests/e2e/shell.spec.ts --project=chrome
                    -> 3 passed (6.8s)
$ npx playwright test tests/e2e/phase2-composition.spec.ts --project=chrome
                    -> 11 passed (47.9s)
$ npx playwright test --project=chrome
                    -> 66 passed, 13 failed  (12 remaining after 6b2c6eb; all responsive.spec.ts)
```

Plan gates:

```
NO_RESIZE_OBSERVER      (ownership set: the tooltip pair only)
PANEL_TRACK_OK          (@property registered; the track list is not animated)
GLOB_SEAM_OK            (directory walk; no four-filename list survived)
RECORDED_OK             (Design.md carries both citations, the observer rule, --target-compact)
HARNESS_IMPORTED        (shell.spec.ts imports the shared fixtures)
grep -c msedge tests/e2e/shell.spec.ts -> 0
grep -rn "map-workspace__square" src/  -> no output
```

Before this plan (541 tests) → after (559): **+18**, all new. **No existing test was deleted,
skipped, or weakened**; four were re-pointed at the new structure and each is itemised above with
the reason it is not a weakening. One (`MapWorkspace.test.tsx`'s sibling check) was **strengthened
mid-probe** after it proved able to fail for the wrong reason.

---

## Commits

| Hash | Message |
|---|---|
| `7e2834d` | `feat(3-03): land the editor shell grid, the panel track, and the D-32 export frame` |
| `a609a14` | `test(3-03): create uiContract.test.ts with assertions 10 and 16, RED-proven` |
| `fcdb94a` | `test(3-03): measure the export frame against the projected viewBox in Chrome` |
| `69df8c5` | `docs(3-03): record the OQ-2 resolution and gate the frame's placement` |
| `6b2c6eb` | `test(3-03): re-point the composition shell helpers at the new grid` |

---

## Self-Check: PASSED

| Claim | Check |
|---|---|
| `src/styles/editor.css` | FOUND, SHA `b35f1646…2daf` matches the pre-probe value |
| `src/styles/uiContract.test.ts` | FOUND, 14 tests green |
| `tests/e2e/shell.spec.ts` | FOUND, 3 tests green in Chrome |
| `src/styles/MapCanvas.css` | FOUND, SHA `1db5f972…3965` matches the pre-probe value |
| `src/components/MapWorkspace.tsx` | FOUND, SHA `81089bf2…6fe8b` matches the pre-probe value |
| `src/components/MapCanvas.tsx` | FOUND, SHA `189d7532…13db3` matches the pre-probe value |
| `Design.md` § 7.1 OQ-2 / D-20 | FOUND, `RECORDED_OK`, 2 `Last updated` entries |
| `.planning/coding-rules/frontend.md` § The Editor Shell | FOUND, 2 `Last updated` entries |
| `deferred-items.md` | FOUND, 12 red tests itemised with owners |
| commits `7e2834d` `a609a14` `fcdb94a` `69df8c5` `6b2c6eb` | all FOUND in `git log` |
| `.planning/STATE.md`, `.planning/ROADMAP.md` | untouched — `git status --porcelain` empty on both |
| `git checkout --` usage | **none, on any file, at any point** |
