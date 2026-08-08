---
phase: 04-visual-cartographic-system-1-5-2-weeks
type: acceptance-record
date: 2026-08-07
gate: "04-16 Task 3 — checkpoint:human-verify, autonomous: false"
authorization_kind: blanket-in-advance-sight-unseen-proceed
is_content_review: false
is_hash_bound: false
covers_physical_verification: false
cells_total: 8
cells_pass: 1
cells_partial: 1
cells_fail: 0
cells_not_performed: 6
owner_session_date: 2026-08-07
owner_session_kind: free-exploration
phase_close_status: "closed by owner on a free exploration; six of eight cells never performed"
---

# Phase 4 — Acceptance Record

> **Read this line first.** The owner ran a **free exploration on 2026-08-07** and closed the
> phase on it. That is a real verdict and it is recorded below as one — but it is **not the
> structured eight-cell gate**. **Six of the eight cells were never performed**, exactly as in
> Phase 3. **Skipped is not passed. None of the six may be cited as verified.**
>
> **What the owner actually did:** exercised the PNG export, the colours and shading, the title
> field, and legend-entry renaming, and judged the result good enough to ship. Two defects were
> reported and are tracked below — one is **fixed**, one is **open**.
>
> ⚠ **This supersedes the original "zero of eight" line, and the change is an UPGRADE OF RECORD,
> not of evidence.** Cells 1–5 and 7 are still `NOT PERFORMED` and were not made truer by the
> phase closing.

---

## Which kind of authorization was given

**A blanket, in-advance, sight-unseen proceed-authorization.** Granted 2026-08-06 by the owner
(matulevicius777@gmail.com), *before* any Phase 4 code was written, in these words:

> *"I do not want any checkpoints that interfere with my work right now … don't ask me questions,
> just continue doing this as if I am not here, find best solution to stuff."*

Recorded in full at [`04-AUTHORIZATION.md`](04-AUTHORIZATION.md), written **before** execution
began specifically so that no later reader — including this record — has to infer it. That is the
discipline Phase 2's gate `02-25` lacked, and is largely why `02-25` is still open.

Per `CLAUDE.md` § Guardrails and **Immutable Safety Constraint 8**, in these exact words:

- It **authorizes proceeding**.
- It is **not a content review**.
- It is **not hash-bound**.

**The owner did not see, and has not reviewed, any artifact this phase produced.**

### What that means for this gate specifically

The authorization converts `04-16` Task 3 into *proceeding past* the gate. **It does not convert to
a pass on any cell.** An owner gate marked `autonomous: false` that asks for a *physically
performed* check can never be satisfied by an automated result, an emulation, or a generic
"approved" (Immutable Safety Constraint 8).

**Writing PASS into a cell nobody executed would be fabricating evidence.**

### Nothing here is inherited from Phase 3

**None of the eight cells below cites a Phase 3 result, and none may.** Phase 3 was closed by the
owner on a free exploration with the structured UAT **skipped**: nine of its twelve cells were
never performed, and **every one of these eight is among them**. There is no Phase 3 screen-reader
pass, no touch-target check, no physical 200% zoom, no latin-ext diacritic export, and no dedicated
dark-theme review anywhere in this repository. **Skipped is not passed.**

---

## The eight cells

**Legend:** `PASS` · `PARTIAL` · `FAIL` (with description) · `NOT PERFORMED`.
**Performed by:** the owner, on a **free exploration**, for cells 6 and 8 only. **Nobody, for the
other six.**

### ⛔ Five physical accessibility checks (`04-UI-SPEC.md § 8`)

| # | Cell | Result | Performed by | Date |
|---|---|---|---|---|
| **1** | **A9 — screen-reader pass** over the ramp strip, the `Map style` panel, and the text tools. Do the accessible names make sense read aloud? A ramp segment should read `Apply Blues shade 3 of 5`. | **NOT PERFORMED** | — | — |
| **2** | **A10 — physical 200 % browser zoom** with a panel open at 360px. | **NOT PERFORMED** | — | — |
| **3** | **A11 — dark-theme visual review** of both new panels and the ramp strip. | **NOT PERFORMED** | — | — |
| **4** | **A12 — latin-ext diacritic export.** Title and legend label containing `Košice`, `Łódź`, `Magyarország`; export; **open the PNG and look at the glyphs**; confirm no glyph falls back mid-string. | **NOT PERFORMED** | — | — |
| **5** | **A13 — the rail at and above 540px**, specifically the **D-5 confirmation at ≥ 1200px**. | **NOT PERFORMED** | — | — |

### ⛔ Three manual-only verifications (`04-VALIDATION.md`)

| # | Cell | Result | Performed by | Date |
|---|---|---|---|---|
| **6** | **The G-3 rework judgement.** Open the Colors flyout at 360px, exercise ramp selection and manual painting, compare against the original complaint: *"too squished, not organized well, hate the multi boxes within."* Is it answered? | **PARTIAL** — the panel was exercised and **no complaint was raised**: *"the colors… everything seemed to work decently"*, *"color shading worked nice"*. But the owner did **not explicitly re-judge the three original complaints** (density · information architecture · nested bordered boxes), and absence of complaint is weaker evidence than a judgement. **G-3 is NOT recorded as resolved.** | owner | 2026-08-07 |
| **7** | **Cartographic resemblance.** Build the reference frame — ramp fills, quiet coasts, top band, title, bar legend — and compare side by side with the owner's Eurostat image. | **NOT PERFORMED** — no side-by-side against the reference image was done | — | — |
| **8** | **Anything in the exported PNG that differs from what was seen on screen.** | **PASS, with two defects reported** — the owner exported and compared: *"i tested the PNG generator… everything seemed to work decently"*. No PNG-vs-screen discrepancy was reported. The two defects found are **F-6** (title character ceiling, since **FIXED**) and **F-7** (legend bar placement/obstruction, **OPEN**) — see below. | owner | 2026-08-07 |

**`grep -c "NOT PERFORMED"` over the eight rows returns 6** (cells 1–5 and 7). Cells 6 and 8 were
upgraded **only** on the owner's own report, quoted verbatim above, and cell 6 was deliberately
**not** upgraded past `PARTIAL`.

---

## The owner's acceptance session — 2026-08-07

**Kind:** free exploration of the running editor, not the structured gate. Same shape as the
Phase 3 close, and it carries the same caveat: **it closes the phase; it does not fill the cells.**

**Exercised:** PNG export · colours and ramp shading · the title field · legend-entry renaming.
**Verdict:** *"everything seemed to work decently"* — good enough to ship.

### The two defects it found

| # | Finding | State |
|---|---|---|
| **F-6** | **The title field refused text far too early** — *"very low amount of characters here, i dont like it — 28 is little"*. **Confirmed and root-caused.** The fit rule counted characters against a worst-case-uniform bound (every character charged the advance of `W`), which roughly **halved** real capacity: a `medium` title got **22** characters while `'Countries I have visited across all of Europe'` (45 characters) really renders at **970 of the 1016** available units. The same model was also **not conservative** — since `04-04`'s latin-ext face, `U+01F1 DZ` is **1.3745em**, 35 % wider than `W`, so 22 of them sat *on* the old bound while rendering **46 % past the line**. | ✅ **FIXED 2026-08-07.** `src/utils/interMetrics.ts` vendors real per-character advances and a pair-kern table, measured by the same method that produced `1.0202`. A 45-character title now fits at the default size. Full gate re-run green. |
| **F-7** | **The legend bar sits slightly wrong and collides with the boxes** — *"The legend bar was off a little, some obstruction with the boxes themselves, but thats fixable."* | ⏳ **OPEN.** This is the owner signal `OQ-3` was waiting for, and it **answers it in the negative**: `04-13` moved the legend from `y = 32` to `y = 152` and **it is still not right**. `G-1` is therefore **worked but NOT closed**. The "obstruction with the boxes" is a **new** report and is not the same thing as the position — `04-12` enumerated **eight legend properties beyond position, four still open**, and this likely lands among them. |

### What this session did NOT establish

**No screen reader was driven. No browser was zoomed to 200 %. No dark theme was reviewed. No
latin-ext diacritic PNG was opened and inspected. No window was sized to ≥ 1200px. No Eurostat
side-by-side was made.** Those are cells 1–5 and 7, they remain `NOT PERFORMED`, and **`A12` in
particular is untouched** — the F-6 fix changed how text is *measured*, not whether the
latin-ext glyphs *render correctly in an exported PNG*, which still nobody has looked at.

---

## What each unperformed cell would need, and what exists instead

**Read the right-hand column as a warning, not as partial credit.** An automated result is a
*different claim* from the physical one and is never a substitute for it.

| # | What would close it | What automation actually established (and what it does NOT) |
|---|---|---|
| 1 | A human driving VoiceOver (or equivalent) through the ramp strip, `Map style` panel, and text tools, and judging whether the spoken names are usable | Accessible **names exist** and are asserted as strings. Nothing has ever been **read aloud.** A correct string can still be unusable in sequence. |
| 2 | A human pressing ⌘+ to 200 % with a panel open | ⚠ **A halved CSS viewport is the *equivalent* and is labelled as such wherever it appears — never as physical zoom** (a Phase 2 decision, still binding). Emulation a browser does not support is not evidence. |
| 3 | A human looking at both new panels and the ramp strip in dark mode | Automated **contrast** is assertion A3 and is green. That is arithmetic over token values; it is a **different claim** from "this looks right in the dark". |
| 4 | A human exporting a `Košice / Łódź / Magyarország` composition, **opening the PNG, and inspecting the glyphs** | `04-04` proved the clone carries **two** `@font-face` rules each with a `unicode-range`, and that a latin-ext string rasterises **differently** from the font-suppressed control. That proves *something changed*. It does **not** prove the glyphs are **correct** or that none falls back mid-string. `04-04-SUMMARY.md` explicitly declines to claim A12. |
| 5 | A human sizing a window to ≥ 1200px wide and confirming the rail | Playwright covers **1280 × 552** (`responsive.spec.ts`, the *measured* floor). The **D-5 ≥ 1200px confirmation was never performed in Phase 3 and is not inherited.** |
| 6 | The owner's own judgement — the original complaint was subjective, so the acceptance criterion is too | `04-07` rebuilt the panel at 360px and landed structural gates (no `--radius-card`, no `--hairline`, no outset `box-shadow` in either Colors sheet; the four deleted class fragments cannot return by copy-paste). **Those gate the *cause* the owner named. They cannot judge whether it now feels right.** **G-3 resolution is NOT claimed.** |
| 7 | Side-by-side comparison with the owner's reference image | Every property is individually gated on real PNG pixels, and `04-15` proves all seven land in **one** downloaded 1080 × 1080 frame. **Resemblance is aesthetic and was not assessed.** |
| 8 | A human comparing the download against the screen | Per-property PNG gates with discrimination controls, no whole-image baselines (D4-14). **A human eye catches shapes a pixel probe does not** — which is the entire reason this cell exists. |

---

## ⚠ Named items the owner has not seen and most needs to

These are called out by name because they would otherwise disappear into "shipped".

### U-6 — the one place this phase knowingly departs from the owner's own reference image

`04-11` shipped **`ink-one`: a single composition ink `#111827`, with no grey attribution.**
`04-UI-SPEC.md § 12` names **U-6 the row most worth the owner's eye**, and the owner has not seen
it. It is an `[ASSUMED]` row authored because the owner was unavailable — **it is not an owner
decision and may never be cited as one.**

**The arithmetic that forces it:** a second, lighter grey ink at `#4B5563` has relative luminance
L = 0.0889, which requires a surface luminance **L ≥ 0.575** to clear 4.5:1 — near-white water
only. Honouring the reference's two-tone type would therefore **retire three of the four shipped
water presets** and make `OQ-1` unanswerable.

**Cost to reverse: low today.** It is a token and a type role, not a structural commitment.
**This is the single highest-value thing for the owner to look at.**

### The G-1 legend position moved — and moving it moved exported pixels

`04-12` measured the legend's pre-fix top edge at **`y = 32`, 2.96 % of the square, 88 units inside
the title band**, and `04-13` moved it to **`y = 152`, 14.07 %**. That is D-25 territory: **twelve
assertions were deliberately and itemisedly re-baselined**, each with its superseded measurement
kept beside it in the source. **`OQ-3` — whether `G-1` is actually resolved — stays OPEN**, because
only the owner can say whether it now sits right.

### Saved compositions look different when reopened

**One-way, accepted knowingly, creator-visible.** `D4-11` deleted the legend's box chrome and
`D4-17` has V2 records adopt the new look, so **a saved composition changes appearance when
reopened, and its export will differ from a PNG the creator may already have posted.** Reversing
this after a creator has reopened and re-saved does **not** restore the original record.

---

## Browser scope — both versions, stated rather than inferred

**Automated browser evidence for Phase 4 comes from installed Google Chrome only.**

| | |
|---|---|
| `04-01` … `04-06` | **Chrome 151.0.7922.75** |
| `04-07` … `04-15`, and the `04-16` review run | **Chrome 151.0.7922.76** (Chrome auto-updated mid-phase) |

**The record states both, not one.** The drift is a patch release and invalidates no plan, but a
single-version claim would be false.

- **Microsoft Edge is NOT installed on this machine.** Verified 2026-08-07: `/Applications` holds
  no `Microsoft*.app`; `~/Library/Caches/ms-playwright` holds only `ffmpeg-1011`. The `msedge`
  Playwright project **cannot launch**, so **no Edge result may be produced or cited.**
- **Firefox, Safari, and previous-version certification have never been run here** and must never
  be reported as passed.
- Phase 1/2 evidence recording "Edge 150" is **immutable — annotate it, never rewrite it** — and
  until that contradiction is explained, **no phase may cite it.** Phase 4 does not.

---

## What IS established — the code-level gate

Re-run independently by `04-16`'s non-author review on 2026-08-07, with real output recorded in
[`04-16-REVIEW.md`](04-16-REVIEW.md) § 2. **Nothing below was copied from a plan's SUMMARY.**

| Gate | Result |
|---|---|
| `npm run lint` | clean |
| `npm test` | **875 / 875** unit, 47 files |
| `npm run build` | clean |
| `npm run test:e2e -- --project=chrome` | **138 / 138** |
| `npm run data:world:check` | PASS — 248 units, **195 selectable core states**, **207 colorable units**, mesh re-derived and matched (327 geometries, 366,767 B) |
| Selector ceiling | **337** |
| New npm packages across the whole phase | **ZERO**, proven by a byte-level **range diff** against the phase-start SHA `0df7fff`, RED-proved against a **committed** change |

**Six RED proofs were re-performed by the reviewer and all six reproduced.** Live Invariants 1–10
each addressed; Immutable Safety Constraints 1–10 held; decisions D4-01 … D4-18 all accounted for;
zero Deferred Ideas shipped.

**Five findings were raised and none was fixed by the reviewer** (a reviewer who fixes is no longer
independent). They are carried in `STATE.md` § Pending Todos.

**None of this is a physical check.** It is exactly the evidence the eight cells above are *not*.

---

## The close-out statement

> **Phase 4 is COMPLETE — closed by the owner on a free exploration on 2026-08-07, with six of
> the eight acceptance cells never performed.**

Recorded in `.planning/STATE.md` in those words. **The wording matters and is deliberate**: it is
the same form Phase 3 was closed in, because it is the same kind of close. The superseded
statement was *"SHIPPED at code level and physically unverified"*, which was accurate until the
owner looked; it is kept here rather than deleted so the transition is legible.

**What changed is the record, not the evidence.** The owner exercised the product and accepted
it. That closes the phase. It did **not** perform cells 1–5 or 7, and the fact that the phase is
now closed does not make them any truer.

**If any later phase needs one of the six unperformed checks, it must be performed then — none of
them can be inherited from this phase, just as none could be inherited from Phase 3.** The running
total of never-performed cells across Phases 3 and 4 is now the binding constraint on Phase 6's
`06-03` WCAG audit and its v1.1 acceptance matrix, which is where they will finally have to be
done.

**One follow-up is open and owner-reported:** `F-7`, the legend bar's placement and its collision
with the boxes. It answers `OQ-3` in the negative — `G-1` is **worked but not closed**.
