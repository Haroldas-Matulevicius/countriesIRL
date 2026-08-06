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
| the app bar stays pinned while the responsive workspace scrolls | `.app > header` no longer matches; the bar is in the panel until it dissolves | `03-05` |
| the compact sub-layouts respond at 1024 and 768 without a second DOM | `.workspace__map` no longer exists | `03-09` |
| the complete UI contains at 360px with no overflow and full-size targets | narrow width is spec'd but not built | `03-09` |
| the map navigation cluster sits below the square outside the export source | the cluster is in the canvas region now, not below a square | `03-08` |
| the navigation cluster never overlaps the legend at any legend position | superseded by assertion 12 (non-intersection with the frame rect) | `03-08` |
| the desktop app bar carries the global actions in the declared order | the rail footer takes Export and the theme toggle | `03-06` |
| the desktop focus order runs bar, composition bar, map, navigation, inspector | the declared order becomes rail → panel → canvas | `03-06` / `03-09` |
| the responsive focus order follows the declared workflow | as above | `03-09` |
| dark preference restyles chrome and leaves the composition square white | D-30 moves dark onto a `.dark` class; `emulateMedia` will change nothing | `03-09` (re-arms assertion 24) |
| increased-contrast preference strengthens boundaries and focus rings | keyed on retired `--glass-*` / `--border-*` tokens | `03-04` / `03-09` |
| forced-colors preference drops every glass surface to opaque | D-06 deletes the glass family outright | `03-04` |

**The hazard this creates, stated plainly.** A suite that is red for several plans stops being
read. `03-09` is the plan that must clear it, and `03-12`'s full-gate evidence is not honest until
it is clear. Nothing here may be described as passing in the meantime.

---

## D-2 — the shell's interim token references

**Found during:** `03-03`. `src/styles/editor.css` consumes `--border-default` for the rail and
panel hairlines and `--themely-platinum` for the editor wall. The first is a Phase 2 token
`03-04` retires; the second does not exist yet, so the wall paints transparent until `03-04`
lands the palette.

**Owner: `03-04`.** This is the delete-don't-alias mechanism working as designed — the stale
reference is meant to fail loudly at `03-04`'s retired-token gate rather than keep working.

---

## D-3 — `Design.md` § 7 is still `[FOR REVIEW]`

Carried from `03-02`. The owner has reviewed no content in it. `03-03` added § 7.1's OQ-2 and
D-20 records, which are equally unreviewed. Recorded so the phase cannot later read as though the
section was approved.
