---
status: testing
phase: 03-clean-ui-overhaul-1-1-5-weeks
source: [03-VERIFICATION.md, 03-12-REVIEW.md]
started: 2026-08-06T00:00:00.000Z
updated: 2026-08-06T00:00:00.000Z
---

> **Read this first.** Phase 3 is **engineering complete and physically unverified.** Every result
> recorded anywhere in this phase is an assertion, a source scan, a measured computed style, or a
> pixel comparison — all automated. **Nobody has looked at the restyled editor, either theme mode,
> the rail, the flyout, the tooltips, or a single exported PNG.**
>
> The authorization under which the phase executed was a **blanket, in-advance, sight-unseen
> proceed-authorization dated 2026-08-06**. Per Immutable Safety Constraint 8 that authorizes
> *proceeding*; it is **not** a content review and it is **not** hash-bound, and it certifies
> nothing about the outcome. **An automated result may never be substituted for a physical claim.**
>
> Two items below (1 and 2) are **decisions**, not checks. If item 1 is rejected, this phase moves
> from `human_needed` to `gaps_found` and F-1 needs a closure plan.

## Current Test

number: 1
name: Decide the legend-label export ceiling (F-1)
expected: |
  Owner decides whether a 14-character effective ceiling at the default `medium` legend size is
  acceptable, or whether it must be raised/reworked before this phase is accepted.
awaiting: user response

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
result: [pending]

### 2. Decide what happens to already-saved compositions that can no longer export — DECISION
expected: |
  Owner decides whether a saved map that loads cleanly but refuses to export is acceptable, or
  whether Phase 3 must repair-and-report (truncate with a toast, or widen the bound, or relax the
  export refusal for pre-existing records).
result: [pending]

### 3. Look at an exported PNG
expected: |
  Export a map and open the PNG. Inter resolves in the legend; the image is exactly 1080x1080;
  type is crisp; nothing is clipped or truncated unexpectedly. This is the first human look at
  output from the new SVG->PNG path that replaced html2canvas.
result: [pending]

### 4. Latin-ext diacritics in an exported PNG
expected: |
  Type a legend label containing latin-ext diacritics (e.g. Polish/Lithuanian/Czech/Latvian:
  "Lenkija", "Kedainiai" with proper diacritics, "Cesko") and export. The vendored Inter subset is
  **latin-only (48,432 B)**, so those glyphs fall back mid-string. Judge whether the fallback is
  acceptable for v1.0, or whether latin-ext must be added (~+85 KB raw / ~+113 KB base64 embedded
  in EVERY exported PNG). Recorded as a v1.1 follow-up.
result: [pending]

### 5. Dark theme visual pass
expected: |
  Toggle the theme from the rail footer. The "Lights Out" palette reads correctly, the crossfade is
  smooth, nothing is unreadable, and no surface is left light. Note: the verbatim Themely palette
  does NOT meet AA for two roles (`--themely-ghost-gray` 3.88:1 on dark Porcelain / 3.60:1 on dark
  Powder; `--themely-red` 3.05:1 on light Porcelain). This was resolved structurally without
  altering any Themely value — confirm the result reads correctly to you.
result: [pending]

### 6. Touch targets in the bottom bar and sheet
expected: |
  On a touch device or with touch emulation, every control in the compact bottom bar and the sheet
  is comfortably tappable. Rail rows landed at 48px (not the spec's 36px) specifically so the
  minimum-target rule would hold.
result: [pending]

### 7. Screen-reader pass on the rail, flyout, and sheet
expected: |
  With VoiceOver (or equivalent): rail rows announce their name and expanded state; opening a tool
  moves focus sensibly; Escape closes and returns focus to the row that opened it; the panel track
  is announced as the `main` landmark; the theme toggle announces its destination and pressed state.
  **No screen-reader verification has been performed at any point in this phase.**
result: [pending]

### 8. Physical 200% browser zoom
expected: |
  At a real 200% browser zoom (not a halved CSS viewport), the editor remains usable and nothing is
  clipped or unreachable. The automated equivalent is labelled as an equivalent, never as physical
  zoom — this cell needs the physical action.
result: [pending]

### 9. Confirm the D-5 desktop rail residue
expected: |
  At >=1200px width with a short viewport, the desktop rail needs ~492px of height and has no
  scroll container, so it can overflow. D-5 was closed BELOW 1200px (640x400 is back in
  `GUTTER_VIEWPORTS` with assertion 12 green). Confirm the remaining >=1200px case is acceptable to
  ship, or schedule it.
result: [pending]

### 10. Review `Design.md` § 7
expected: |
  `Design.md` § 7 is marked `[FOR REVIEW]` and has never been reviewed. It holds 11 discretion
  items tabled in `03-02-SUMMARY.md`, plus 03-04's edits to §§ 2, 6, 7.5, 7.6, 7.10.
result: [pending]

### 11. Accept or reject `Move Map` as the fourth floating control
expected: |
  D-21 describes three floating controls; four shipped. `Move Map` was retained because it is the
  only keyboard pan affordance in the app and dropping it regresses NFR11. The recorded condition
  is that any future three-control cluster needs a keyboard pan replacement FIRST. Accept the
  deviation, or direct the replacement.
result: [pending]

### 12. The phase goal's own predicate — "super-clean minimal studio, no visual noise"
expected: |
  Every artifact the goal names is present and wired, but the predicate is aesthetic and no human
  has looked at any of it. This is the one must-have scored "present, behavior-unverified"
  (18/19). Judge it by looking.
result: [pending]

## Summary

total: 12
passed: 0
issues: 0
pending: 12
skipped: 0
blocked: 0

## Gaps
