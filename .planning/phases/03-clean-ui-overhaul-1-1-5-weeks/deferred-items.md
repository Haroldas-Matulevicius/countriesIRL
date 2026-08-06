# Phase 3 — deferred items

Out-of-scope discoveries recorded rather than fixed, with the plan that owns each.

---

## D-1 — `tests/e2e/responsive.spec.ts` is RED after `03-03` (12 tests) — **CLOSED by `03-09`**

**Closed 2026-08-06.** `responsive.spec.ts` is **fully green: 17 of 17 on Chrome 151**, and the
file has been red since `03-03`. Nine of the twelve were REWRITTEN and three were DELETED against
a landed replacement; nothing was skipped, and no assertion was weakened to reach green.

| Failing test | Disposition |
|---|---|
| the desktop workspace is map-first with one camera owner and exact landmarks | **rewritten** → *the desktop shell is map-first…*: measured against `.map-workspace__square` (renamed) and `.workspace__control-column` (dissolved), so it now measures the three tracks and the export frame |
| the app bar stays pinned while the responsive workspace scrolls | **rewritten** → *the shell never scrolls and the pinned HUD blocks never move*: the successor claim D-12/D-13 actually make, and it first asserts the panel body HAS something to scroll |
| the compact sub-layouts respond at 1024 and 768 without a second DOM | **rewritten** → *the narrow layout collapses to a bottom bar without a second DOM* (D-20), asserting no gap and no overlap between the bar and the region |
| the complete UI contains at 360px with no overflow and full-size targets | **rewritten**. Its overflow helper named eleven retired selectors, so it measured NOTHING and passed at every viewport — the worst state a containment check can be in |
| the map navigation cluster sits below the square outside the export source | **rewritten** → *…is a sibling of the export source, never inside it*: the export-membership half kept and asserted as DOM ORDER; the "below" half dropped, since D-21 moved the cluster into the gutter |
| the navigation cluster never overlaps the legend at any legend position | **deleted**, superseded by `navigation.spec.ts` assertion 12 (non-intersection with `.map-frame` at five viewports × five presets, which implies this) |
| the desktop app bar carries the global actions in the declared order | **deleted**, replaced by `rail.spec.ts` *assertion 15: one Reset View, one Reset All Colors, one filled action* |
| the desktop focus order runs bar, composition bar, map, navigation, inspector | **deleted**, replaced by `rail.spec.ts` *runs the spec’d focus order, with disabled controls removed* |
| the responsive focus order follows the declared workflow | **rewritten** → *the narrow focus order is the desktop order, unchanged by the bar*: the load-bearing D-20 claim, since the bar paints last through `grid-row` and must still focus first |
| dark preference restyles chrome and leaves the composition square white | **rewritten** for D-35 — the theme axis drives the shipped toggle, not an OS query |
| increased-contrast preference strengthens boundaries and focus rings | **rewritten**, now checked in BOTH modes. The old one read a renamed selector and threw inside `page.evaluate`, so the two assertions that would have passed never ran either |
| forced-colors preference drops every glass surface to opaque | **rewritten**. D-06 deleted the glass family outright, so there was no glass left to assert; it now covers the weights, the shadow tokens, and the `backdrop-filter` ban |

Two tests were ADDED: *a tapped tool raises a bottom sheet over the map, above the bar* (D-20) and
*drives the theme by class and never by an operating-system query* (the source scan D-35 asks for).
18 − 3 + 2 = **17**.

**One assertion was written and then deleted for being unfailable**, and it is recorded here rather
than quietly dropped: the forced-colors rewrite first swept the mount root for any painted
`box-shadow`. Chrome removes every `box-shadow` in forced-colors mode itself, so the sweep was
guaranteed green by the user agent and stayed green against a rule that hard-coded a shadow. It
read as proof of the three token assertions above it and proved nothing about them. It was replaced
by the painted boundary WIDTHS, which forced colors does not touch and which RED-prove.

The original record follows, unchanged.

---

## D-1 (original record) — `tests/e2e/responsive.spec.ts` is RED after `03-03` (12 tests)

**Found during:** `03-03`, running the full Chrome suite after the shell landed.
**Status:** 66 of 79 Chrome e2e tests pass. All 13 failures were in two files; the
`phase2-composition.spec.ts` one was fixed in `03-03` (commit `6b2c6eb`). The remaining **12 are
all in `responsive.spec.ts`**.

**Owner: `03-09`**, which the ROADMAP already scopes as *"a rewritten `responsive.spec.ts` whose
theme axis toggles the class and is RED-proven by a deliberately theme-sensitive export, plus the
narrow-width layout and assertion 18's ownership set."*

Not fixed in `03-03` on purpose: most of these assert an app-bar/inspector layout that `03-05`
dissolves, a `--glass-*` family that `03-04` deletes, and a `prefers-color-scheme` dark path that
D-30 forbids. Repairing them against the interim shell would mean writing assertions against a
layout that is replaced two plans later, and three of them would have to assert behaviour that
approved decisions have already retired.

| Failing test | Why it fails now | Plan that resolves it |
|---|---|---|
| the desktop workspace is map-first with one camera owner and exact landmarks | the canvas region is no longer a workspace section | `03-05` / `03-09` |
| the app bar stays pinned while the responsive workspace scrolls | `.app > header` no longer matches; `03-05` retired the bar as a container, so "stays pinned" is a claim about something that no longer exists | ~~`03-05`~~ → `03-09` |
| the compact sub-layouts respond at 1024 and 768 without a second DOM | `.workspace__map` no longer exists | `03-09` |
| the complete UI contains at 360px with no overflow and full-size targets | narrow width is spec'd but not built | `03-09` |
| the map navigation cluster sits below the square outside the export source | the cluster is in the canvas region now, not below a square | `03-08` |
| the navigation cluster never overlaps the legend at any legend position | superseded by assertion 12 (non-intersection with the frame rect) | `03-08` |
| the desktop app bar carries the global actions in the declared order | the rail footer takes Export and the theme toggle | `03-06` |
| the desktop focus order runs bar, composition bar, map, navigation, inspector | the declared order becomes rail → panel → canvas | `03-06` / `03-09` |
| the responsive focus order follows the declared workflow | as above | `03-09` |
| dark preference restyles chrome and leaves the composition square white | D-30 moves dark onto a `.dark` class; `emulateMedia` will change nothing | `03-09` (re-arms assertion 24) |
| increased-contrast preference strengthens boundaries and focus rings | keyed on retired `--glass-*` / `--border-*` tokens **and on `.map-workspace__square`, renamed by `03-03`** | `03-09` |
| forced-colors preference drops every glass surface to opaque | D-06 deletes the glass family outright, so there is no glass surface left to assert | `03-09` |

**The hazard this creates, stated plainly.** A suite that is red for several plans stops being
read. `03-09` is the plan that must clear it, and `03-12`'s full-gate evidence is not honest until
it is clear. Nothing here may be described as passing in the meantime.

### Re-measured after `03-04` — still exactly these 12

`03-04` retired the token system this file partly asserts against, so the count was re-measured
rather than assumed: **67 of 79 Chrome e2e tests pass, and the 12 failures are the same 12 listed
above.**

Two tests were briefly made red by `03-04` and were **repaired in the same plan**, because they
were red for a reason `03-04` introduced rather than for a reason `03-09` owns:
`reduced-motion preference removes every authored transition` and
`the map reads the SPEC motion tokens when motion is not reduced` read `--motion-camera` and
`--easing-camera` by name. Those names were absorbed **byte-identically** into
`--motion-duration-base` and `--motion-ease-out` and then deleted, so only the names moved in the
spec; every asserted value is the same bytes. Leaving them red would have grown this list by two on
`03-09`'s behalf for a rename anyone can follow.

The two rows above now say `03-09` alone rather than `03-04 / 03-09`: `03-04` deleted the tokens
they key on, which is what makes them unfixable in place — they have to be rewritten against the
new system, and that rewrite is `03-09`'s scope.

### Re-measured after `03-05` — still exactly these 12

`03-05` retired the app bar and the inspector as containers, which is the change most likely to
move this number. It was re-measured, not assumed: **67 of 79 Chrome e2e tests pass, and the 12
failures are the same 12 listed above** (`npx playwright test --project=chrome`, Chrome 151).

One test was made red by `03-05` and was **repaired in the same plan**, for the same reason `03-04`
repaired two: it was red for a reason `03-05` introduced, not one `03-09` owns.
`phase2-composition.spec.ts` → *the inspector keeps its in-progress UI state across the 1200px
transition* asserted `overscroll-behavior: contain` on the inspector, which stopped being a scroll
container when its sticky card was retired. The claim was re-pointed at `.tool-panel__body`, which
is the tool column's scroll container now, and paired with an assertion that the inspector's
`overflow-y` is `visible` — so the relocated pair cannot both hold of an element that scrolls
nothing. One assertion became three.

The `app bar stays pinned…` row above still names `03-05`. It is **not** closed by this plan and
its owner moves to `03-09`: `03-05` finished retiring the bar as a container, which makes "stays
pinned" a claim about something that no longer exists. The test has to be rewritten against the
rail and panel, and that rewrite is `03-09`'s scope — the same reasoning that moved the two
`03-04` rows.

### Re-measured after `03-06` — still exactly these 12, and four were repaired in flight

`03-06` is the change most likely to move this number: it dissolved the inspector into four rail
tools and moved every control the responsive suite reaches for. It was re-measured, not assumed:
**77 of 89 Chrome e2e tests pass, and the 12 failures are the same 12 listed above**
(`npx playwright test --project=chrome`, Chrome 151.0.7922.75). The denominator moved from 79 to 89
because `rail.spec.ts` adds 10.

`03-06` briefly took the list to **16**. Four tests were red for a reason `03-06` introduced rather
than one `03-09` owns, and all four were repaired in the same plan — the same rule `03-04` and
`03-05` applied. The repair is mechanical (open the tool before reaching its control), not a
rewrite; the rewrite is still `03-09`'s:

| Test | Why `03-06` reddened it | Repair |
|---|---|---|
| core controls stay usable at the 200% zoom equivalent viewport | `Save or Load Maps` and `Reset All Colors` moved into tool panels; the landmark census expected a `banner` | opens the two tools; `expectLandmarks` now asserts `banner` and `complementary` are **absent** rather than dropping them from the census |
| no inspector control is clipped by its container | `.workspace__control-column` no longer exists | re-pointed at `.tool-panel__content` with the Colors tool open |
| every disabled action in the responsive strip is natively disabled | `Reset All Colors` is in the Colors panel | opens the tool for that one control |
| the PNG is identical across theme, forced colors, and device pixel ratio | its `Apply Red` preamble needed the Colors tool | opens the tool |

Two rows above changed shape rather than owner. *"the desktop app bar carries the global actions in
the declared order"* and *"the desktop focus order runs bar, composition bar, map, navigation,
inspector"* were already `03-06`-flavoured; both are now claims about surfaces that no longer exist
at all, and the replacements are landed in **`tests/e2e/rail.spec.ts`** (the spec'd rail focus order,
including the controls whose disabled state removes them, RED-proven against the arrangement it
replaced). `03-09` deletes or rewrites the two originals rather than repairing them.

### Re-measured after `03-07` — still exactly these 12, against 90 tests

`03-07` dissolved the Save/Load dialog and `CompositionBar`, which touched five specs that reach
those surfaces. Re-measured, not assumed: **78 of 90 Chrome e2e tests pass, and the 12 failures
are the same 12 listed above** (`npx playwright test --project=chrome`, Chrome 151.0.7922.75).
The denominator moved from 89 to 90: `persistence.spec.ts` adds the planted-`1914` row test.

Three tests were briefly made red by `03-07` and were **repaired in the same plan** (the rule
`03-04`/`03-05`/`03-06` applied): the legend option pills hid their radios with a 1px clip, so
the label intercepted the pointer events that `.check()` — and a real click — aims at the input.
The inputs are click-bearing now (full-cover, opacity 0). Two rows above still reference the
retired opener/dialog copy (`the desktop app bar carries the global actions…`, `the desktop focus
order runs bar, composition bar…`) — both are claims about surfaces that no longer exist, and
`03-09` deletes or rewrites them rather than repairing them. The row `the responsive focus order
follows the declared workflow` now also crosses the retired `Save or Load Maps` opener; same
disposition.

### Re-measured after `03-08` — still exactly these 12, against 100 tests

`03-08` moved `Reset View` into the floating cluster, re-anchored the cluster into the letterbox
gutter, and added ten tests to `navigation.spec.ts`. Re-measured, not assumed: **88 of 100 Chrome
e2e tests pass, and the 12 failures are the same 12 listed above** (`npx playwright test
--project=chrome`, Chrome 151.0.7922.75). The denominator moved from 90 to 100; the passing count
from 78 to 88. No row entered or left the red list.

**Two more of the 12 now assert a placement that no longer exists**, and `03-09` must REWRITE
rather than repair them:

| Row | Why a repair is the wrong move |
|---|---|
| `the map navigation cluster sits below the square outside the export source` | The cluster is no longer below the square. D-21 puts it in the letterbox gutter INSIDE `.map-workspace__canvas`, and `navigation.spec.ts`'s assertion 12 is the replacement — non-intersection with `.map-frame` at every gate viewport × every legend preset, which is a strictly stronger claim than "below". Keep the export-source half (the cluster after `</svg></div>`); drop the "below" half |
| `the navigation cluster never overlaps the legend at any legend position` | Superseded in substance by assertion 12: the legend lives inside the frame, so non-intersection with the frame implies non-intersection with the legend at every preset. If `03-09` keeps it, it needs the `openRailTool` + disclosure flow (it still uses the retired `getByRole('button', { name: /^Legend/ })`, which now matches two controls) and the panel-settle poll |

That makes **five** of the twelve rows rewrites rather than repairs (the two above plus the three
`03-07` itemised).

---

## D-4 — two controls share the accessible name `Close Saved Maps` — **CLOSED by `03-07`**

**Found during:** `03-06`, wiring the `saved` tool panel.

`SaveLoad.tsx` rendered **two** `Close Saved Maps` buttons (dialog header and footer) beside the
`saved` tool panel's close control of the same name — three controls sharing one accessible name,
mitigated by scoping every e2e dialog-close locator to `.save-load-dialog`.

**Closed 2026-08-06 by `03-07`.** The Save/Load dialog dissolved into the `saved` panel and both
dialog close buttons retired with it: `Close Saved Maps` is **one control** now — the panel's own
close — and the `.save-load-dialog` stopgap scoping was removed from every spec.
`tests/e2e/persistence.spec.ts` asserts the accessible name resolves to exactly one control.

---

## D-5 — the rail has no scroll container, so a very short viewport overflows — **CLOSED below 1200px by `03-09`; the desktop residue stays open**

**Closed 2026-08-06 for every viewport the suite gates, and NOT closed above 1200px.** Both halves
are stated because "D-5 closed" on its own would be a claim the code does not support.

**What closed.** D-20 replaces the 56px side rail below 1200px with a bottom bar, so there is no
48px column left to overflow at any narrow viewport. The observable evidence this deferred item
itself named is landed: **`640 × 400` is back in `GUTTER_VIEWPORTS` in
`tests/e2e/navigation.spec.ts` and assertion 12 is green there.** The canvas region measures
`640 × 343` — the shape the viewport implies — instead of the stretched `584 × 500` the rail
overflow used to produce, and the inline gutter is 148px against the 62px the cluster needs.
Two more viewports moved with it and the measurement table is written beside the list.

**What did not close.** At **1200px or wider** the desktop rail still has no scroll container. It
needs about 492px of height (64 header + 6 × 48 rows + gaps + 112 footer + padding); below that the
rows still overflow instead of scrolling. The original trade stands: every row is icon-only and
carries a tooltip that has to escape the 48px column, and `overflow-y: auto` computes
`overflow-x: auto` and clips it.

No fix was shipped for the desktop residue and none was attempted beyond analysis. No gate viewport
is that shape, so nothing observes it today — which is exactly why it is written down here rather
than left to be rediscovered. The candidate fixes considered and rejected: `overflow-clip-margin`
(unverified interaction with a scroll container, and it would have to be measured in a browser
before it could be believed), and a negative-margin clip-box widening (it makes the tools column
248px wide, which steals hit area from the panel track).

---

## D-5 (original record) — the rail has no scroll container, so a very short viewport overflows

**Found during:** `03-06`. `.tool-rail__tools` was authored with `overflow-y: auto` by `03-03`;
`03-06` removed it, because every rail row is icon-only and carries a tooltip that has to escape the
48px column, and `overflow-y: auto` computes `overflow-x: auto` and clips it. An icon-only rail with
no tooltips is unusable, so the tooltip won.

The cost, measured rather than estimated: six 48px rows plus two HUD blocks (64px + 112px) plus gaps
need about **436px** of height. Below that the rows overflow instead of scrolling. `03-09` owns the
short and narrow layouts and the D-20 bottom sheet, which is where this belongs.

**`03-08` measured a second consequence and it blocks a gate viewport.** At `640 × 400` — the
200 %-equivalent viewport — the rail overflow stretches the grid row, so the canvas region measures
**584 × 500**, not `584 × 400`. An 84px width/height difference is inside the near-square band where
no letterbox gutter can hold the floating cluster (the bound is ~124px), so assertion 12 cannot be
asserted there and `640 × 400` is excluded from `GUTTER_VIEWPORTS` with that reason written beside
it. **When `03-09` closes D-5, re-add `640 × 400` to `GUTTER_VIEWPORTS` in
`tests/e2e/navigation.spec.ts`**: at a true `584 × 400` region the inline gutter is 92px and the
54px cluster fits with room to spare. This is the one place a D-5 fix is directly observable, so
leaving it out silently would lose the coverage rather than defer it.

---

## D-2 — the shell's interim token references — **CLOSED by `03-04`**

**Found during:** `03-03`. `src/styles/editor.css` consumed `--border-default` for the rail and
panel hairlines and `--themely-platinum` for the editor wall. The first was a Phase 2 token
`03-04` retires; the second did not exist yet, so the wall painted transparent.

**Closed 2026-08-06 by `03-04`.** `--themely-platinum` now resolves (`#ffffff` light, `#000000`
dark) and `--border-default` is gone, replaced by `--hairline-color`. The delete-don't-alias
mechanism worked as designed: both references were found by the retired-token gate rather than by
inspection.

---

## D-3 — `Design.md` § 7 is still `[FOR REVIEW]`

Carried from `03-02`. The owner has reviewed no content in it. `03-03` added § 7.1's OQ-2 and
D-20 records, which are equally unreviewed. Recorded so the phase cannot later read as though the
section was approved.
