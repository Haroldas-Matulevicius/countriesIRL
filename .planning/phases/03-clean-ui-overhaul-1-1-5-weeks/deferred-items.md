# Phase 3 — deferred items

Out-of-scope discoveries recorded rather than fixed, with the plan that owns each.

---

## D-1 — `tests/e2e/responsive.spec.ts` is RED after `03-03` (12 tests)

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

---

## D-4 — two controls share the accessible name `Close Saved Maps` — **owner `03-07`**

**Found during:** `03-06`, wiring the `saved` tool panel.

`SaveLoad.tsx` already renders **two** `Close Saved Maps` buttons (dialog header and footer), and
UI-SPEC's new-strings table gives the `saved` TOOL PANEL a close control with the same label
(`Close <Tool>`). With the panel open behind the dialog there are three controls sharing one name.

**Not fixed here, and the reason is that both strings are approved copy.** Renaming either is a
copy decision, not an implementation detail. The mitigation in place: the dialog is modal
(`aria-modal`, with `inert` applied to its own body under the nested confirmation), and every e2e
locator that reaches a dialog close is now **scoped to `.save-load-dialog`** rather than using
`.first()` — an ordinal there would have started closing the panel instead.

**`03-07` closes this** when it migrates the save form and the saved-map list into the `saved`
panel: the dialog goes away and one of the two names goes with it.

---

## D-5 — the rail has no scroll container, so a very short viewport overflows — **owner `03-09`**

**Found during:** `03-06`. `.tool-rail__tools` was authored with `overflow-y: auto` by `03-03`;
`03-06` removed it, because every rail row is icon-only and carries a tooltip that has to escape the
48px column, and `overflow-y: auto` computes `overflow-x: auto` and clips it. An icon-only rail with
no tooltips is unusable, so the tooltip won.

The cost, measured rather than estimated: six 48px rows plus two HUD blocks (64px + 112px) plus gaps
need about **436px** of height. Below that the rows overflow instead of scrolling. `03-09` owns the
short and narrow layouts and the D-20 bottom sheet, which is where this belongs.

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
