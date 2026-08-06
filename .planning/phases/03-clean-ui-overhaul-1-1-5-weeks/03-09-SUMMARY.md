---
phase: 03-clean-ui-overhaul-1-1-5-weeks
plan: 09
subsystem: responsive-shell
tags: [d-20, d-35, bottom-bar, bottom-sheet, data-layout, assertion-24, assertion-18, red-probe, export-independence, deferred-d-5, responsive-spec]
status: complete

requires:
  - phase: 03-clean-ui-overhaul-1-1-5-weeks
    plan: 03
    provides: "the three-track `.map-editor` grid, the registered `--panel-width`, `.map-frame`, and the `container-type: size` canvas region this plan collapses into one column"
  - phase: 03-clean-ui-overhaul-1-1-5-weeks
    plan: 04
    provides: "the class-based dark flip (D-30) that silently disarmed assertion 24, and assertion 4's CSS-level export firewall"
  - phase: 03-clean-ui-overhaul-1-1-5-weeks
    plan: 06
    provides: "the rail, its pinned HUD blocks, `openRailTool`, and `rail.spec.ts`'s spec'd focus order and assertion 15"
  - phase: 03-clean-ui-overhaul-1-1-5-weeks
    plan: 08
    provides: "the floating cluster in the letterbox gutter, assertion 12's viewport set, and the ~124px near-square bound this plan re-measures"
provides:
  - "D-20: below 1200px the rail is a bottom bar and the panel is a bottom sheet placed in the SAME grid cell as the canvas region — the one surface allowed to overlay the map"
  - "`data-layout` — two-valued, one writer, published from the app's single 1200px literal in `useResponsiveLayout.ts`; gated against any 1100-1299px at-rule condition anywhere in the stylesheets"
  - "a second registered `--panel-height` that animates the sheet, mirroring D-19's `--panel-width`"
  - "D-35/CF-6: assertion 24 re-armed — the theme axis drives the shipped rail toggle instead of an OS colour-scheme emulation, with a source scan forbidding the emulation's return"
  - "the measured finding that the exported PNG is theme-independent by PLACEMENT and inline hard-setting, not by the token contract, and the COMPOSITE defect that can still redden assertion 24"
  - "`tests/e2e/responsive.spec.ts` fully green: 17 of 17, after being red at exactly 12 since `03-03`"
  - "D-5 closed below 1200px, with `640 x 400` back in `GUTTER_VIEWPORTS` and assertion 12 green there"
  - "`collectTabOrder` in `tests/e2e/support/appHarness.ts`, imported by two specs instead of copied"
  - "`coding-rules/export.md` §Theme independence is held by PLACEMENT and hard-setting; `coding-rules/frontend.md` §The Narrow Arrangement"
affects: [03-10, 03-11, 03-12]

actuals:
  tokens: 30000
  tasks: 3
  commits: 3

tech-stack:
  added:
    - "`@property --panel-height` — a second registered length so the bottom sheet interpolates instead of snapping"
    - "`Element.getAnimations()` as a deterministic transition settle in e2e, replacing a two-equal-reads poll that measured a 360ms crossfade as settled at its starting colour"
  patterns:
    - "a layout switch published as a two-valued attribute from the ONE breakpoint literal, with a gate that fails any CSS at-rule restating that number"
    - "FIXED chrome is RE-PLACED into the grid when a layout grows a bar — never fought with z-index"
    - "a geometric gate's viewport membership is RE-MEASURED after a layout change, and is only safe because the exception test asserts its own precondition"
    - "an assertion that a probe shows cannot fail is DELETED and the reason recorded, not left in as decoration"

key-files:
  created: []
  modified:
    - "src/styles/editor.css — the D-20 narrow arrangement"
    - "src/styles/Controls.css — the toast re-placed into the canvas row; the second breakpoint copy re-keyed"
    - "src/App.tsx — publishes `data-layout`"
    - "src/styles/uiContract.test.ts — the D-20 gates and the reduced-transparency existence assertion"
    - "tests/e2e/responsive.spec.ts — rewritten"
    - "tests/e2e/navigation.spec.ts — assertion 12's viewport membership re-measured"
    - "tests/e2e/support/appHarness.ts — `collectTabOrder`"
    - ".planning/coding-rules/export.md, .planning/coding-rules/frontend.md"

key-decisions:
  - "The plan's own RED probe for D-35 (`--map-surface` in `.dark`) does NOT work, and the reason is a correction to the approved plan: the export frame is appended to `document.body`, outside `.dark`'s mount-root scope, and hard-sets background, stroke, and `color-scheme` inline. Assertion 24 was RED-proven on the COMPOSITE defect instead."
  - "The narrow layout keys on a `data-layout` attribute, not a CSS media query, so the app keeps exactly one 1200px literal. A pre-existing `@media (max-width: 1199px)` in `Controls.css` was re-keyed rather than left."
  - "The bottom bar WRAPS rather than scrolls: eight controls at the 44px floor need 408px and the narrowest contained viewport is 360px; an inline scroll container would need `overflow-x`, which belongs to `body` alone."
  - "Assertion 12's viewport membership was re-measured, not re-argued: `1024x900` gained a gutter, `800x900` became the near-square exception, `640x400` returned."
  - "Three of the twelve red tests were DELETED against landed replacements in `rail.spec.ts` and `navigation.spec.ts` rather than repaired into weaker duplicates."
  - "A forced-colors `box-shadow` sweep was deleted after a probe showed Chrome removes shadows in that mode itself, so it could never fail."

patterns-established:
  - "Deterministic transition settling: two frames to let a pending transition register, then await `getAnimations()` — a two-equal-reads poll samples before the transition starts and calls it settled"
  - "A tab-order walk waits for the app's own `requestAnimationFrame` focus to land before resetting the sequential starting point"
  - "A rewritten containment helper is checked for whether its selectors resolve at all — eleven retired selectors measured nothing and read exactly like a pass"

requirements-completed: [D-08, D-20, D-35, A-18, A-24]

coverage:
  - id: D1
    description: "Assertion 24 re-armed against the class-based dark mode: the theme axis toggles `.dark` through the shipped rail control, forced colors and DPR stay real emulations, and the comparison stays pixel identity (D-35)"
    requirement: "D-35"
    verification:
      - kind: e2e
        ref: "tests/e2e/responsive.spec.ts#the PNG is identical across theme, forced colors, and device pixel ratio"
        status: pass
      - kind: e2e
        ref: "tests/e2e/responsive.spec.ts#drives the theme by class and never by an operating-system query"
        status: pass
      - kind: e2e
        ref: "tests/e2e/responsive.spec.ts#the dark theme class restyles chrome and leaves the composition surface fixed"
        status: pass
    human_judgment: false
  - id: D2
    description: "Below 1200px the rail is a bottom bar and a tapped tool raises a bottom sheet over the map, with Export pinned and the canvas region untouched (D-20)"
    requirement: "D-20"
    verification:
      - kind: e2e
        ref: "tests/e2e/responsive.spec.ts#the narrow layout collapses to a bottom bar without a second DOM"
        status: pass
      - kind: e2e
        ref: "tests/e2e/responsive.spec.ts#a tapped tool raises a bottom sheet over the map, above the bar"
        status: pass
      - kind: unit
        ref: "src/styles/uiContract.test.ts#collapses to one column with the sheet over the canvas cell"
        status: pass
    human_judgment: false
  - id: D3
    description: "Assertion 18: `touch-action: none` has exactly one owner, asserted as an ownership set because the bottom sheet introduces new ancestors of the canvas"
    requirement: "A-18"
    verification:
      - kind: unit
        ref: "src/styles/uiContract.test.ts#scopes touch-action to the interactive square alone"
        status: pass
    human_judgment: false
  - id: D4
    description: "360px containment and the 200%-equivalent viewport hold in the new chrome, with the panel body as the single scroll container"
    requirement: "D-08"
    verification:
      - kind: e2e
        ref: "tests/e2e/responsive.spec.ts#the complete UI contains at 360px with no overflow and full-size targets"
        status: pass
      - kind: e2e
        ref: "tests/e2e/responsive.spec.ts#core controls stay usable at the 200% zoom equivalent viewport"
        status: pass
    human_judgment: false
  - id: D5
    description: "Preference behaviour re-verified in the new chrome: reduced motion by observable result, contrast in both modes, forced colors on what a forced palette cannot express, reduced transparency asserted statically with no emulation attempt"
    requirement: "A-24"
    verification:
      - kind: e2e
        ref: "tests/e2e/responsive.spec.ts#reduced-motion preference removes every authored transition"
        status: pass
      - kind: e2e
        ref: "tests/e2e/responsive.spec.ts#increased-contrast preference strengthens boundaries and focus rings in both modes"
        status: pass
      - kind: e2e
        ref: "tests/e2e/responsive.spec.ts#forced-colors preference removes the effects a forced palette cannot express"
        status: pass
      - kind: unit
        ref: "src/styles/uiContract.test.ts#restores the one translucent surface under reduced transparency, in both modes"
        status: pass
    human_judgment: false
  - id: D6
    description: "The narrow layout's visual quality, touch reachability of the bottom bar, and screen-reader behaviour of the bottom sheet"
    verification: []
    human_judgment: true
    rationale: "Touch targets, screen-reader output, and visual judgement are physical claims. Every automated result above is a layout measurement; none of them is evidence that the bar is comfortable under a thumb or that the sheet announces correctly. PENDING the owner acceptance matrix."

duration: 57min
completed: 2026-08-06
---

# Phase 3 Plan 09: Narrow Width and the Re-armed Export Gate — Summary

**The dark-mode switch had silently disarmed Live Invariant 9's browser-level guard and left the
responsive suite red at twelve tests for six plans; the gate is re-armed and RED-proven, the
suite is green at 17 of 17, and the shell now collapses to a bottom bar and bottom sheet below
1200px.**

## Performance

- **Duration:** 57 min
- **Tasks:** 3 of 3
- **Files modified:** 11
- **Chrome e2e:** **100 passed / 0 failed** (100 total) — the whole suite is green for the first
  time since `03-03`

## Browser scope

**Chrome only — Chrome 151.0.7922.75. Edge not certified: not installed on this machine (D-33).**
No `msedge` project was run and no Edge result is claimed anywhere in this plan.
`STATE.md`'s Phase 2 Edge record is deliberately not cited: it is immutable Phase 2 evidence to be
annotated rather than rewritten, and resolving the contradiction is filed against Phase 2.
Firefox, Safari, and previous-version certification have never been run in this repository and are
not claimed here.

## Accomplishments

- **Assertion 24 re-armed (D-35 / CF-6).** The theme axis now toggles `.dark` on the editor mount
  root through the shipped rail control rather than emulating an operating-system colour scheme,
  which D-30 had turned into a no-op. Forced colors and device pixel ratio stay real emulations and
  the comparison is still pixel identity. A source scan in the spec forbids the emulation's return.
- **A correction to the approved plan, measured rather than argued** — see *Assertion 24 RED proof*
  below. The plan's prescribed probe cannot redden this gate, and the reason is structural.
- **`responsive.spec.ts` is fully green at 17 of 17** (was 12 red out of 18/19 since `03-03`).
  Nine were rewritten, three were deleted against landed replacements, two were added.
- **D-20 shipped.** Below 1200px the three-track row becomes one column: the canvas region on top,
  the rail lying down as a bottom bar, and the panel rising as a bottom sheet placed in the *same
  grid cell* as the canvas region — which is what makes it an overlay rather than a fourth track.
- **D-5 closed below 1200px.** `640 × 400` is back in `GUTTER_VIEWPORTS` and assertion 12 is green
  there. The desktop residue is recorded openly rather than folded into the close.
- **Six RED probes executed**, one of which deleted an assertion this plan had itself just written.

---

## Task Commits

1. **Task 1: Re-arm assertion 24 (D-35)** — `8be7485` (test)
2. **Task 2: Narrow width, bottom bar and bottom sheet (D-20) + assertion 18** — `b7c2446` (feat)
3. **Task 3: 360px containment, the 200%-equivalent, and preference behaviour** — `7467277` (test)

---

## Assertion 24 RED proof (verbatim output)

### The plan's prescribed probe DID NOT redden assertion 24, and that is the finding

The plan's Task 1 step C directed: add a `.dark` override for `--map-surface` ("the clearest"
export token), run the preference tests, and observe assertion 24 fail. It was done exactly as
written. **Assertion 24 stayed green.**

```
########## PROBE A — .dark { --map-surface: #101010 } ##########
[1/1] responsive.spec.ts:1184 › preference-independent export › the PNG is identical across
      theme, forced colors, and device pixel ratio
  1 passed (10.1s)
```

The reason is structural, and it is now recorded in `coding-rules/export.md`. The exported PNG is
immune to **every** CSS custom property today, through three independent mechanisms:

1. `createExportFrame` appends the frame to `document.body` — **outside** `.map-editor`, and D-30
   scopes `.dark` to that mount root, so the clone is never in the theme's scope at all;
2. the frame and the cloned `svg` both hard-set `background` / `background-color` inline to
   `EXPORT_BACKGROUND_COLOR`, and `html2canvas` is passed the same colour a third time;
3. `sanitizeExportClone` hard-sets `stroke` / `stroke-width` inline from `DEFAULT_BORDER_COLOR`,
   and the legend paints from the `THEME_COLORS` TS literals rather than from `var()`.

Both also pin `style.colorScheme = 'light'`.

So Live Invariant 9's token contract is currently enforced **only** by assertion 4 at the CSS
level. Assertion 24 does not back it up on the token axis, and describing it as the token
contract's browser-level guard would be false. That is defence in depth working — but the plan's
premise needed correcting, not repeating.

### Assertion 4 DID redden, simultaneously and as predicted

The plan warned to expect a second failure and not to read it as a broken probe. It happened:

```
########## PROBE A2 — assertion 4 (CSS firewall) with .dark { --map-surface } ##########
 FAIL  src/styles/uiContract.test.ts > Phase 3 export firewall (assertions 4 and 5) >
       declares no export token outside the unconditioned root
AssertionError: theme.css: "--map-surface" is mode-invariant and must stay fixed; found under
[] .dark. Redefining it makes the exported PNG follow the viewer theme.:
expected true to be false // Object.is equality
- Expected
+ Received
- false
+ true
 ❯ src/styles/uiContract.test.ts:1425:13

 FAIL  src/styles/uiContract.test.ts > Phase 3 export firewall (assertions 4 and 5) >
       declares every export token exactly once, and gives each one a consumer
AssertionError: "--map-surface" is declared more than once: expected [ …(2) ] to have a length
of 1 but got 2
 Test Files  1 failed (1)
      Tests  2 failed | 49 passed (51)
```

Two gates going red at once on one deliberate defect is correct and by design. In this case only
one of them — the CSS-level one — actually covers the token.

### The COMPOSITE probe that DID redden assertion 24

For the browser gate to fail on the theme axis, the defect has to have **both halves**: the theme
class escaping above the mount root, *and* a theme-conditional paint on map geometry the clone does
not hard-set. Both are real, single-change regressions — the first is the hazard `App.tsx`'s own
comment records verbatim ("Written to the host page's root element instead, a host could not
override it and would have two writers of one theme").

Probe: `App.tsx` gained
`document.documentElement.classList.toggle('dark', themeMode === 'dark')`, and `MapCanvas.css`
gained `.dark .scene-path { fill: #101010; }`.

```
########## PROBE B — assertion 24 vs a theme-sensitive export ##########
[2/2] responsive.spec.ts:1184 › preference-independent export › the PNG is identical across
      theme, forced colors, and device pixel ratio
  1) the PNG is identical across theme, forced colors, and device pixel ratio

    Error: expect(received).toStrictEqual(expected) // deep equality

    - Expected  - 63
    + Received  + 63

    @@ -58,20 +58,20 @@
          255,
          255,
          255,
        ],
        Array [
    -     255,
    -     255,
    -     255,
    +     16,
    +     16,
    +     16,
          255,
        ],
        Array [
    -     255,
    -     255,
    +     16,
    +     16,
    +     16,
          255,
    -     255,
        ],
    ...
    -     64,
    -     64,
    -     64,
    +     4,
    +     4,
```

The exported square genuinely diverged in the dark context: sampled pixels moved from
`255,255,255` to `16,16,16`. **The gate is armed against the defect that can actually occur.**

**Restoration was done by copying the scratchpad file back**, never with `git checkout --`, for
every probe in this plan. `src/styles/theme.css`, `src/App.tsx`, `src/styles/MapCanvas.css`,
`src/styles/editor.css`, `src/components/editor/ToolPanel.tsx`, and
`tests/e2e/responsive.spec.ts` were each copied to the session scratchpad before being broken and
restored by copying back; `git status` and `git diff --stat` were checked empty after each one.

### This proof is re-taken by `03-11`

`03-11` replaces the entire rasterisation path (D-34), and its governing rule is that a test which
passed against html2canvas and still passes has not been shown to test the new code. `03-11` Task 7
probe 9 re-runs exactly this probe against the replacement. **It should also re-run the
single-token probe**: if the new path resolves CSS in the clone's own scope, `.dark { --map-surface }`
becomes a valid discrimination control and assertion 24 becomes the token contract's browser-level
guard for the first time. The whole analysis above expires with html2canvas.

---

## RED probes (6, with output)

| # | Subject | Break applied | Result |
|---|---|---|---|
| A | assertion 24, theme axis | `.dark { --map-surface: #101010 }` | **stayed GREEN** — recorded above as the finding |
| A2 | assertion 4, CSS export firewall | same break | **RED**, output above |
| B | assertion 24, theme axis | theme class above the mount root + `.dark .scene-path { fill }` | **RED**, output above |
| C | the source scan (D-35 step D) | re-added `page.emulateMedia({ colorScheme: 'light' })` | **RED** |
| D | assertion 18, `touch-action` ownership set | `touch-action: none` on the bottom sheet | **RED** |
| E | 360px containment | the sheet body given `width: 420px` | **RED** |
| F | reduced motion | `--motion-duration-base` removed from the zeroing block | **RED** |
| G | the panel scroll-container ownership set | a second scroller inside the panel | **RED** |
| H | forced colors, shadow sweep | the cluster hard-codes its shadow | **stayed GREEN** → assertion deleted |
| H2 | forced colors, boundary weights | `--border-width: 2px` removed from the block | **RED** |

Verbatim output for the non-obvious ones:

```
########## PROBE C — the source scan vs a surviving colour-scheme emulation ##########
    Error: D-30 forbids the colour-scheme query; emulating it changes nothing in this app, so a
    theme axis built on it is a gate that cannot fail.
    expect(received).toBe(expected) // Object.is equality
    Expected: false
    Received: true
      > 918 |     ).toBe(false);
```

```
########## PROBE D — assertion 18 ownership set vs touch-action on the bottom sheet ##########
     × scopes touch-action to the interactive square alone 3ms
AssertionError: expected [ '.map-canvas', …(1) ] to strictly equal [ '.map-canvas' ]
      Tests  1 failed | 55 passed (56)
```

```
########## PROBE E — 360px containment vs a panel body wider than the viewport ##########
    Error: expect(received).toStrictEqual(expected) // deep equality
    - Array []
    + Array [
    +   Object { "height": 359,   "label": "div.tool-panel__body",    "right": 420, "width": 420 },
    +   Object { "height": 10139, "label": "div.tool-panel__content", "right": 420, "width": 420 },
    +   Object { "height": 80,    "label": "div.tool-panel__title-row","right": 420, "width": 420 },
    +   Object { "height": 48,    "label": "button.tool-panel__close tool-rail__action", ... },
    ...  (65 entries)
```

```
########## PROBE F — reduced motion vs an un-zeroed duration token ##########
    Error: expect(received).toBe(expected) // Object.is equality
    Expected: "0ms"
    Received: "240ms"
    > 1140 |     expect(motion.camera).toBe('0ms');
```

```
########## PROBE G — the panel scroll-container ownership set vs a second scroller ##########
    Error: expect(received).toStrictEqual(expected) // deep equality
    - Array [ "div.tool-panel__body" ]
    + Array [ "div.tool-panel__content" ]
    > 714 |     expect(await findPanelScrollContainers(page)).toStrictEqual([
```

```
########## PROBE H2 — forced colors vs an un-strengthened boundary weight ##########
    Error: expect(received).toBe(expected) // Object.is equality
    Expected: "2px"
    Received: "1px"
    > 1311 |     expect(forced.border).toBe('2px');
```

### An assertion this plan wrote, probed, and deleted

Probe H is the one worth reading twice. The forced-colors rewrite first swept the whole mount root
for any painted `box-shadow`, on the reasoning that a hairline is a `box-shadow` and so "nothing
paints a shadow" is the observable form of the three shadow-token assertions above it. The probe
hard-coded a shadow on the camera cluster, bypassing the token entirely — and the test **stayed
green**. Chrome removes every `box-shadow` in forced-colors mode itself, so the user agent
guaranteed the assertion. It read as proof of three token assertions and proved nothing about any
of them.

It was **deleted**, not weakened, and replaced by the painted boundary **widths** — which forced
colors does not touch, and which probe H2 reddens. That is the seventh un-failable assertion this
repository has caught, and the first one caught before it shipped.

---

## D-20: the narrow arrangement

| Element | What landed |
|---|---|
| Rail | `grid-row: 2` bottom bar, full width, every control at or above the 44px `--target-compact` floor, `data-editor-only="true"` |
| Panel | bottom sheet in the **same grid cell** as the canvas region, `align-self: end`, entering on `--motion-duration-base` / `--motion-ease-out` and exiting on `--motion-ease-in` |
| Floating cluster | unchanged; it lives inside the canvas region and now sits directly above the bar, still outside the frame at every gate viewport |
| HUD header / footer | folded into the bar as inline groups; the identity block truncates to nothing at 360px so the controls never do, and `Export PNG` is `flex: 0 0 auto` with `margin-inline-start: auto` |

**Measured geometry (Chrome 151, this branch):**

| viewport | canvas region | difference | verdict |
|---|---|---|---|
| 1440 × 900 | 1384 × 900 | 484 | desktop, unchanged |
| 1300 × 900 | 1244 × 900 | 344 | desktop, unchanged |
| 1024 × 900 | 1024 × 843 | 181 | inline gutter, 90px per side |
| 800 × 900 | 800 × 843 | 43 | **near-square** — the bounded exception |
| 640 × 400 | 640 × 343 | 297 | inline gutter, 148px per side |
| 360 × 740 | 360 × 631 | 271 | block gutter, 135px per side |

### Three decisions inside D-20 worth recording

**The breakpoint has exactly one copy, and it is not in CSS.** `useResponsiveLayout.ts` owns the
`(min-width: 1200px)` literal and `App` publishes `data-layout` (`'desktop' | 'compact'`, never
absent, exactly one writer). A new gate fails any at-rule condition in the 1100–1299px range —
and it immediately caught a **pre-existing second copy** in `Controls.css` (`@media (max-width:
1199px)`, inspector padding), which was re-keyed rather than left. Before D-20 that was a tidiness
point; with the shell collapsing at the same number, the two copies drifting would move the layout
and the padding apart with nothing failing.

**The bar wraps rather than scrolls, and the arithmetic is the reason.** Six 48px tool controls
plus Export plus the theme toggle need 408px with their gaps; 360px is the narrowest contained
viewport. Shrinking a control breaks the 44px floor, and an inline scroll container needs
`overflow-x`, which belongs to `body` alone — on any other element the unstated axis computes to
`auto` and silently makes it a scroll container, which the landed gate correctly rejected when it
was tried. A wrapped second line keeps every control visible and costs the canvas 48px of height at
one viewport.

**Fixed chrome had to be re-placed, twice, and neither was predicted.** The toast was
`position: fixed` to the viewport's bottom edge and landed squarely on the bar: at 360 × 740 its
dismiss button intercepted every click aimed at a tool row, and nothing failed except one
`navigation.spec.ts` case that happened to open a tool after a status message. Re-anchoring it to
the bar's top was not enough either — it then covered the open sheet's legend position grid. It now
joins the grid in the canvas row and reads `var(--panel-height)` in its `margin-block-end`, so it
rides up with the sheet on the same curve. Neither collision was reasoned about in advance; both
were measured.

---

## D-5: closed below 1200px, open above it

**Closed for every viewport the suite gates.** The bar has no 48px column to overflow, so
`640 × 400` measures the `640 × 343` region its viewport implies rather than the stretched
`584 × 500` the rail overflow produced. `640 × 400` is back in `GUTTER_VIEWPORTS` in
`navigation.spec.ts` and **assertion 12 is green there** — the exact observable `deferred-items.md`
recorded as the close condition. The inline gutter is 148px against the 62px the cluster needs.

**Not closed at 1200px or wider.** The desktop rail still has no scroll container and still needs
about 492px of height (64 header + 6 × 48 rows + gaps + 112 footer + padding); below that the rows
overflow instead of scrolling. The original trade stands — every row is icon-only and its tooltip
has to escape the 48px column, and `overflow-y: auto` computes `overflow-x: auto` and clips it.
No fix was shipped and none was attempted beyond analysis. Two candidates were considered and
rejected: `overflow-clip-margin` (its interaction with a scroll container is unverified and would
have to be measured in a browser before it could be believed) and a negative-margin clip-box
widening (it makes the tools column 248px wide and steals hit area from the panel track). No gate
viewport is that shape, which is precisely why it is written down.

### Assertion 12's viewport membership was re-measured, not re-argued

The bar takes *height* where the rail took *width*, which moves every compact shape across the
~124px near-square bound. `1024 × 900` gained a real 181px letterbox and **joined**
`GUTTER_VIEWPORTS`; `800 × 900` fell to 43px and **became** the bounded-exception viewport;
`640 × 400` **returned**. The measurement table lives beside the list in `navigation.spec.ts`.

This swap is only safe because the exception test asserts its **own precondition**
(`difference < 124`, with the message *"this viewport is no longer near-square; the exception moved
and this test is measuring the wrong thing"*). A viewport in the wrong list fails on that rather
than passing quietly. No row was moved to make an assertion pass.

---

## The responsive suite: 17 of 17

Red at exactly 12 since `03-03`, re-measured after every plan since. **Nine rewritten, three
deleted, two added.** The full disposition table is in `deferred-items.md` under the closed D-1.

### Rewrites (9) — the assertion was re-pointed at the chrome that exists

| Test | Why a rewrite rather than a repair |
|---|---|
| *the desktop shell is map-first…* | measured `.map-workspace__square` (renamed by `03-03`) and `.workspace__control-column` (dissolved by `03-05`) |
| *the shell never scrolls and the pinned HUD blocks never move* | "the app bar stays pinned" is a claim about a container `03-05` retired; the successor is the D-12/D-13 claim, and it first asserts the body HAS something to scroll |
| *the narrow layout collapses to a bottom bar without a second DOM* | asserted a two-column then single-column `.workspace__*` arrangement that no longer exists |
| *the complete UI contains at 360px…* | its overflow helper named **eleven retired selectors**, so it measured nothing and passed at every viewport |
| *…cluster is a sibling of the export source, never inside it* | the export-membership half kept and asserted as DOM ORDER; the "below the square" half dropped, since D-21 moved the cluster into the gutter |
| *the narrow focus order is the desktop order, unchanged by the bar* | the old compact order named the retired `Save or Load Maps` opener; the new claim is the load-bearing D-20 one |
| *the dark theme class restyles chrome…* | D-35, above |
| *increased-contrast… in both modes* | read a renamed selector and **threw inside `page.evaluate`**, so the two assertions that would have passed never ran either |
| *forced-colors preference removes the effects a forced palette cannot express* | D-06 deleted the glass family outright — there was no glass surface left to assert |

### Deletions (3) — superseded by a landed, passing replacement

- *the navigation cluster never overlaps the legend at any legend position* → `navigation.spec.ts`
  assertion 12 (non-intersection with `.map-frame` at five viewports × five presets) implies it and
  covers four more viewports.
- *the desktop app bar carries the global actions in the declared order* → `rail.spec.ts`
  *assertion 15*.
- *the desktop focus order runs bar, composition bar, map, navigation, inspector* → `rail.spec.ts`
  *runs the spec'd focus order, with disabled controls removed*.

Each deletion leaves a comment in `responsive.spec.ts` naming where the claim went. Deleted rather
than skipped: a skipped gate is a gate that cannot fail wearing a different hat.

### Additions (2)

- *a tapped tool raises a bottom sheet over the map, above the bar* (D-20).
- *drives the theme by class and never by an operating-system query* — the source scan D-35 asks
  for, extended to forbid a `prefers-reduced-transparency` emulation as well.

### The 200%-equivalent label is unchanged

The halved CSS viewport is labelled the **equivalent** of 200% zoom in the constant's comment, in
the test name (*core controls stay usable at the 200% zoom equivalent viewport*), in the
`GUTTER_VIEWPORTS` entry (*compact 640x400 (the 200% equivalent)*), and here. Playwright cannot
drive the browser's own zoom control. **This is not physical zoom evidence and is not reported as
any.** `02-28` still owns the physical cell.

### `prefers-reduced-transparency` is asserted statically

No Playwright emulation exists and none was added — emulation a browser does not support is not
evidence. The static assertion was **strengthened**: the existing both-modes gate compares the
override sets of `:root` and `.dark`, which cannot see a *deleted* at-rule (two empty sets are
equal). A new assertion uses `findRule`, which throws when the rule is absent, so deleting the
block now fails.

---

## Files Created/Modified

- `src/styles/editor.css` — the D-20 narrow arrangement; `@property --panel-height`
- `src/styles/Controls.css` — the toast re-placed into the canvas row; the second breakpoint copy re-keyed off `data-layout`
- `src/App.tsx` — publishes `data-layout` from `useResponsiveLayout`
- `src/styles/uiContract.test.ts` — five D-20 gates (no second breakpoint, two-valued attribute, one writer, the collapsed grid, the registered sheet height) plus the reduced-transparency existence assertion
- `tests/e2e/responsive.spec.ts` — rewritten; 17 tests
- `tests/e2e/navigation.spec.ts` — assertion 12's viewport membership re-measured, with the table
- `tests/e2e/support/appHarness.ts` — `collectTabOrder` promoted here
- `tests/e2e/rail.spec.ts` — its local `collectTabOrder` copy removed in favour of the shared one
- `.planning/coding-rules/export.md` — §Theme independence is held by PLACEMENT and hard-setting
- `.planning/coding-rules/frontend.md` — §The Narrow Arrangement
- `.planning/phases/03-.../deferred-items.md` — D-1 closed, D-5 closed below 1200px

`src/utils/export.ts` is **byte-unchanged** (`git diff 3351b18..HEAD -- src/utils/export.ts` is
empty); it is owned by `03-11`.

## Decisions Made

1. **The plan's `--map-surface` probe was reported as not working rather than substituted
   silently.** The plan said "If the assertion does not fail in step 3, the rewrite did not take
   and the gate is still dead. Stop, report, and fix the rewrite." The rewrite *had* taken — the
   theme axis genuinely drives the class, provable by the composite probe — but the prescribed
   discrimination control does not reach exported pixels in this codebase. Both facts are recorded,
   in the SUMMARY and in `coding-rules/export.md`.
2. **`data-layout` over a CSS media query** (owner-authorised proceed; no artifact contradicts it).
   The plan's acceptance criterion is "no second breakpoint is introduced" — a media query at
   1199px would have been literally that.
3. **The bar wraps rather than scrolls**, on the arithmetic above.
4. **Three superseded tests deleted rather than repaired into weaker duplicates.**
   `deferred-items.md` explicitly sanctioned this for two of them and `03-08` recorded the third.
5. **Assertion 12's viewport membership recomputed from the same derived bound**, with the
   measurement table beside the list.

## Deviations from Plan

### 1. [Rule 1 — Bug] The theme settle loop measured a 360ms crossfade as settled at its start

- **Found during:** Task 1.
- **Issue:** The inherited "poll to two equal consecutive reads" pattern calls its predicate
  immediately, so both samples land microseconds apart, before the class change has been flushed
  into a running transition. The dark wall read as still white and the test failed intermittently
  (it passed alone and failed in a batch).
- **Fix:** `settleThemeSurfaces` — two frames to let a pending transition register, then await the
  `finished` promises of `getAnimations()`, scoped to the two elements under test so an unrelated
  animation elsewhere can never hang it.
- **Committed in:** `8be7485`.

### 2. [Rule 2 — Missing critical functionality] The toast covered the bottom bar, then the sheet

- **Found during:** Task 2, caught by `navigation.spec.ts` at 360 × 740.
- **Issue:** `position: fixed` chrome pinned to the viewport's bottom edge sits on top of a bar that
  did not exist when it was written. Its dismiss button intercepted every click aimed at a tool row.
  Anchoring it above the bar then put it over the open sheet's controls.
- **Fix:** the toast joins the grid in the canvas row and its `margin-block-end` reads
  `var(--panel-height)`. Recorded as a rule in `frontend.md` — z-index is not the fix.
- **Committed in:** `b7c2446`.

### 3. [Rule 2] A pre-existing second copy of the layout breakpoint in `Controls.css`

- **Found during:** Task 2, by the new gate, on its first run.
- **Fix:** re-keyed onto `data-layout`, preserving the padding behaviour exactly.
  `.locate-country` was deliberately excluded — a layout-scoped rule would outrank its
  `padding: 0` inside the panel and give it padding back.
- **Committed in:** `b7c2446`.

### 4. [Rule 1] `collectTabOrder` read `Export PNGExport PNG`

- **Found during:** Task 3. `responsive.spec.ts`'s local copy read raw `textContent`, which
  includes the `aria-hidden` tooltip chip. `rail.spec.ts` had already solved this in its own local
  copy.
- **Fix:** the correct version promoted into `support/appHarness.ts` and imported by both; both
  local copies deleted. Support fixtures are shared, never copied.
- **Committed in:** `7467277`.

### 5. [Rule 1] The tab-order walk raced App's own `requestAnimationFrame` focus

- **Found during:** Task 3. `waitForApp` dismisses onboarding and App then focuses the map from a
  rAF callback. Resetting the sequential starting point before that callback ran let the map take
  it straight back, so the walk began at the camera cluster — an order that looks plausible and is
  not the spec'd one.
- **Fix:** poll until the app's own focus has landed on a country path before resetting.
- **Committed in:** `7467277`.

### 6. [Rule 1] An un-failable assertion written by this plan, caught by its own probe

Probe H, described in full above. The forced-colors shadow sweep was deleted and replaced.

**Total deviations:** 6 auto-fixed (4 × Rule 1, 2 × Rule 2). No architectural change; no Rule 4
decision arose. **Impact:** none on scope; every one was necessary for correctness and five of the
six were found by a gate rather than by inspection.

## Issues Encountered

- **The near-square/gutter viewport swap looked like weakening a gate and was not.** Moving
  `800 × 900` out of `GUTTER_VIEWPORTS` is exactly the shape of a bad change. It is defensible only
  because the exception test asserts its own precondition, so both lists are checked against the
  same derived bound and a viewport in the wrong one fails.
- **`03-08`'s design paid off here.** `navigation.spec.ts` failed immediately and legibly on the
  toast collision at 360 × 740 — a gate written for a different subject caught a regression the
  layout change introduced, which is what the non-intersection form buys.

## Owner gates still PENDING

Nothing in this plan is a physical claim, and nothing here may be read as one:

- **The bottom bar under a real thumb**, the bottom sheet's screen-reader announcement, and the
  visual quality of the wrapped two-line bar at 360px are **PENDING** the owner acceptance matrix.
  Every result above is a layout measurement in Chrome.
- **The 200%-equivalent viewport is an emulation.** The physical 200%-zoom cell is `02-28`'s.
- **`prefers-reduced-transparency`** has no browser evidence and is asserted statically only.
- **`Design.md` § 7 is still `[FOR REVIEW]`** (deferred D-3); the D-20 record inside it is
  unreviewed, and implementing it here does not review it.
- The owner's session authorisation was a **blanket, in-advance, sight-unseen proceed-authorisation**
  (Immutable Safety Constraint 8). It authorised proceeding. It is **not** a content review of
  anything in this plan and it is not hash-bound.

## Next Phase Readiness

**For `03-10`:** `Controls.css` now carries the toast's layout-scoped rule beside its base rule —
keep them together when splitting the file. CF-7 (`--success`/`--warning` collapse) and the
unconsumed `CrosshairIcon`/`PlusIcon`/`MinusIcon` provenance are untouched and still `03-10`/`03-11`.

**For `03-11` — three things, in priority order:**

1. **Re-run BOTH assertion-24 probes against the replaced rasterisation path** (Task 7 probe 9).
   The composite probe is the one that reddens today; the single-token `--map-surface` probe should
   be re-tried, because if the new path resolves CSS in the clone's own scope it becomes valid and
   assertion 24 becomes Live Invariant 9's browser-level guard for the first time. The whole
   `coding-rules/export.md` §Theme independence analysis expires with html2canvas.
2. `src/utils/export.ts` is byte-unchanged and untouched by this plan.
3. CF-2 (the latin-only Inter subset) is untouched.

**For `03-12`:** the full-gate evidence is now honest — `npm run lint`, `npm test` (626 unit tests),
`npm run build`, and **100 of 100 Chrome e2e tests** all pass, with no red file carried. The one
open engineering item this plan leaves is the D-5 desktop residue, recorded with its exact bound in
`deferred-items.md`.

**Not done, and not claimed:** Edge, Firefox, Safari, previous-version certification, and every
physical acceptance cell.

---
*Phase: 03-clean-ui-overhaul-1-1-5-weeks*
*Plan: 09*
*Completed: 2026-08-06*
