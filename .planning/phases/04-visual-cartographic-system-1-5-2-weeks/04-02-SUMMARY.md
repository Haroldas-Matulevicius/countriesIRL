---
phase: 04-visual-cartographic-system-1-5-2-weeks
plan: 02
subsystem: ramp-data-model
status: complete
tags: [ramps, palette, wcag, contrast, colorbrewer, pure-module, tdd]
requires:
  - "04-01 — src/utils/contrast.ts (relativeLuminance, contrastRatio, parseHexColor, WCAG_AA_BODY_RATIO, COMPOSITION_INK_COLOR)"
provides:
  - "src/utils/ramps.ts — RampId, Ramp, RAMP_IDS, RAMP_STEP_COUNT, RAMPS, shadeForIndex, shadeForValue"
  - "RAMPS — five ramps x five shades, monotone, globally disjoint, all label-legible"
  - "shadeForValue(ramp, t) — the proportional-shading accessor Phase 5's classing engine calls unchanged"
  - "src/utils/ramps.test.ts — the monotone-luminance, disjointness, and label-contrast gates"
  - "The forbidden luminance band (0.183333, 0.216351) as a documented, reusable constraint"
affects:
  - "04-05's resolveColorValue binds to {rampId, t}; RAMP_IDS is the vocabulary it validates against"
  - "04-07's ramp strip renders RAMPS[i].shades as five 65.6px segments and picks its check-glyph colour by the same max-contrast rule Gate 3 asserts"
  - "04-13's bar legend derives its row count from RAMP_STEP_COUNT"
  - "04-14's V3 record persists a RampId; it must import RAMP_IDS rather than restate the five ids"
  - "Phase 5's classing engine calls shadeForValue with a computed t"
tech-stack:
  added: []
  patterns:
    - "A ramp is a bounded ordered step set, never a continuous gradient"
    - "A palette gets substituted to satisfy a gate; the gate never gets loosened to fit a palette"
    - "Adjacent-step separation is a measurement, never a threshold"
    - "An assertion count is a literal, never a product of two .length reads"
key-files:
  created:
    - src/utils/ramps.ts
    - src/utils/ramps.test.ts
  modified:
    - .planning/coding-rules/frontend.md
decisions:
  - "U-1 confirmed: RAMP_STEP_COUNT = 5, uniform across all ramps, derived from 328 / N >= 44"
  - "U-2 confirmed: blues, reds, greens, purples, greys"
  - "U-12 confirmed: shade sets are globally disjoint; research OQ-5 closes in favour of disjointness"
  - "blues step 3 ships #2171B5, NOT ColorBrewer 5-class Blues' #3182BD, which clears neither label colour (best case 4.2731:1)"
  - "shadeForIndex(ramp, 0, 1) returns the DARKEST shade — a fork the plan did not settle"
  - "Non-finite t / non-finite index / non-positive-integer count THROW rather than resolving quietly"
metrics:
  duration: "~25 min"
  completed: 2026-08-06
actuals:
  tokens: 8936
  tasks: 2
  commits: 3
---

# Phase 4 Plan 02: The Ramp Data Model Summary

Five ramps of five shades each, ordered light to dark, globally disjoint, every shade legible under
whichever of `#FFFFFF` / `#111827` a label would pick — plus `shadeForValue(t)`, the
proportional-shading accessor Phase 5's classing engine calls without anything downstream changing.

## What shipped

| Task | Name | Commits |
|---|---|---|
| 1 | The ramp module — vocabulary, table, and accessors | `8452425` (RED) → `e0053fd` (GREEN) |
| 2 | The three ramp gates, each RED-proved on its own subject | `a58b978` |

`RAMPS` (light → dark), with the **measured** relative luminance and the **measured** best-label
contrast for every shade. Nothing in this table was estimated; every number comes from
`src/utils/contrast.ts`.

| Ramp | 0 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| **Blues** | `#EFF3FF` | `#BDD7E7` | `#6BAED6` | `#2171B5` | `#08519C` |
| *L* | 0.896719 | 0.651892 | 0.382529 | 0.154698 | 0.083368 |
| *best label* | 15.9948 | 11.8584 | 7.3076 | 5.1295 | 7.8730 |
| **Reds** | `#FEE5D9` | `#FCAE91` | `#FB6A4A` | `#DE2D26` | `#A50F15` |
| *L* | 0.821192 | 0.530119 | 0.313117 | 0.175463 | 0.083951 |
| *best label* | 14.7188 | 9.8011 | 6.1349 | **4.6571** | 7.8387 |
| **Greens** | `#EDF8E9` | `#BAE4B3` | `#74C476` | `#31A354` | `#006D2C` |
| *L* | 0.910225 | 0.691806 | 0.445009 | 0.274874 | 0.111191 |
| *best label* | 16.2230 | 12.5328 | 8.3632 | 5.4887 | 6.5140 |
| **Purples** | `#F2F0F7` | `#CBC9E2` | `#9E9AC8` | `#756BB1` | `#54278F` |
| *L* | 0.879128 | 0.599608 | 0.345504 | 0.174716 | 0.053190 |
| *best label* | 15.6976 | 10.9751 | 6.6820 | **4.6726** | 10.1754 |
| **Greys** | `#F7F7F7` | `#CCCCCC` | `#969696` | `#636363` | `#252525` |
| *L* | 0.930111 | 0.603827 | 0.304987 | 0.124772 | 0.018500 |
| *best label* | 16.5589 | 11.0464 | 5.9975 | 6.0078 | 15.3284 |

The two bolded values are the tightest margins in the table — `#DE2D26` clears AA by 0.157 and
`#756BB1` by 0.173. They pass **on merit**; they are flagged so that a later plan nudging either
hue knows how little room it has.

## Adjacent-step separation — a MEASUREMENT, not a threshold

**Minimum measured adjacent-step contrast ratio across all five ramps: `1.2944:1`**, at
greens step 0 → 1 (`#EDF8E9` / `#BAE4B3`).

**This is a measurement and not a threshold.** No adjacent-step gate was added, and none should be.
The full table is logged by `src/utils/ramps.test.ts` on every run:

```
blues   0->1 1.3488   1->2 1.6228   2->3 2.1130   3->4 1.5348
reds    0->1 1.5017   1->2 1.5976   2->3 1.6105   3->4 1.6832
greens  0->1 1.2944   1->2 1.4986   2->3 1.5237   3->4 2.0155
purples 0->1 1.4303   1->2 1.6425   2->3 1.7600   3->4 2.1777
greys   0->1 1.4990   1->2 1.8418   2->3 2.0311   3->4 2.5514
```

**The stricter 3:1 gate is NOT proposed as a follow-up, because the measurement refutes it.** The
plan asked to propose it *if* every shipped ramp turned out to clear 3:1. Not one of the twenty
adjacent pairs does — the maximum observed is 2.5514:1 and **every ramp has at least one neighbour
pair below 2:1**. This confirms `04-RESEARCH.md`'s `[ASSUMED, A2]` empirically: a 5-step sequential
ramp cannot hold 3:1 between every neighbour inside sRGB. A gate added here would be red on arrival
and would then get loosened rather than obeyed. Distinguishability stays the legend's job.

## The three RED proofs

Each probe was made by copying `src/utils/ramps.ts` to the scratchpad, mutating the subject **that
gate covers**, running `npx vitest run src/utils/ramps.test.ts`, and restoring by **scratchpad
copy-back**. `git checkout --` was never used. After each proof, `git status --porcelain
src/utils/ramps.ts` and `git diff --stat HEAD -- src/utils/ramps.ts` both printed **nothing**, and
after proof 3 a byte-level `diff` against the pristine copy reported the files identical.

**Every probe reddened exactly its own gate and nothing else** — each run reported
`Tests 1 failed | 23 passed (24)`. That count is the check against the "a probe reddens a
*different* gate" shape, and it is why it is recorded here rather than just the message.

### Proof 1 — Gate 1 (monotone luminance). Subject: swap blues steps 1 and 3.

```
FAIL  src/utils/ramps.test.ts > Gate 1 — strictly monotone decreasing luminance, light to dark > blues darkens at every one of its four transitions
AssertionError: ramp "blues" step 2 (#6BAED6) is not strictly darker than step 1 (#2171B5): expected 0.38252943036377224 to be less than 0.1546978350489521
      Tests  1 failed | 23 passed (24)
```

### Proof 2 — Gate 2 (global disjointness). Subject: greys step 2 set to a hex already in blues.

`#969696` → `#6BAED6`. Chosen deliberately: `#6BAED6`'s luminance (0.382529) still sits between
greys steps 1 and 3, so the mutation leaves monotonicity intact and Gate 1 stays green — the probe
can only redden the gate it is aimed at.

```
FAIL  src/utils/ramps.test.ts > Gate 2 — globally disjoint shade sets > no hex appears in two ramps
AssertionError: expected '#6BAED6 appears in "blues" and in "gr…' to be '' // Object.is equality
      Tests  1 failed | 23 passed (24)
```

### Proof 3 — Gate 3 (label contrast). Subject: blues step 3 reverted to `#3182BD`.

This probe is the **real defect the palette substitution fixed**, replayed. `#3182BD` is monotone
in position and unique across the table, so Gates 1 and 2 stay green.

```
FAIL  src/utils/ramps.test.ts > Gate 3 — every shade carries a readable label > clears 4.5:1 against whichever of paper / ink the strip would pick
AssertionError: ramp "blues" shade #3182BD measures 4.1515:1 on #FFFFFF and 4.2731:1 on #111827; neither label colour is readable on it: expected 4.273135337572973 to be greater than or equal to 4.5
      Tests  1 failed | 23 passed (24)
```

### A fourth proof, on Task 1's subtlest behaviour

The TDD RED for Task 1 was a `Cannot find module './ramps'` failure — which is the
"probe that throws at *import*, so the assertion never runs" shape, and therefore **not** evidence
that any individual behaviour assertion can fail. The nearest-step snapping assertion was proved
separately against a real implementation: `Math.round(clamped * lastStep)` →
`Math.floor(clamped * lastStep)`, restored by scratchpad copy-back and verified byte-identical.

```
FAIL  src/utils/ramps.test.ts > shadeForValue > snaps t to the NEAREST step, not the floor
AssertionError: ramp "blues" floored 0.49 instead of snapping to the nearest step: expected '#BDD7E7' to be '#6BAED6'
      Tests  1 failed | 14 passed (15)
```

## Deviations from Plan

### [Rule 1 — correctness] ColorBrewer 5-class Blues' `#3182BD` fails the label-contrast gate

**Found during:** Task 1. **Issue:** the plan names ColorBrewer sequential schemes as the
recommended starting point. Four of the five transcribe cleanly; **Blues does not.** `#3182BD` has
relative luminance **0.202924**, which lands inside the band where a shade clears *neither* label
colour. Requiring `max(contrast(c, '#FFFFFF'), contrast(c, '#111827')) >= 4.5` resolves to
`L <= 0.183333` **or** `L >= 0.216351`; `(0.183333, 0.216351)` is a dead band. `#3182BD` measures
4.1515:1 on white and 4.2731:1 on ink — best case **4.2731:1**, short of AA.
**Fix:** `blues` step 3 ships **`#2171B5`** (ColorBrewer Blues 9-class, same family, `L = 0.154698`,
5.1295:1 on white). The gate was **not** loosened; the palette was substituted, which is the
posture the plan explicitly demanded. The substitution and its arithmetic are written into the
`RAMPS` doc comment so a future editor cannot silently reintroduce the ColorBrewer value.
**Files:** `src/utils/ramps.ts`. **Commit:** `e0053fd`. **RED-proved:** proof 3 above.

**Worth carrying forward:** the band's upper edge, `0.216351`, is the same number as
`MIN_COMPOSITION_SURFACE_LUMINANCE` from `04-01`. A surface that must carry the ink and a shade
that must carry a label are the same arithmetic. `04-08` (uncolored fill), `04-10` (bands), and
`04-11` (text) all pick composition colours that carry ink; the band is now recorded in
`coding-rules/frontend.md` for them.

### [reported, not worked around] One acceptance criterion is a source-text proxy, and it is only partly met

The plan asks that `grep -n "25" src/utils/ramps.test.ts` find the literal **inside** the
disjointness assertion. What shipped is `const EXPECTED_TOTAL_SHADES = 25;` at line 36, consumed by
the disjointness assertion at line 345 (and named in its failure message at line 344). So the grep
finds `25` in the file and one hop from the assertion, **not lexically inside it**.

This is stated rather than glossed because the criterion's *intent* — "never a product of two
`.length` reads, which is green at zero rows" — is fully met and independently gated: the
disjointness test counts the shades it actually collected (`collectedShades`) and asserts that
count against the literal-valued constant **before** comparing `owners.size`, so a table that
produced zero rows fails on the count rather than passing on an empty `Set`. Inlining the digits
`25` twice in the same assertion would satisfy the grep and add nothing.

`grep -c "toBeLessThan" src/utils/ramps.test.ts` returns **21**: exactly **20 executable
assertions** (five ramps × four transitions, written out rather than looped, per the plan) plus one
occurrence inside a comment. That criterion is met on merit.

### [fork the plan did not settle] `shadeForIndex(ramp, 0, 1)` returns the darkest shade

`shadeForIndex(ramp, index, count)` is specified as "step `index` of `count`", but `count === 1`
has no defined answer — the natural formula `index / (count - 1)` divides by zero. **Chosen: the
darkest shade.** A single class carries the entire ramp, and the lightest shade is near-white
(`L` between 0.82 and 0.93 for every ramp), which would be indistinguishable from the uncolored
fill and from a white water surface. Recorded per the standing authorization's instruction to take
the spec's own recommendation on an unsettled fork and say so; the spec has none here, so this is a
product judgement, cheaply reversible (one line, one test), and written into the function's doc
comment.

### [Rule 2 — correctness] Non-finite input throws rather than resolving quietly

The plan's behaviour list says `shadeForValue` "rejects a non-finite `t`" without saying how.
Both accessors **throw**, matching `contrastRatio`'s established posture in `src/utils/contrast.ts`
(a bad input is loud at test time, never a quiet wrong number at export time). `shadeForIndex`
additionally throws on a `count` that is not a positive integer, for the same reason. This is
T-04-02-01's mitigation: no caller can drive an out-of-bounds index read.

## Threat model

Both mitigations the register assigns to this plan are implemented and asserted.

| Threat ID | Disposition | Where it is asserted |
|---|---|---|
| T-04-02-01 — hostile `t` | mitigated | `shadeForValue` clamps `[0, 1]` and throws on non-finite; `shadeForIndex` clamps the index and throws on a bad count. `shadeForValue > clamps t outside [0, 1]` and `> rejects a non-finite t`, `shadeForIndex > clamps an out-of-range index` and `> rejects a non-finite index or an unusable class count` |
| T-04-02-02 — malformed hex in `RAMPS` | mitigated | `the ramp table > writes every shade in canonical uppercase #RRGGBB` (25 asserted), plus `luminanceOf` throwing on a null parse rather than rating an unparseable colour as black |
| T-04-02-SC — npm / lockfile | mitigated | **Zero package-manager installs.** `git diff` confirms `package.json` and `package-lock.json` untouched. The table is authored in-repo; no colour or palette package was pulled |

## Threat Flags

None. This plan adds a pure module of frozen constants and two total functions. It reads no
creator-supplied input, touches no storage, issues no request, and renders nothing. No trust
boundary is crossed, and no new network, auth, file-access, or schema surface exists.

## Known Stubs

**None.** Nothing in this plan renders a placeholder or returns a hardcoded empty value. The module
is complete on its own terms; it simply has no consumer yet — `04-05`, `04-07`, and `04-13` are
the plans that wire it, exactly as the wave order intends. An unconsumed module is not a stub.

## Verification

| Gate | Result |
|---|---|
| `npx vitest run src/utils/ramps.test.ts` | **24 passed** |
| `npx vitest run src/utils/ramps.test.ts src/utils/contrast.test.ts` | **33 passed** |
| `npm run lint` | clean |
| `npm test` | **679 passed / 45 files** (was 655 / 44 at the close of `04-01`; +24, +1 file) |
| `npm run build` | clean (`tsc -b` strict, no `any`) |
| `npm run test:e2e` | **not run, and not claimed.** This plan is a pure `node`-environment unit module — it touches no render, camera, export, persistence, or layout surface. The plan states no e2e is required |

**Browser scope.** No browser result is produced or cited by this plan at all. **Microsoft Edge is
not installed on this machine**; Firefox and Safari have never been run in this repo. **No Phase 3
UAT cell is cited as verified anywhere in this document** — nine of its twelve were never
performed, and skipped is not passed.

**No physical check was performed or is claimed.** In particular: the 65.6px segment width that
`RAMP_STEP_COUNT`'s derivation rests on is **arithmetic, not a measured touch target** — the strip
does not exist yet (`04-07` builds it), so no physical touch-target check, screen-reader pass, or
zoom check has been done on it. The derivation is a design constraint handed to `04-07`, not
evidence that the target is adequate.

**On `estimate` vs `actuals` scale.** The plan's `estimate` records `tokens: 44000` /
`raw_tokens: 22000` without stating the scale. `actuals.tokens: 8936` is the chars/4 measurement
over the realized diff (35,746 added characters across `ramps.ts`, `ramps.test.ts`, and
`frontend.md`), which is the scale the SUMMARY contract specifies. The two numbers are reported as
measured; no attempt was made to reconcile them by rounding.

## Self-Check: PASSED

- `src/utils/ramps.ts` — FOUND
- `src/utils/ramps.test.ts` — FOUND
- `.planning/coding-rules/frontend.md` § The Ramp Model — FOUND (landed in `a58b978`, the same
  commit as the behaviour it documents)
- Commits `8452425`, `e0053fd`, `a58b978` — all resolve in `git log`
- `.planning/STATE.md` and `.planning/ROADMAP.md` — **not modified**; no forbidden gsd-sdk verb was
  run. `git diff 5723c5e HEAD --stat` lists exactly three files
