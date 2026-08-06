---
phase: 03-clean-ui-overhaul-1-1-5-weeks
verified: 2026-08-06T20:09:30Z
status: human_needed
score: 18/19 must-haves verified
behavior_unverified: 1
overrides_applied: 0
verifier_independence: "Verifier is not the executor of 03-01…03-11 and not the author of 03-12-REVIEW.md. Every number below was produced by re-running the command in this tree, not read from a SUMMARY."
gate_evidence:
  lint: "npm run lint — exit 0"
  unit: "npm test — 42 files, 637 tests, 637 passed, 0 failed"
  build: "npm run build — exit 0"
  e2e_chrome: "npx playwright test --project=chrome — 103 passed, 0 failed, 2.1m"
  chrome_version: "151.0.7922.75 (installed; channel: 'chrome')"
  edge: "NOT CERTIFIED — not installed. /Applications holds no Microsoft*.app."
  firefox: "UNVERIFIED — never run in this repository"
  safari: "UNVERIFIED — never run in this repository"
  previous_versions: "UNVERIFIED — never run in this repository"
escalations:
  - id: F-1
    severity: HIGH
    title: "Legend label export ceiling fell to 14 chars at the default size; previously-saved compositions can become non-exportable"
    status: owner_decision_required
    verdict: "Genuine creator-facing regression. Confirmed, and materially worse than 03-12-REVIEW.md's framing."
    artifacts:
      - path: "src/utils/legend.ts:86-92"
        issue: "LEGEND_CHARACTERS_PER_LINE {24,18,14} -> {10,7,6}, derived from a worst-case-uniform 'W' advance (1.0202em) applied to a hard export block"
      - path: "src/utils/legend.ts:562-565"
        issue: "getLabelLineCount(label, size) > 2 pushes 'label-does-not-fit'"
      - path: "src/utils/legend.ts:654-668"
        issue: "getLegendBlockingMessage returns LEGEND_LABEL_FIT_MESSAGE — this BLOCKS Export PNG"
      - path: "src/utils/storage.ts:57"
        issue: "MAX_LEGEND_LABEL_LENGTH still 32, deliberately unchanged (OPEN ITEM 4) — a stored 15-32 char label loads fine, then refuses to export"
      - path: "src/components/LegendOverlay.tsx:108-117"
        issue: "splitLabel silently truncates at 2 x charactersPerLine; at medium, line 1 uses ~123px of a 248px column"
    new_finding_not_in_review: "The backward-compatibility break for already-saved compositions. No plan, no SUMMARY, and not 03-12-REVIEW.md identified it. No test covers it."
  - id: F-2
    severity: MEDIUM
    title: "Assertion 24 cannot fail on the single-token defect 03-UI-SPEC.md:1091 advertises"
    status: recorded_documentary_residue
    verdict: "Independently confirmed. Reported honestly by 03-09, 03-11 and 03-12. Assertion 4 (uiContract.test.ts:1767) is the real token-axis guard and it is sound."
  - id: F-4
    severity: MEDIUM
    title: "CLAUDE.md:21 and STATE.md:36-37 still list html2canvas, and both still say 'Chrome/Edge' E2E"
    status: open_for_orchestrator
    verdict: "Confirmed. The Edge half is an additional staleness 03-12-REVIEW.md's F-4 did not name."
  - id: V-1
    severity: LOW
    title: ".planning/REQUIREMENTS.md:222 still reads 'Phase 3: Polish + deploy' with no supersession annotation"
    status: new_finding
    verdict: "Stale pre-supersession mapping. REQUIREMENTS.md's own rule is annotate-never-rewrite; this line was neither."
behavior_unverified_items:
  - truth: "The restyled editor reads as a super-clean minimal studio — neutral near-white chrome, one restrained accent, clean typography, no visual noise, no 'techy' density (the phase goal's own aesthetic predicate)"
    test: "Run npm run dev and look at the editor in light mode, then toggle dark mode from the rail footer"
    expected: "Chrome reads as clean/minimal; exactly one Apple Blue element per surface; typography is legible and uncrowded; no residual slate/teal density"
    why_human: "This is an aesthetic judgement. No assertion, computed-style measurement, or pixel diff can settle it. It is the goal predicate itself, and it has never been observed by anyone."
human_verification:
  - test: "Type a 15-character legend label (e.g. 'Southern Europe') at the DEFAULT medium text size, then press Export PNG"
    expected: "DECIDE: is being blocked with 'Shorten this label so it fits in the exported legend.' acceptable? Before Phase 3 this label exported fine (ceiling was effectively unreachable at 36 vs a 32-char input cap). It is now 14."
    why_human: "F-1. This is a product-constraint decision, not a code defect. Only the owner can accept or reject the new ceiling."
  - test: "Save a composition with a 20-character legend label, reload the app, load that saved map, press Export PNG"
    expected: "DECIDE: a previously-valid saved composition now loads but refuses to export. Storage still accepts 32 chars (storage.ts:57). Is a silent backward-compatibility break acceptable, and should it at least be REPAIRED-AND-REPORTED on load the way Live Invariant 8 handles legend opacity?"
    why_human: "F-1, new finding. Nothing in the phase records this. No test covers it."
  - test: "Export a PNG containing legend labels and open the file"
    expected: "Legend renders in Inter, is not clipped, and the two-line wrap does not look half-empty (at medium, line 1 holds 7 characters in a 248px column)"
    why_human: "Not a single exported PNG has been looked at by a human in this entire phase. Assertion 25 proves ink differs from a font-suppressed control; it does not prove the result looks right."
  - test: "Export a PNG with a legend label containing latin-ext diacritics (e.g. 'Türkiye', 'Łódź', 'České')"
    expected: "DECIDE: the vendored Inter subset stops at U+00FF, so these fall back to a system face inside the PNG. Recorded as CF-2 and kept latin-only for Phase 3."
    why_human: "Recorded, not new. Needs an owner eye on the actual mixed-typeface output before it is carried to v1.1."
  - test: "View the editor in dark mode: rail, flyout panel, tooltips, floating cluster, toasts"
    expected: "Lights Out palette reads correctly; the Export PNG button stays white-on-#0071e3 (4.70:1) rather than dropping to 3.02:1"
    why_human: "Assertion 26 computes the ratio from the cascade. Nobody has seen the rendered dark theme."
  - test: "On a touch device or with touch emulation, tap every control in the bottom bar and bottom sheet below 1200px"
    expected: "Every target is comfortably hittable at 44px; the bottom sheet is the only surface overlaying the map; map panning still works"
    why_human: "Touch-target adequacy is a physical claim. CLAUDE.md and Immutable Safety Constraint 8 forbid substituting an automated result for it."
  - test: "Navigate the rail, flyout panel, and bottom sheet with a screen reader (VoiceOver)"
    expected: "Rail rows announce correctly, panel open/close is announced, the rehomed period live region reads, and aria-describedby resolves audibly"
    why_human: "Screen-reader behaviour has never been exercised in this phase. Assertion 14 proves the id resolves in the DOM, not that anything is announced."
  - test: "Set browser zoom to 200% at a 1280px-wide window and use the editor"
    expected: "Tool panel body stays contained and scrollable; nothing is clipped or unreachable"
    why_human: "The suite tests a HALVED CSS VIEWPORT labelled as the 200% equivalent — deliberately, and correctly, not described as physical zoom. Physical zoom has never been tried."
  - test: "At a viewport 1200px or wider but shorter than ~492px in height, look at the tool rail"
    expected: "CONFIRM the known overflow: the desktop rail has no scroll container and rows overflow instead of scrolling"
    why_human: "Recorded, not new — deferred-items.md D-5 residue, explicitly left open. No gate viewport is that shape, so nothing observes it."
  - test: "Review Design.md § 7 'CountriesIRL-only anatomy' (Design.md:396)"
    expected: "The colour swatch grid, legend editor rows, and saved-map row anatomy that Claude specified at its own discretion are accepted or amended"
    why_human: "Marked [FOR REVIEW] and never reviewed. Recorded as deferred item D-3."
  - test: "Confirm 'Move Map' should remain as a fourth floating control against D-21's specified three"
    expected: "Accept or reject. It was retained because it is the only keyboard pan affordance; dropping it would regress NFR11."
    why_human: "Recorded design deviation awaiting an owner call."
deferred:
  - truth: "Historical snapshots 1492 / 1700 / 1815 / 1914 are selectable"
    addressed_in: "Not a phase — deferred indefinitely for missing rights-cleared archival source material"
    evidence: "public/data/snapshots/index.json holds exactly one entry (modern). PeriodHud renders resolved options only. ToastRegion's allowlist REJECTS 'Historical borders for 1492 are coming soon.' Deferred is not done, and nothing here made a deferred snapshot nameable."
  - truth: "latin-ext diacritics render in Inter inside exported PNGs"
    addressed_in: "v1.1"
    evidence: "CF-2, recorded in 03-01-SUMMARY.md:344 and carried by 03-02-SUMMARY.md:319. Orchestrator kept the latin-only subset for Phase 3."
  - truth: "Owner gates 02-25 and 02-28 are closed"
    addressed_in: "Phase 2"
    evidence: "Both remain OPEN and untouched. acceptance-02-28 -> fe5f946060707c48c3d9591d368b5f3f8f90dd4d. git diff --stat 2b15bc7..HEAD -- .planning/phases/02-…/ is empty."
  - truth: "The STATE.md 'Edge 150 — 71/71' contradiction is resolved"
    addressed_in: "Phase 2"
    evidence: "ROADMAP.md:331-333 files it against Phase 2 explicitly. Phase 3 neither cites nor repeats it — confirmed by grep over 03-12-REVIEW.md."
---

# Phase 3: Clean UI Overhaul — Verification Report

**Phase Goal (from `.planning/ROADMAP.md:210-217`, not from any SUMMARY):** Replace the current
editor chrome — the slate/teal token system and the app-bar + right-inspector arrangement — with a
**super-clean minimal studio**: a full-bleed pannable map canvas and **one left-side tool HUD**
holding every tool. Neutral near-white chrome, one restrained accent, clean typography, no visual
noise, no "techy" density. Design system adopted wholesale from Themely (D-01…D-03).

**Verified:** 2026-08-06T20:09:30Z
**Status:** `human_needed`
**Re-verification:** No — initial verification

---

## The headline

**Engineering completeness: achieved. Physical acceptance: zero.** These are not the same thing and
this report does not let one stand in for the other.

Eighteen of nineteen must-have truths are verified against the codebase. The nineteenth is the
phase goal's own aesthetic predicate — *"super-clean minimal studio… no visual noise"* — and it is
**unverifiable by any automated means**. Nobody has looked at the restyled editor, either theme,
the rail, the flyout, the tooltips, the bottom sheet, or **a single exported PNG**. The owner's
2026-08-06 blanket sight-unseen proceed-authorization permitted the work to proceed; per Immutable
Safety Constraint 8 it is **not a content review and not hash-bound**, and it certifies nothing
about the visual outcome.

One escalation (**F-1**) needs an owner decision before this phase should be treated as landed.

---

## Independent read on F-1 — stated plainly

**F-1 is a genuine creator-facing regression, and it is worse than `03-12-REVIEW.md` frames it.**
The review classifies it HIGH / "by design, needs UAT". I agree it is not a coding error — the
executor built exactly what the must-have specified. I disagree that "needs UAT" is a sufficient
disposition, for three reasons, two of which are new.

**1. The bound is derived by a method that does not fit the thing it gates.**
`LEGEND_CHARACTERS_PER_LINE` (`src/utils/legend.ts:86-92`) went `{24,18,14}` → `{10,7,6}`, derived
from the **worst-case-uniform** advance of `W` (1.0202em) — i.e. it assumes every character in
every label is the widest glyph in the font. Real mixed-case English averages roughly 0.55em, so
the heuristic over-estimates line count by roughly 1.8×. "Southern Europe" (15 chars) measures
~249px against the 248px label column — it genuinely occupies two lines and would render fine — but
`ceil(15/7) = 3 > 2` (`:562-565`) blocks it. A conservative estimate is a reasonable basis for a
*layout* decision; it is a poor basis for a **hard export refusal**, and this one is
(`getLegendBlockingMessage`, `:654-668`, returns `LEGEND_LABEL_FIT_MESSAGE`, which blocks Export PNG).

**2. It silently breaks already-saved compositions. Nobody found this.**
`MAX_LEGEND_LABEL_LENGTH` in `src/utils/storage.ts:57` is still **32** and was deliberately left
unchanged (OPEN ITEM 4, correctly reasoned as out of a chrome phase's scope). The consequence was
not traced: a Phase-2-era saved map carrying a 15–32 character legend label still **loads cleanly**,
and then **refuses to export**, telling the creator to "Shorten this label so it fits in the exported
legend." No plan, no SUMMARY, and not the independent review identified this, and **no test covers
it**. It also runs against the grain of Live Invariant 8's philosophy — a stored record that no
longer fits is elsewhere *repaired and reported*, not accepted-then-refused.

**3. The repo's own fixture had to be shortened to keep the suite green.**
Commit `fdd1714` re-baselined an e2e fixture from `'Imperial lands'` (14) to `'Empire lands'` (12)
because the former is "export-blocked and render-truncated by design" at `large`. That is direct,
in-repo evidence that the new bound rejects ordinary two-word English labels. The response was to
change the fixture rather than to re-examine the bound. The commit message is honest about it —
but a test bent to fit a constraint is how a constraint stops being questioned.

**A fourth, visual consequence, also unobserved.** `splitLabel`
(`src/components/LegendOverlay.tsx:108-117`) wraps by the same character count and **silently
truncates** past two lines. At medium (32px in the 1080 space) line 1 holds 7 characters ≈ 123px of
a 248px column. Labels that previously fit one line now wrap to two half-empty ones — inside the
exported PNG, on every existing map with a label over 7 characters. Nobody has seen this.

**Mitigation that does exist:** `LegendEditor` computes `blockingMessage` live
(`src/components/LegendEditor.tsx:201-209`) so a creator editing a label sees the invalid state
*before* pressing Export. That removes the surprise; it does not remove the constraint.

**Disposition.** Owner decision. The review's suggested direction ("a wider label column, not a
looser table") is one option. The more direct fix is to stop wrapping by character count and
measure real advance widths — the export path already runs in a browser where canvas `measureText`
is available and 03-01's spike proved the font loads. Either way this must not close silently.
**If the owner judges the 14-character default ceiling unacceptable, this becomes a gap requiring a
closure plan**, and the status of this phase moves to `gaps_found`.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Slate/teal token system retired; Themely cool `:root` + Lights Out `.dark` land under `--themely-*` | VERIFIED | `src/styles/theme.css`; assertions 1-9/17/19/26 present in `uiContract.test.ts` at cited lines; zero retired-token references |
| 2 | Full-bleed canvas, app bar dissolved as a container, centred 1:1 export frame | VERIFIED (structure) | `.map-editor` grid in `editor.css`; `.map-frame`; `CompositionBar` retired (`b278ad6`); assertions 10/11 at `uiContract.test.ts:604`, `shell.spec.ts:148` |
| 3 | 56px icon rail + one 280px flyout at a time; panel RESERVES space, never overlays | VERIFIED | `App.tsx:1183` `ToolRail`, `:1213` `ToolPanel`; `[data-panel-open]` gated by assertion 10; `rail.spec.ts` green |
| 4 | Dark mode is a `.dark` class on the editor mount root, persisted via StorageAdapter, zero OS-preference reads | VERIFIED | `App.tsx:1165`; `storage.ts:1159,1175` (`THEME_MODE_KEY`); **zero** `prefers-color-scheme` outside negative assertions; **zero** `documentElement` writes |
| 5 | Every tool relocated into the HUD — colours, palettes, legend, saved maps, period, export | VERIFIED | `App.tsx:983,1194,1197,1213`; `PeriodHud`, `HudHeader`, `HudFooter` all mounted, not orphaned |
| 6 | `Design.md` exists, derived from Themely, names upstream, no cross-repo test dependency | VERIFIED | `Design.md` (52,526 B) |
| 7 | Motion tokens exist in exactly two places under a self-counting lockstep test | VERIFIED | `src/lib/motion/tokens.ts` + `tokens.test.ts:12,231` (assertion 7) |
| 8 | Vendored icons: `forwardRef` + `*IconHandle`, two-way provenance set equality | VERIFIED | `src/components/icons/` (14 icons), `iconContract.test.ts:105,172` (assertions 22/28), `PROVENANCE.md` |
| 9 | `html2canvas` removed; Phase 3 owns SVG→PNG; 1080×1080 and every refusal reason preserved | VERIFIED | **Zero** `html2canvas` in `package.json`/`src`/`tests`; `export.ts:432,458,547,560`; refusal set intact at `:496-595` |
| 10 | Exported legend renders in Inter, measured on rasterised pixels with a blank-crop control | VERIFIED | `export.spec.ts:470`. **My own run captured**: ink present 3795, ink absent 3876, blank control **0**, diff 6644 — the discrimination control is real |
| 11 | Transition-readiness (a)-(e): mountable boundary, one storage site, parameterised data path, namespaced tokens, no `documentElement` | VERIFIED | `main.tsx:54` → `MapEditor` → `App`; **exactly one** production `localStorage` site (`storage.ts:170`); `editorConfig.ts:22`; the two `historicalValidation.ts:1098,1190` predicates correctly EXEMPTED |
| 12 | Below 1200px the rail becomes a bottom bar and a tapped tool raises a bottom sheet; `touch-action` ownership set asserted | VERIFIED (structure) | `b7c2446`; assertion 18 at `uiContract.test.ts:2505`; `touch-action: none` on `svg.map-canvas` only (`MapCanvas.css:179`) |
| 13 | CSS mass swept; globbed stylesheets equal imported stylesheets; selector inventory is a ceiling | VERIFIED | `Controls.css` split into **8** per-surface files; assertions 20/21 at `uiContract.test.ts:411,520` |

> **Correction (orchestrator, 2026-08-06, at close-out):** this row originally read "split into 7
> per-surface files", which was the number the *plan* named. `ls src/styles/controls/` returns **8**
> — the eighth is `toast.css`, added by 03-10 because 03-09 had parked the toast's layout-scoped
> rule beside its base rule and `editor.css` would have put toast paint in the shell grid sheet.
> `03-10-SUMMARY.md` records the eighth file as a deliberate additive deviation. Corrected against
> the filesystem, not against a document.
| 14 | Assertion 24 re-armed against class-based dark mode, RED-proven across BOTH rasterisation paths | VERIFIED as a gate | `responsive.spec.ts:1459`; caveat **F-2** — its advertised token-route scope is false and `03-UI-SPEC.md:1091` still says otherwise. Assertion 4 (`uiContract.test.ts:1767`) is the real token guard |
| 15 | Independent non-author review of the aggregate diff; Chrome-only gate stating "Edge not certified — not installed" | VERIFIED | `03-12-REVIEW.md`; **I reproduced every gate number independently** (below) |
| 16 | All 28 UI-SPEC assertions exist in the tree, bound to an owning plan, each with a captured RED proof | VERIFIED | Spot-checked 9 cited locations — **all resolve to the named assertion**. Ledger is accurate, not aspirational |
| 17 | Approved catalog is exactly `Modern`; deferred snapshots never nameable; 02-28 untouched and OPEN | VERIFIED | `public/data/snapshots/index.json` = 1 entry; `PeriodHud` consumes resolved options, never `SNAPSHOT_CATALOG`; ToastRegion allowlist **REJECTS** "…1492 are coming soon."; `acceptance-02-28` → `fe5f946…`; `git diff 2b15bc7..HEAD -- phases/02-…/` **empty** |
| 18 | The two wrap tables collapse to ONE constant re-derived from Inter (OQ-5) | VERIFIED (literally) | `legend.ts:86-92`. **Meeting this must-have produced the F-1 regression** — see escalation |
| 19 | The restyled editor reads as a super-clean minimal studio in both themes | **PRESENT_BEHAVIOR_UNVERIFIED** | Every artifact is present and wired. The predicate is aesthetic. **No human has looked.** Routed to human verification |

**Score:** 18/19 truths verified (1 present, behavior-unverified)

---

## Gate Evidence — re-run by this verifier, not copied

| Gate | Command | Result |
|---|---|---|
| Lint | `npm run lint` | **PASS** — exit 0 |
| Unit | `npm test` | **PASS** — 42 files, **637 tests, 637 passed, 0 failed** |
| Build | `npm run build` | **PASS** — exit 0 |
| E2E | `npx playwright test --project=chrome --reporter=line` | **PASS** — **103 passed, 0 failed**, 2.1m |

Every number matches `03-12-REVIEW.md` § Gate evidence exactly. The review did not overstate.

### Browser scope

- **Chrome — certified.** `Google Chrome --version` → **151.0.7922.75**. `playwright.config.ts:35-36`
  declares `channel: 'chrome'` (the installed browser). Suite UA: `HeadlessChrome/151.0.0.0`.
- **Edge — NOT CERTIFIED, NOT INSTALLED.** `/Applications` holds no `Microsoft*.app`.
  `playwright.config.ts:39-40` uses `channel: 'msedge'`, which cannot launch. **No Edge result is
  claimed anywhere in this report.**
- **Firefox — UNVERIFIED.** Never run here; not in the Playwright configuration.
- **Safari — UNVERIFIED.** Never run here; additionally the documented exception for 03-11's
  data-URI-font-in-SVG-image technique.
- **Previous-version certification — UNVERIFIED.** Never run here.

Phase 3 correctly **does not cite** STATE.md's "Edge 150 — 71/71" record. Confirmed by grep.

---

## Independent check of the review's two "gate cannot fail" claims

Both **CONFIRMED**. I ran each in the tree rather than reading the finding.

**F-5 — `03-12-PLAN.md:208`, the scope-reduction audit — CONFIRMED, cannot pass.**
Ran verbatim: exits **1** with hits `['for now', 'placeholder']`. I then verified the hits are
genuine false positives — all four surviving matches are:

```
+import { COLOR_PRESETS, CUSTOM_COLOR_PLACEHOLDER } from '../constants/colors';
+            placeholder="Example: Europe summer map"
+    expect(markup).not.toMatch(/coming soon|not yet|for now|will be/iu);
+export const CUSTOM_COLOR_PLACEHOLDER = '#RRGGBB or rgb(0, 0, 0)';
```

Two identifiers and an assertion that **forbids** the phrase. The gate reddens on the code that
enforces it. The review's analysis is exactly right, and the substantive conclusion holds:
**no genuine scope-reduction language exists in Phase 3's `src`/`tests` diff.**

**F-6 — `03-12-PLAN.md:432`, the Phase 2 evidence guard — CONFIRMED, cannot fail.**
`git diff --quiet HEAD -- .planning/phases/02-…/` compares the **working tree to HEAD**, so any
*committed* change to Phase 2's evidence passes silently — which is precisely the threat. It
returns clean here, proving only that nothing is uncommitted. I ran the correct range check the
review substituted: `git diff --stat 2b15bc7..HEAD -- .planning/phases/02-…/` is **empty**.
Phase 2's evidence is genuinely intact — but by the reviewer's check, not the plan's.

Both failures are in `03-12-PLAN.md`'s own verify block, **not in shipped code**. The 28 shipped
assertions are sound.

---

## Requirements / Decision Coverage — every ID accounted for

| Family | Declared in `03-CONTEXT.md` / `03-UI-SPEC.md` | Claimed by a plan | Status |
|---|---|---|---|
| `D-01` … `D-35` + `D-34a` (36) | 36 | 36 | **COMPLETE** — no ID unclaimed |
| `A-01` … `A-28` (28 assertions) | 28 | 28 | **COMPLETE** — and all 28 exist in the tree |
| `OQ-1` … `OQ-5` | 5 | 5 | **COMPLETE** — OQ-1→03-01/03-11, OQ-2→D-32/03-03, OQ-3→03-03/03-05, OQ-4→03-01, OQ-5→03-11 |
| `TR-a`,`b`,`c`,`e` | 4 | 4 | **COMPLETE** — the token-namespacing leg is carried substantively by 03-04's `--themely-*` allowlist |
| `R-V1`, `R-V2` | 2 | 2 | **COMPLETE** |
| `OPEN ITEM 3`, `OPEN ITEM 4` | 2 | 2 | **COMPLETE** — both decided and recorded |
| `REVIEW-INDEPENDENCE` | 1 | 1 | **COMPLETE** |

**No orphaned requirements.** `.planning/REQUIREMENTS.md` maps no `F*`/`NFR*` ID to the current
Phase 3; its only Phase 3 reference is the stale line flagged as **V-1** below. `NFR11` (keyboard
navigation) is cited correctly as the grounds for retaining `Move Map`.

---

## Anti-Patterns

| Scan | Result |
|---|---|
| `TBD` / `FIXME` / `XXX` in `src`,`tests` | **ZERO** — no unreferenced debt markers |
| `TODO` / `HACK` | **ZERO** |
| "coming soon" / "not yet implemented" | Present **only** in negative assertions and in the ToastRegion `rejected` list (`ToastRegion.test.tsx:326-328`, under the comment *"Deferred features must not be advertised"*). Correct direction. |
| `html2canvas` residue in code | **ZERO** in `package.json`, `src`, `tests` |
| Orphaned components | **NONE** — full mount chain traced: `main.tsx:54` → `MapEditor` → `App` → `ToolRail`/`ToolPanel`/`HudHeader`/`HudFooter`/`PeriodHud`/`MapWorkspace` |

---

## Findings

| # | Severity | Finding | Location | Disposition |
|---|---|---|---|---|
| F-1 | **HIGH** | Legend export ceiling 36→14 chars at default size; **saved compositions can become non-exportable** | `legend.ts:86-92,562-565,654-668`; `storage.ts:57`; `LegendOverlay.tsx:108-117` | **ESCALATED — owner decision.** Backward-compat half is a NEW finding |
| F-2 | MEDIUM | Assertion 24 cannot fail on the token defect `03-UI-SPEC.md:1091` advertises | `03-UI-SPEC.md:1091` | Confirmed; documentary residue. Amend the spec row. Assertion 4 is the real guard |
| F-4 | MEDIUM | `CLAUDE.md:21` and `STATE.md:36-37` still list `html2canvas` **and** still say "Chrome/Edge E2E" | `CLAUDE.md:21`, `STATE.md:36-37` | Open for orchestrator. The **Edge half is new** — the review named only html2canvas |
| F-7 | LOW | Two e2e specs shadow harness helpers they import | `persistence.spec.ts`, `phase2-composition.spec.ts` | Confirmed as recorded; pre-existing, now a duplication |
| F-8 | LOW | `dataBasePath` unvalidated at the mountable boundary | `editorConfig.ts:42-54` | Confirmed. Must be gated **before** any host mounts this |
| F-10 | INFO | Production export reads a test-only global | `export.ts:71-75` | Accepted trade — assertion 25 cannot go RED without it |
| V-1 | LOW | `REQUIREMENTS.md:222` still reads "Phase 3: Polish + deploy", unannotated | `.planning/REQUIREMENTS.md:222` | **NEW.** The old Phase 3 was superseded; REQUIREMENTS.md's own rule is annotate-never-rewrite |
| V-2 | INFO | `CLAUDE.md:30` describes `Controls` variants as `app-bar \| strip`; the live variants are `rail \| strip` | `CLAUDE.md:30` | **NEW.** `app-bar` retired its last mount site (`Controls.tsx:22`) |

`CLAUDE.md:44` **was** correctly updated for the `phase2CssContract.test.ts` → `uiContract.test.ts`
retirement. That row is accurate.

---

## Recorded open items — confirmed recorded, not re-reported as new

| Item | Where recorded | Confirmed |
|---|---|---|
| D-5 desktop rail residue at ≥1200px (~492px needed, no scroll container) | `deferred-items.md:199-226` | Yes — both halves stated, closure explicitly scoped |
| CF-2 latin-only Inter subset; latin-ext falls back in PNGs | `03-01-SUMMARY.md:344`, `03-02-SUMMARY.md:319` | Yes — kept for Phase 3, filed to v1.1 |
| `Move Map` retained as a 4th control against D-21's three | `MapNavigation.tsx:58` | Yes — NFR11 grounds stated in source |
| `03-UI-SPEC.md`'s wrong placement formula; corner anchor shipped | `coding-rules/frontend.md` | Yes — 03-08 probe 1 RED-proved the spec's own formula |
| Assertion 24 cannot fail on its advertised single-token defect | F-2; found by 03-09, 03-11 **and** 03-12 | Yes — three independent honest reports |
| 02-25 and 02-28 remain OPEN and untouched | `02-28-ACCEPTANCE-MATRIX.md` | Yes — tag intact, evidence dir byte-unchanged |

---

## Gaps Summary

**No must-have truth FAILED.** No artifact is missing, stubbed, or orphaned. No key link is
unwired. The full gate is green and I reproduced every number myself. On the engineering axis this
phase did what it said it did, and it did so with unusually honest self-reporting — three separate
executors reported that a prescribed RED probe did **not** redden its subject rather than repeating
the plan's premise, and the independent reviewer found two unfailable gates in its own plan.

Two things stop this from being `passed`:

1. **F-1 needs an owner decision.** It is not a coding defect — the executor built the must-have as
   written — but the must-have as written shipped a creator-facing constraint change that reached
   production without a human ever typing a legend label, and it carries an unrecorded
   backward-compatibility break for already-saved compositions.

2. **The phase goal's own predicate is aesthetic and nobody has looked.** A green gate proves the
   code does what the tests describe. It is not evidence that the product looks right, reads right,
   or feels right — and Phase 3 restyled essentially the entire creator-facing surface. The
   2026-08-06 blanket authorization permitted proceeding; per Immutable Safety Constraint 8 it is
   not a content review and certifies nothing about the outcome.

**Next action:** work the `human_verification` list. Item 1 (F-1) and item 2 (the saved-composition
break) are decisions; the rest are observations. If the owner rejects the 14-character default
ceiling, this phase moves to `gaps_found` and F-1 needs a closure plan.

---

_Verified: 2026-08-06T20:09:30Z_
_Verifier: Claude (gsd-verifier) — not the executor of any Phase 3 plan, not the author of `03-12-REVIEW.md`_
