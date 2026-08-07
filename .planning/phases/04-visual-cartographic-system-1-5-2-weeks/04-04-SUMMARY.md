---
phase: 04-visual-cartographic-system-1-5-2-weeks
plan: 04
subsystem: export
tags: [webfont, woff2, unicode-range, font-face, base64, sha256, playwright, vendored-asset]

requires:
  - phase: 03-clean-ui-overhaul-1-1-5-weeks
    provides: the owned SVG→PNG export path, the generalised font-embedding registry (D-34a), the test-only suppression flag, and the vendored latin Inter subset with its recorded SHA-256
  - phase: 04-visual-cartographic-system-1-5-2-weeks
    provides: "04-01's surface rect and its sibling-layer precedent in the canonical clone shape"
provides:
  - "A second vendored same-origin woff2, `src/assets/inter-latin-ext-variable.woff2` (85,272 B, SHA-256 a28eb6d3…), with provenance verified by live fetch this session"
  - "`buildExportFontFaceCss()` returns TWO `@font-face` rules for the ONE `Inter` family, each scoped by its own verbatim `unicode-range`"
  - "The latin face now carries an explicit `unicode-range` it never had — without one the two faces collapse to last-declaration-wins"
  - "`src/styles/theme.css` carries the matching pair, so the editor and the export agree about which glyphs fall back"
  - "`EXPORT_FONT_FACE_BUILDERS` exported and pinned at exactly one entry: two faces is not two families"
  - "An e2e gate in two separately-failing halves: the clone CARRIES two ranged faces, and those faces DRAW a pure-latin-ext string"
  - "`measureLegendCrops` — one shared decode→crop→count→diff path for both font gates"
  - "A retired assumption: A6 (upstream licence and byte sizes) re-verified by live fetch rather than inherited from Phase 3"
affects: [04-11, 04-16, 05-05]

actuals:
  tokens: 15500
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Two `unicode-range`-scoped faces for one family, one registry entry — no subsetting toolchain required"
    - "A probe string whose every inked glyph belongs to the subject under test, so the assertion cannot pass on unrelated pixels"
    - "'Present' and 'selected' separated by a mutation that leaves the structural claim green"

key-files:
  created:
    - src/assets/inter-latin-ext-variable.woff2
  modified:
    - src/assets/README.md
    - src/styles/interFontFace.ts
    - src/styles/theme.css
    - src/utils/export.ts
    - src/utils/export.test.ts
    - tests/e2e/export.spec.ts
    - tests/e2e/fixtures/export.html
    - .planning/coding-rules/export.md

key-decisions:
  - "Two `@font-face` rules for one family split by `unicode-range`, rather than a merged subset — `pyftsubset`/`fonttools`/`woff2_compress` are measured absent and the two-face route needs none of them"
  - "The latin face gains an explicit `unicode-range` (it had none): two faces at the same family/weight/style with no ranges do NOT divide the character space, the last declaration simply wins"
  - "Both faces are ALWAYS inlined, never conditional on composition content (U-9) — a content branch in the repo's most safety-critical file buys a saving that does not change the PNG at all"
  - "`EXPORT_FONT_FACE_BUILDERS` exported solely so the test can pin `.size === 1`; a second entry would mean a second FAMILY, which is an owner decision"
  - "The plan's `Košice / Łódź / Magyarország` probe label was REJECTED and replaced with a pure-latin-ext label — the plan's string is mostly latin-1 and its assertion would stay green with the latin-ext range narrowed to nothing"
  - "The stale CF-2 e2e test was retitled and re-scoped rather than deleted: it now pins the measurement that justified widening, and is deliberately NOT routed through the export builder"

patterns-established:
  - "Verbatim-range discipline: a `unicode-range` is pasted from the live fetch and recorded beside the file's SHA-256; a hand-typed range is a silent coverage hole because the rule still parses"
  - "Subject-pure probe strings: every inked glyph in the probe must belong to the thing under test, or the assertion passes on unrelated pixels"
  - "Present-vs-selected mutation: point a correctly-declared face at the wrong bytes — the structural gate stays green and only the behavioural gate reddens"

requirements-completed: [D4-15]

coverage:
  - id: D1
    description: "The export clone's injected `<style>` carries two `@font-face` rules for the single family Inter, each with its own `unicode-range`, both inlined as base64 from same-origin vendored bytes"
    requirement: D4-15
    verification:
      - kind: e2e
        ref: "tests/e2e/export.spec.ts#04-04 claim 1: the clone carries two unicode-range font faces for one family"
        status: pass
      - kind: unit
        ref: "src/utils/export.test.ts#emits TWO unicode-range-scoped faces for the ONE Inter family (04-04)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A latin-ext string rasterises differently from the same string exported with the font suppressed — the embedded faces, not the fallback stack, are what draw those glyphs"
    requirement: D4-15
    verification:
      - kind: e2e
        ref: "tests/e2e/export.spec.ts#04-04 claim 2: the embedded faces draw a latin-ext string, measured on font pixels"
        status: pass
    human_judgment: false
  - id: D3
    description: "`EXPORT_FONT_FACE_BUILDERS` still holds exactly one entry, keyed by family — the registry mechanism is unchanged, not re-opened"
    requirement: D4-15
    verification:
      - kind: unit
        ref: "src/utils/export.test.ts#keeps the family registry at one entry — two faces is not two families"
        status: pass
    human_judgment: false
  - id: D4
    description: "The vendored latin-ext bytes carry a live-verified licence, byte size, SHA-256, fetch URLs and user agent; the existing latin row is byte-unchanged"
    requirement: D4-15
    verification:
      - kind: other
        ref: "shasum -a 256 src/assets/inter-latin-ext-variable.woff2 == the value in src/assets/README.md; git diff shows no deletion of the latin row's hash"
        status: pass
    human_judgment: false
  - id: D5
    description: "The exported latin-ext GLYPHS are correct — a human opens an exported PNG and looks at the diacritics"
    requirement: D4-15
    verification: []
    human_judgment: true
    rationale: "This is requirement A12, a ⛔ PHYSICAL CHECK scheduled in plan 04-16. It was one of the nine Phase 3 UAT cells NEVER PERFORMED. 04-04's automated result proves the embedded faces CHANGED the raster; it says nothing about whether the shapes are the right shapes. Skipped is not passed, it cannot be inherited, and no automated result substitutes for it."

duration: 24min
completed: 2026-08-06
status: complete
---

# Phase 4 Plan 04: Latin-ext Font Coverage Summary

**One family, two `unicode-range`-scoped `@font-face` rules — `š ł ź č ę ș` are now drawn by vendored, hash-recorded Inter bytes inside the exported PNG instead of falling back mid-string, and the gate that proves it can tell "face present" from "face selected".**

## Performance

- **Duration:** ~24 min
- **Tasks:** 3 of 3
- **Commits:** 3 (`8546156`, `f1bec75`, `e4ad883`)

## What shipped

| Commit | Task | What landed |
|---|---|---|
| `8546156` | 1 | `src/assets/inter-latin-ext-variable.woff2` + a second README asset row, provenance verified by live fetch |
| `f1bec75` | 2 | Two-face builder, matching `theme.css` pair, exported registry, unit gates, `coding-rules/export.md` |
| `e4ad883` | 3 | The two-half e2e gate, the shared crop comparator, the re-scoped CF-2 test |

## Measurements (all taken this session, none inherited)

### The asset

| Field | Value |
|---|---|
| Byte size | **85,272** (`wc -c`) — **exactly** the `03-01` estimate of +85,272 |
| SHA-256 | `a28eb6d3ccb534ae0c94ca999371df024aab60b08c3c8a5720ee9e32fa0faaa2` |
| Base64-inflated | **113,696** — exactly the `03-01` estimate of +113,696 |
| Source URL | `https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa25L7W0Q5n-wU.woff2` |
| User agent | `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) … Chrome/151.0.0.0 Safari/537.36` |
| Licence | SIL OFL 1.1 — `"license": "ofl"` from `fonts.google.com/metadata/fonts/Inter`, licence text SHA-256 `5b9321a4…` |
| Variable axes | `fvar gvar avar HVAR MVAR STAT` present, parsed from the WOFF2 table directory |

**Assumption A6 is retired.** `04-RESEARCH.md` flagged the licence and byte sizes as a Phase 3
measurement carried forward. Both were re-checked live: the licence is unchanged (so nothing was
escalated), and the same CSS2 response returned the **byte-identical latin URL and range already
recorded**, which is why the existing latin row could be left completely untouched.

**The table-directory parser was controlled.** It was run against the existing
`inter-latin-variable.woff2` and reproduced the table list the README already records for that
file, character for character — so it is reading real tags rather than printing a constant.

### The size delta — measured, and on the right artifact

| Quantity | Before | After | Delta |
|---|---|---|---|
| base64 of the font bytes | 64,576 | 178,272 | **+113,696** |
| injected `<style>` text | 64,714 | 178,942 | **+114,228** |
| serialised `encodeURIComponent` data URL | 68,798 | 190,216 | **+121,418** |
| built `index.js` | 560.48 kB | 674.41 kB | **+113.93 kB** (gzip 206.99 → 293.00, **+86.01 kB**) |
| built `index.css` | 50.34 kB | 50.34 kB | **0** — the editor faces reference the files by URL |
| **exported PNG file size** | — | — | **unaffected** |

**Against the ~+113 KB estimate: the estimate was exact, not "materially worse".** The base64
delta is +113,696 B, to the byte. The one number worth naming beyond it is the gzipped bundle
delta, **+86.01 kB** — base64 compresses poorly, and no planning document had projected that.
Reported here rather than absorbed.

**The "+113 KB per export" framing was wrong about which artifact pays.** Corrected in
`src/assets/README.md` and `coding-rules/export.md` in the same commits as the behaviour: the
base64 rides in the **bundle and the intermediate SVG**; the PNG encoder is handed a raster and
never sees a font byte.

### The raster claim

Measured on installed Chrome 151.0.7922.75, label `ŠŁŹČĘȘ šłźčęș`, legend crop derived from
`resolveLegendRender`:

| Quantity | Measured | Threshold shipped |
|---|---|---|
| ink, both faces embedded | 6,268 | `> 2000` |
| ink, font suppressed | 6,065 | `> 2000` |
| **diff embedded vs suppressed** | **2,979** | `> 1000` |
| ink in the blank control | 0 | `=== 0` |
| diff embedded vs blank | 6,877 | `> 2000` |
| diff suppressed vs blank | 6,685 | `> 2000` |

Every threshold is roughly a third of its measured value. The numbers were captured by a temporary
`console.log` inserted, run, and removed by scratchpad copy-back — **the placeholder figures first
written into that comment were replaced with these before anything was committed.**

## Deviations from Plan

### 1. [Rule 1 — the plan's probe label produced a gate that could not fail]

**Found during:** Task 3, before writing the assertion.

**Issue.** `04-04-PLAN.md` Task 3 prescribes the label `Košice`, `Łódź`, `Magyarország`, and
prescribes RED-proving claim 2 by *"narrow the latin-ext `unicode-range` so the diacritics fall
outside it, and confirm the two crops converge."* **The two crops cannot converge.** Those strings
are overwhelmingly latin-1 — `K o s i c e L o d z M a g y a r o r s z á g`, plus `ó` and `á` which
are themselves latin-1 — so the latin face changes their raster whether or not the latin-ext face
ever resolves. Claim 2 would have stayed **green** with latin-ext coverage removed entirely: the
exact "cannot fail on its own subject" shape anti-pattern #3 names, and the fourth variant this
phase has hit.

**Fix.** The label is `ŠŁŹČĘȘ šłźčęș` — every **inked** glyph is in `U+0100-02BA` (spaces are
latin-1 but draw nothing), so the diff can only move if the latin-ext face is selected. It still
exercises the plan's glyphs: `š` from *Košice*, `ł` and `ź` from *Łódź*, plus `č ę ș`. `ó` and `á`
are excluded on purpose. Reasoning recorded in the spec's own comment and in
`coding-rules/export.md`, not only here.

**Files:** `tests/e2e/export.spec.ts`. **Commit:** `e4ad883`.

### 2. [Rule 2 — the latin face needed a `unicode-range` the plan did not mention]

**Found during:** Task 2.

**Issue.** The plan says to add the latin-ext range and keep "the latin range exactly as it is
today". In the **export** path there was no latin range today — `buildExportFontFaceCss` emitted a
bare `@font-face` with no `unicode-range` at all (only `theme.css` had one). Two faces for the same
family/weight/style where one matches every codepoint do not divide the character space; CSS font
matching simply lets the **last declaration win**, and the latin-ext file — which has no latin
glyphs — would have taken over the whole string.

**Fix.** Both export faces carry explicit ranges, the latin one pasted verbatim from the same live
fetch. Recorded as a rule in `coding-rules/export.md` because it is the non-obvious half of the
two-face pattern. **Commit:** `f1bec75`.

### 3. [Rule 2 — a shipped test whose title contradicted what shipped]

**Found during:** Task 3.

**Issue.** `tests/e2e/export.spec.ts` carried *"CF-2: a latin-ext glyph falls back mid-string —
observed, documented behaviour"*. After this plan that sentence is false of the product. It still
passes, because its subject is the latin **file** embedded alone, not the export builder — so it
would have sat there green and misleading.

**Fix.** Retitled to *"the latin subset FILE alone cannot draw latin-ext — why 04-04 added a second
face"*, with a comment stating that it now pins the measurement that justified widening and that it
is deliberately **not** routed through the export builder, so it cannot go green merely because the
second face exists. Deleted nothing. **Commit:** `e4ad883`.

### 4. [Rule 3 — one acceptance grep matched prose, not code]

**Found during:** Task 2 verification.

**Issue.** Acceptance criterion *"`grep -cE "unicode-range" src/styles/theme.css` returns 2"*
returned **3**: my new comment used the words "unicode-range" once. This is the same class as
`04-03`'s pretty-printed-manifest grep — a criterion whose pattern does not match the file's real
formatting.

**Fix.** The comment was reworded to "by codepoint range" (equally accurate), so the criterion's
literal grep returns exactly 2 and counts only declarations. **Recorded rather than silently
absorbed**, because the underlying lesson is that the criterion was counting text, not rules.

### 5. Registry export

`EXPORT_FONT_FACE_BUILDERS` was module-private. The plan's own acceptance criterion requires
asserting `.size` against the literal 1, so it is now exported, with a comment saying it is exported
for that test. No behaviour change.

## RED proofs

**Five mutations, all restored by scratchpad copy-back, every restore confirmed byte-identical with
`diff -q` and the tree confirmed with `git status`. No `git checkout --` was run at any point.**

### Unit — subject: `src/styles/interFontFace.ts` / `src/utils/export.ts`

| # | Mutation | Result |
|---|---|---|
| U1 | drop the second face from `buildExportFontFaceCss` | `emits TWO unicode-range-scoped faces…` **RED** |
| U2 | give the second face the **same** range as the first | same test **RED**, on the ranges-differ assertion |
| U3 | add a second **family** (`Fraunces`) to the registry | `keeps the family registry at one entry` **RED** |

Verbatim:

```
U1: AssertionError: the injected style does not carry exactly two @font-face rules — latin-ext
    coverage is missing from the export clone: expected [ '@font-face' ] to have a length of 2
    but got 1
U2: AssertionError: both faces carry the SAME unicode-range, so the second one can never be
    selected and adds bytes for nothing: expected 'U+0000-00FF, U+0131, U+0152-0153, U+0…'
    not to be 'U+0000-00FF, U+0131, U+0152-0153, U+0…' // Object.is equality
U3: AssertionError: expected 2 to be 1 // Object.is equality
```

### E2E — the two claims

| # | Mutation | claim 1 | claim 2 |
|---|---|---|---|
| E1 | drop the second `@font-face` from the builder | **RED** | **RED** |
| E2 | narrow the latin-ext range to `U+1E00-1E9F` (the plan's prescribed mutation) | **RED** | **RED** |
| E3 | leave the latin-ext face perfectly declared but point its `src` at the **latin** bytes | green | **RED** |

Verbatim:

```
E1 claim 1: the export clone does not carry exactly two @font-face rules — latin-ext coverage
            is missing from the rasterised PNG   expect(received).toHaveLength(expected)
E1 claim 2: suppressing the embedded faces did not change the rasterised latin-ext string — the
            latin-ext face is present but never selected, and those glyphs are still being drawn
            by the fallback stack   expect(received).toBeGreaterThan(expected)
E2 claim 1: no face covers U+0100-02BA — the latin-ext diacritics D4-15 exists for still fall
            back mid-string
E2 claim 2: (same message as E1 claim 2)
E3 claim 1: PASSED
E3 claim 2: (same message as E1 claim 2)
```

**E3 is the load-bearing proof, and it is not the one the plan asked for.** The plan's mutation
(E2) reddens **both** claims, so on its own it cannot show that claim 2 is more than a restatement
of claim 1 — it reddens claim 1 because claim 1 asserts the range actually covers `U+0100-02BA`.
E3 was added for that reason: the face is present, named `Inter`, base64-inlined, and carries the
correct distinct range — the structural gate is **perfectly green** — and only the raster gate
falls. That is the direct evidence for the standing requirement to prove the latin-ext face is
**selected**, not merely present.

## Verification

| Gate | Result |
|---|---|
| `npm run lint` | clean |
| `npm test` | **684/684** (45 files) — was 682, +2 new |
| `npm run build` | `tsc -b` + vite clean |
| `npx playwright test tests/e2e/export.spec.ts --project=chrome` | 15/15 |
| `npm run test:e2e -- --project=chrome` | **107/107** — was 105, +2 new |
| `npm run data:world:check` | PASS (248 units / 195 core / 207 colourable) |
| `grep -c "@font-face" src/styles/theme.css` | 2 |
| `grep -cE "unicode-range" src/styles/theme.css` | 2 |
| no-network grep across `src/` + `index.html` | **0** |
| committed woff2 SHA-256 vs README row | **match** |
| latin row's SHA-256 deleted by the diff? | **no** |
| PNG size contract | 1080×1080, unchanged, asserted on `IHDR` bytes by the passing suite |

**Installed Chrome 151.0.7922.75 only.** Edge is **not installed on this machine**; Firefox and
Safari have never been run here. No result for any of them is produced or cited.

**No network request enters the export path.** The only fetches in this plan were the one-time
authoring downloads at the terminal, recorded with their URLs and user agent. The shipped bytes are
same-origin and vendored, and the grep for `@import url(http` / `fonts.googleapis` / `fonts.gstatic`
across `src/` and `index.html` returns zero.

**The selector ceiling did not move**, and did not need raising: `uiContract.test.ts` routes
`@`-prefixed at-rule preludes into *conditions*, not the selector inventory, so a second
`@font-face` block contributes nothing to the count. `themeTokens.test.ts` and `uiContract.test.ts`
both pass unchanged.

## What is NOT claimed

**⛔ A12 — physically opening an exported PNG and inspecting the latin-ext glyphs — is NOT
performed here, and nothing in this plan may be read as performing it.** It is scheduled in
`04-16`. It is one of the **nine Phase 3 UAT cells that were never performed**. Skipped is not
passed, it cannot be inherited, and this automated result is not a substitute for it.

What the automated half proves, exactly and no further:

1. the clone's injected `<style>` **carries** two `unicode-range`-scoped faces for one family, both
   base64-inlined; and
2. a pure-latin-ext string **rasterises differently** with those faces than without them, so these
   vendored bytes — not the fallback stack — are what drew those glyphs.

It does **not** prove the glyphs are the **right shapes**. Only a human looking at a downloaded PNG
can say that. Equally: **no claim of full Unicode coverage is made anywhere.** Greek, Cyrillic,
Vietnamese precomposed forms (`U+1EA0-1EF9`) and CJK are separate Google Fonts subsets and were not
vendored; a composition using them still falls back mid-string.

## Known Stubs

None introduced by this plan.

Carried forward, unchanged and not owned here: a saved composition still reloads with default water
(`04-14` owns the V3 record), and `.planning/debug/kosovo-renders-white-uncolorable.md` remains as
`04-03` left it.

## Notes for later plans

- **`04-11`** (creator-typed text is the most visible element on the map) inherits latin-ext
  coverage in both the editor and the export. If it adds a **font picker**, the option list must be
  derived from `EXPORT_FONT_FACE_BUILDERS.keys()` — a family the registry does not know renders as
  fallback **silently**, with no error and no toast. Rule recorded in `coding-rules/export.md`.
- **Adding a second font family remains an owner decision.** `EXPORT_FONT_FACE_BUILDERS.size === 1`
  is asserted precisely so that decision cannot be made accidentally inside a plan.
- **`theme.css` and `interFontFace.ts` must be kept in step by hand.** The clone cannot see the
  stylesheet; a range present in one and not the other makes the creator see one thing on screen
  and download another. No gate compares the two — a real gap, named rather than papered over.
- **Bundle weight** is now 674 kB raw / 293 kB gzipped, over the 500 kB warning threshold Vite
  prints. Nothing in this phase is blocked by it; if a later phase cares, the two base64 fonts are
  where ~86 kB gzipped of it lives.

## Self-Check: PASSED

- `src/assets/inter-latin-ext-variable.woff2` — FOUND
- `src/assets/README.md` — FOUND, second row present, latin row byte-unchanged
- `src/styles/interFontFace.ts` — FOUND, two faces
- `src/styles/theme.css` — FOUND, two `@font-face` blocks
- `src/utils/export.ts`, `src/utils/export.test.ts` — FOUND
- `tests/e2e/export.spec.ts`, `tests/e2e/fixtures/export.html` — FOUND
- `.planning/coding-rules/export.md` — FOUND, font section rewritten
- Commits `8546156`, `f1bec75`, `e4ad883` — all FOUND in `git log`
- `.planning/STATE.md` and `.planning/ROADMAP.md` — **untouched** (orchestrator owns those writes)
- No forbidden gsd-sdk verb (`state.advance-plan`, `state.update-progress`,
  `roadmap.update-plan-progress`) was run
