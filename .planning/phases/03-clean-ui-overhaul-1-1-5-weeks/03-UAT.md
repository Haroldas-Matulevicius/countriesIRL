---
status: accepted-with-skips
phase: 03-clean-ui-overhaul-1-1-5-weeks
source: [03-VERIFICATION.md, 03-12-REVIEW.md]
started: 2026-08-06T00:00:00.000Z
updated: 2026-08-06T00:00:00.000Z
closed_by: owner
closure: "Owner ran the dev server, explored the restyled editor freely, and accepted it. Structured UAT deliberately SKIPPED — not performed and not passed."
---

## Owner acceptance — 2026-08-06

**This is the phase's first and only human verification.** The owner started
`npm run dev`, explored the restyled editor freely, and accepted it. Verbatim:

> "the legend is a bit too high, and unfortunately I can't test 2."
> "Everything else seems to work like it did before, so for now mark the phase complete fully with
> the UAT — I kind of freely explored it and it seemed good enough for now, we can come back and fix
> any of it later, so im going to skip UAT, its good enough"

**What that does and does not establish — read this before citing the phase as accepted:**

- ✅ **Established:** a human looked at the running editor, exercised it, and judged it good enough
  to ship. The phase-goal predicate ("super-clean minimal studio") has a real human verdict now.
  Nothing appeared broken relative to the pre-restyle build.
- ⚠️ **Two defects found by that exploration:** **`G-1`** the legend sits too high, and **`G-3`**
  the colors panel needs heavy work — "too squished, not organized well, hate the multi boxes
  within". `G-3` is a design rework, not a tweak. Both in § Gaps.
- ⛔ **NOT established:** every item below marked `skipped` was **not performed**. Skipped is not
  passed. **No screen-reader pass, no touch-target check, no physical 200% zoom, no latin-ext
  diacritic export, and no dedicated dark-theme review was performed by anyone at any point in this
  phase.** Do not report any of them as verified, and do not let a later phase cite them.
- The pre-existing rule still binds: an automated result may never be substituted for a physical
  claim. The automated evidence in `03-VERIFICATION.md` does not fill these cells.

> **Historical note — superseded by the Owner acceptance section above, retained for the record.**
> Until 2026-08-06 this file opened by stating that Phase 3 was engineering complete and
> **physically unverified**, because every result in the phase was an assertion, a source scan, a
> measured computed style, or a pixel comparison — all automated — and nobody had looked at the
> restyled editor, either theme mode, the rail, the flyout, the tooltips, or a single exported PNG.
>
> The owner's free exploration on 2026-08-06 **partly** discharged that: the editor has now been
> seen and exercised by a human. It did **not** discharge the nine `skipped` cells below, which
> remain unperformed.
>
> The phase *executed* under a **blanket, in-advance, sight-unseen proceed-authorization dated
> 2026-08-06**. Per Immutable Safety Constraint 8 that authorized *proceeding*; it was **not** a
> content review and **not** hash-bound, and it certified nothing about the outcome. The owner's
> later exploration is a separate, genuine — but informal and partial — acceptance. Keep the two
> distinct when citing this phase. **An automated result may never be substituted for a physical
> claim.**

## Current Test

none — closed by owner 2026-08-06.

## Tests

### 1. Decide the legend-label export ceiling (F-1) — DECISION, not a check
expected: |
  `src/utils/legend.ts:86-92,560-565` now export-blocks legend labels longer than 20/14/12
  characters (small/medium/large). At the DEFAULT `medium` size the effective ceiling moved from
  effectively unreachable (36, against a 32-char input cap) down to **14**.

  The verifier judged this a genuine regression on three grounds:
  - The bound is derived from worst-case-uniform glyph width (`W` = 1.0202em) — it assumes every
    character is the font's widest glyph. Real mixed-case text averages ~0.55em, so it
    over-estimates line count by ~1.8x. "Southern Europe" (15 chars) measures ~249px against a
    248px column — genuinely 2 lines, renders fine — but `ceil(15/7) = 3 > 2` blocks it.
  - **It silently breaks already-saved compositions.** `storage.ts:57` still caps at 32 and was
    deliberately left alone (OPEN ITEM 4). A Phase-2-era saved map with a 15-32 character label
    **loads cleanly, then refuses to export.** No plan, SUMMARY, or review caught this, and **no
    test covers it.** It also cuts against Live Invariant 8's repair-and-report philosophy.
  - The repo's own fixture was shortened to keep the suite green: commit `fdd1714` re-baselined
    `'Imperial lands'` (14) to `'Empire lands'` (12). That is in-repo evidence that the bound
    rejects ordinary two-word English labels.

  Unobserved visual consequence: `LegendOverlay.tsx:108-117` wraps by the same count and silently
  truncates past 2 lines. At `medium`, line 1 uses ~123px of a 248px column, so labels that would
  fit on one line now wrap to two half-empty ones — inside the exported PNG.

  Mitigation that does exist: `LegendEditor.tsx:201-209` shows the invalid state live, so it is not
  a surprise at export time. That removes the surprise, not the constraint.
result: ACCEPTED (deferred) — owner: "good enough for now, we can come back and fix any of it later". The 14-char default ceiling ships as-is. NOT a judgement that the bound is correct; the verifier's three grounds stand unrebutted and this stays open as a tracked follow-up.

### 2. Decide what happens to already-saved compositions that can no longer export — DECISION
expected: |
  Owner decides whether a saved map that loads cleanly but refuses to export is acceptable, or
  whether Phase 3 must repair-and-report (truncate with a toast, or widen the bound, or relax the
  export refusal for pre-existing records).
result: BLOCKED — owner could not test ("unfortunately I can't test 2"), having no pre-restyle saved composition with a 15-32 char label. The path remains UNTESTED by human or machine.

### 3. Look at an exported PNG
expected: |
  Export a map and open the PNG. Inter resolves in the legend; the image is exactly 1080x1080;
  type is crisp; nothing is clipped or truncated unexpectedly. This is the first human look at
  output from the new SVG->PNG path that replaced html2canvas.
result: [skipped] — not performed. Owner's free exploration reported nothing broken, but no dedicated look at exported PNG bytes was made.

### 4. Latin-ext diacritics in an exported PNG
expected: |
  Type a legend label containing latin-ext diacritics (e.g. Polish/Lithuanian/Czech/Latvian:
  "Lenkija", "Kedainiai" with proper diacritics, "Cesko") and export. The vendored Inter subset is
  **latin-only (48,432 B)**, so those glyphs fall back mid-string. Judge whether the fallback is
  acceptable for v1.0, or whether latin-ext must be added (~+85 KB raw / ~+113 KB base64 embedded
  in EVERY exported PNG). Recorded as a v1.1 follow-up.
result: [skipped] — not performed. The latin-only subset limitation is unobserved in practice.

### 5. Dark theme visual pass
expected: |
  Toggle the theme from the rail footer. The "Lights Out" palette reads correctly, the crossfade is
  smooth, nothing is unreadable, and no surface is left light. Note: the verbatim Themely palette
  does NOT meet AA for two roles (`--themely-ghost-gray` 3.88:1 on dark Porcelain / 3.60:1 on dark
  Powder; `--themely-red` 3.05:1 on light Porcelain). This was resolved structurally without
  altering any Themely value — confirm the result reads correctly to you.
result: [skipped] — not performed as a dedicated pass. The two AA-failing Themely roles remain visually unreviewed.

### 6. Touch targets in the bottom bar and sheet
expected: |
  On a touch device or with touch emulation, every control in the compact bottom bar and the sheet
  is comfortably tappable. Rail rows landed at 48px (not the spec's 36px) specifically so the
  minimum-target rule would hold.
result: [skipped] — not performed. No touch device or touch emulation was used.

### 7. Screen-reader pass on the rail, flyout, and sheet
expected: |
  With VoiceOver (or equivalent): rail rows announce their name and expanded state; opening a tool
  moves focus sensibly; Escape closes and returns focus to the row that opened it; the panel track
  is announced as the `main` landmark; the theme toggle announces its destination and pressed state.
  **No screen-reader verification has been performed at any point in this phase.**
result: [skipped] — NOT PERFORMED AT ANY POINT IN THIS PHASE. No screen-reader result may be reported or cited.

### 8. Physical 200% browser zoom
expected: |
  At a real 200% browser zoom (not a halved CSS viewport), the editor remains usable and nothing is
  clipped or unreachable. The automated equivalent is labelled as an equivalent, never as physical
  zoom — this cell needs the physical action.
result: [skipped] — not performed. The automated equivalent is labelled an equivalent, never physical zoom.

### 9. Confirm the D-5 desktop rail residue
expected: |
  At >=1200px width with a short viewport, the desktop rail needs ~492px of height and has no
  scroll container, so it can overflow. D-5 was closed BELOW 1200px (640x400 is back in
  `GUTTER_VIEWPORTS` with assertion 12 green). Confirm the remaining >=1200px case is acceptable to
  ship, or schedule it.
result: [skipped] — not performed. The >=1200px rail-overflow bound stands as recorded by 03-09.

### 10. Review `Design.md` § 7
expected: |
  `Design.md` § 7 is marked `[FOR REVIEW]` and has never been reviewed. It holds 11 discretion
  items tabled in `03-02-SUMMARY.md`, plus 03-04's edits to §§ 2, 6, 7.5, 7.6, 7.10.
result: [skipped] — not performed. Design.md § 7 remains marked [FOR REVIEW] and unreviewed.

### 11. Accept or reject `Move Map` as the fourth floating control
expected: |
  D-21 describes three floating controls; four shipped. `Move Map` was retained because it is the
  only keyboard pan affordance in the app and dropping it regresses NFR11. The recorded condition
  is that any future three-control cluster needs a keyboard pan replacement FIRST. Accept the
  deviation, or direct the replacement.
result: [skipped] — not explicitly decided. It ships as the retained 4th control on 03-08's NFR11 keyboard-access grounds.

### 12. The phase goal's own predicate — "super-clean minimal studio, no visual noise"
expected: |
  Every artifact the goal names is present and wired, but the predicate is aesthetic and no human
  has looked at any of it. This is the one must-have scored "present, behavior-unverified"
  (18/19). Judge it by looking.
result: PASS (with one issue) — owner explored the running editor freely and judged it good enough to ship: "Everything else seems to work like it did before... it seemed good enough". ISSUE FOUND: the legend sits too high (see § Gaps).

## Summary

total: 12
passed: 2
issues: 2
pending: 0
skipped: 9
blocked: 1

(2 + 9 + 1 = 12. "passed" = item 12's owner verdict and item 1's owner decision. **The 9 skipped
cells were not performed and must never be reported as passed.**)

## Gaps

### G-1 — The legend sits too high

status: open
severity: cosmetic (owner-observed, real)
found_by: owner free exploration, 2026-08-06
verbatim: "the legend is a bit too high"

The only defect the owner's exploration surfaced. Vertical placement of the legend overlay reads as
too high in the composition. Not diagnosed, not reproduced with measurements, and deliberately NOT
fixed at close-out — the owner chose to close the phase and revisit later ("we can come back and fix
any of it later").

**Where to start when it is picked up:** `resolveLegendPosition` / `resolveLegendRender` in
`src/utils/legend.ts` are the only readers of legend position — nothing reads `legend.position` raw,
so the fix belongs there or in `LegendOverlay.tsx`'s placement math, not in a component that
re-derives it. Note that legend geometry is inside the exported PNG, so a change here **moves
exported pixels** and is D-25 territory: export fixtures will need deliberate, itemised
re-baselining, exactly as 03-11 did.

### G-3 — The colors panel needs heavy work (owner: "we'll need to revisit that for sure")

status: open
severity: **significant — design rework, not a tweak**
found_by: owner free exploration, 2026-08-06
verbatim: "the color tab - 2nd column on open - needs heavy work, its all too squished, not
organized well, hate the multi boxes within. We'll need to revisit that for sure"

The **colors** tool's flyout panel — the 280px panel track that opens as the second column when the
`colors` rail row is selected. Three distinct complaints, worth keeping separate because they have
different fixes:

1. **Too squished** — density/spacing problem. The panel is a fixed 280px and the colour content was
   migrated into it by 03-07 without a layout redesign for the narrower column.
2. **Not organized well** — information architecture, not spacing. The grouping/ordering of the
   colour controls does not read.
3. **"Hate the multi boxes within"** — nested bordered containers inside the panel. This is the
   most actionable: Phase 3's own design contract moved to **flat hairline elevation** (03-04), so
   nested boxes are arguably already off-contract and may be a migration leftover rather than an
   intended treatment.

**Where to start:** `src/components/ColorPicker.tsx` and `src/styles/controls/colorPicker.css`
(03-10 split this out as its own sheet), inside `src/components/editor/ToolPanel.tsx`. Check the
result against `Design.md` — especially the elevation rule and the panel's card-row/option-pill
vocabulary that 03-07 established for the legend and countries panels, which the owner did **not**
complain about. Those two are the working reference for what this panel should look like.

**Constraints that bind any fix:** the 326 selector ceiling is a gate (lower it on deletion, raise
only with a stated reason in the same commit); stylesheets are discovered by directory walk; and the
panel is chrome, so it stays **out** of export membership — this is not D-25 territory and must not
move exported pixels.

### G-2 — The saved-composition export break is still untested

status: open (blocked)
severity: unknown — could be a real creator-facing break
found_by: 03-VERIFICATION.md, unverifiable by owner

A pre-restyle saved map with a 15–32 character legend label should load cleanly and then refuse to
export. The owner had no such saved composition to test with. **No automated test covers this path
either.** If it is ever picked up, the cheap first move is a unit test that constructs the stored
record directly rather than waiting for a real saved map to exist.

---

> #### ⚠ ANNOTATION 2026-08-07 (Phase 4, plan `04-14`) — tested for the first time, and the characterization above is WRONG AS WRITTEN
>
> **The Phase 3 text above is retained verbatim and is not rewritten.** Phase 3 evidence is
> annotate-only. What follows corrects it rather than replacing it.
>
> `04-14` took the "cheap first move" this entry recommends — a unit test constructing the stored
> V2 record directly — and it is the **first time G-2 has been exercised by a human or a machine.**
> The path is now covered by `src/utils/storage.test.ts` + `src/utils/legend.test.ts`.
>
> **What the test found:** the two-step behaviour is real — a 15-character label **loads cleanly**
> (no `corrupt-data`, no `composition-repaired`) and **then refuses to export** with the label-fit
> message. So the *shape* of the concern was correct.
>
> **But "15–32 chars should refuse" is not true as stated.** The refusal is **size-dependent, not
> length-dependent alone.** The same 15-character label:
>
> | Legend text size | Loads? | Exports? |
> |---|---|---|
> | `medium` (**the default**) | ✅ clean | ⛔ **refuses** |
> | `small` | ✅ clean | ✅ **exports clean** |
>
> It is a **`medium`-size trap**, and `medium` being the default is what makes it reachable. A
> creator who drops to `small` clears the gate with the identical label. The bound comes from
> `LEGEND_CHARACTERS_PER_LINE` (`src/utils/legend.ts:206`), which is `{small: 10, medium: 7,
> large: 6}` — not from a flat 15–32 character range.
>
> **RED-proved on its own subject** (re-performed independently by `04-16`'s review, not copied):
> raising the per-line table to `{small: 40, medium: 40, large: 40}` reddens **step 2 only** while
> step 1, the short-label control, and the `small`-size case all stay green.
>
> **G-2 is therefore CORRECTED AND COVERED — it is not "resolved" in the sense of the underlying
> ceiling being validated.** `F-1` (whether 14 characters is the *right* default bound) remains
> **open and unvalidated**: proving the ceiling bites says nothing about whether it sits in the
> right place, and the `03-VERIFICATION.md` verifier's three grounds against the bound stand
> unrebutted. See `.planning/phases/04-.../04-14-SUMMARY.md`.
