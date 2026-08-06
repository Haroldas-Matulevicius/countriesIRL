---
phase: 03-clean-ui-overhaul-1-1-5-weeks
plan: 02
subsystem: design-system
tags: [design-contract, motion-tokens, lockstep, vendored-icons, provenance, red-probe, one-way-gate]
status: complete

requires:
  - phase: 03-clean-ui-overhaul-1-1-5-weeks
    plan: 01
    provides: "motion@12.40.0 pinned exact; the vendored Inter latin-subset woff2; the OQ-1 POSITIVE verdict; FINDING 1 (the transitive framer-motion) and FINDING 2 (the latin-only subset)"
provides:
  - "`Design.md` at the repo root — the normative design contract 03-03 onward implements against (D-01, D-02, D-03, D-09)"
  - "`src/lib/motion/tokens.ts` — the seven mirrored motion constants plus a DERIVED `CAMERA_MOTION_DURATION_MS`"
  - "`src/lib/motion/tokens.test.ts` — assertion 7, the CSS<->TS lockstep, self-counting and two-way, RED-proven"
  - "Six `--motion-*` declarations in `theme.css` `:root`, added additively, plus their reduced-motion zeroes"
  - "`src/components/icons/` — 14 vendored animated glyphs, a barrel, `PROVENANCE.md`, and `iconContract.test.ts` (assertions 22 + 28, both RED-proven)"
  - "`CLAUDE.md` routing table: `Design.md` promoted from 'does not exist yet' to a normative engine doc"
  - "`coding-rules/frontend.md` §The Motion Token Mirror and §Vendored Animated Icons"
affects: [03-03, 03-04, 03-05, 03-06, 03-07, 03-09, 03-11]

actuals:
  tokens: 61390
  tasks: 4
  commits: 3

tech-stack:
  added: ["src/lib/motion/tokens.ts — the TS motion mirror", "src/components/icons/ — 14 motion/react animated glyph components (first source consumer of `motion`)"]
  patterns:
    - "a lockstep gate that asserts its own row count three independent ways and both set memberships two-way"
    - "an evidence file (PROVENANCE.md) that is a test INPUT, not documentation beside the test"
    - "a byte-identical absorption asserted EQUAL and a deliberate retime asserted DIFFERENT, so a rename and a retime stop looking alike in a diff"

key-files:
  created:
    - Design.md
    - src/lib/motion/tokens.ts
    - src/lib/motion/tokens.test.ts
    - src/components/icons/PROVENANCE.md
    - src/components/icons/iconContract.test.ts
    - src/components/icons/index.ts
    - "src/components/icons/{Check,Crosshair,Download,Folder,Layers,List,Map,Minus,Moon,Palette,Plus,Redo,Sun,Undo}Icon.tsx"
  modified:
    - CLAUDE.md
    - src/styles/theme.css
    - src/styles/phase2CssContract.test.ts
    - src/utils/motion.ts
    - src/constants/camera.ts
    - .planning/coding-rules/frontend.md

key-decisions:
  - "D-01 gate answered CONFIRM on a BLANKET, IN-ADVANCE, SIGHT-UNSEEN PROCEED-AUTHORIZATION — not a content review, not hash-bound (Immutable Safety Constraint 8)"
  - "Implemented 03-01 FINDING 1 as decided: accepted the transitive framer-motion 12.43.0, added NO npm `overrides`. Research assumption A4 is NOT removed — it moved one level down"
  - "The three absorbed Phase 2 motion names stay declared through this plan; 03-04 owns the retirement, and deleting one here would collide with its retired-token gate"
  - "phase2CssContract.test.ts's motion-consumer set was WIDENED to the TS mirror, in addition to utils/motion.ts. Recorded as a genuine interim weakness for three tokens, not presented as neutral"
  - "No glyph was taken from the three previously PENDING upstream files; their disposition is `not vendored`, dated, recorded either way"

requirements-completed: [D-01, D-02, D-03, D-09, D-26, D-28, A-07, A-09, A-19, A-22, A-28, R-V2]
---

# Phase 3 Plan 02: The Design Contract Summary

Turned the D-01 commitment into a written, testable contract: `Design.md` at the repo root, the
motion token mirror with a lockstep gate that was proven able to fail, and 14 vendored animated
icons whose provenance evidence is a **test input** rather than a note beside one.

`03-01` was cheaply reversible — a tag, a spike, a pinned package, some font bytes. This plan is
where the commitment became irreversible, which is why it opened with the gate.

---

## Checkpoint: Task 1 — D-01 one-way commitment gate

**Gate:** `checkpoint:decision`, `gate="blocking"`, `autonomous: false`. The one-way commitment to
the Themely design system, placed immediately before the irreversible authoring work.

**Selection: `proceed` (D-01 stands).** Date: **2026-08-06**.

### What kind of authorization is actually held

A **BLANKET, IN-ADVANCE, SIGHT-UNSEEN PROCEED-AUTHORIZATION.** Per
`coding-rules/general.md` § Immutable Safety Constraints, **constraint 8**, that authorizes
**proceeding**. It is **NOT a content review** and it is **NOT hash-bound**. Recorded here because
constraint 8 requires recording which one is actually held.

The owner's words, verbatim, given at session start:

> "I am going to sleep, so if something comes up, find best solution."

and

> "I want you to complete this fully."

**The plan's `resume-signal` asked for `Select: proceed, or hold`. That exact string was not
given.** What is held is the blanket authorization above.

**The owner reviewed no content, inspected no diff, and performed no physical check of any kind
for this gate.** No visual, touch, or screen-reader claim is made anywhere in this plan. Nothing
below may be read as owner review.

### Mechanically-checkable evidence, run 2026-08-06

The gate's stated basis is that D-01 is already recorded direction and this checkpoint exists to
force a conscious re-confirm, not to reopen the choice. That basis was checked against the
artifacts rather than asserted:

```
$ grep -n "D-01" .planning/phases/03-clean-ui-overhaul-1-1-5-weeks/03-CONTEXT.md
30:- **D-01:** CountriesIRL adopts the **Themely design system**, sourced from

  ...`/Users/matul/claudeprojects/themely/Design.md` (sibling repo, outside this repo).
  The user directed this explicitly. — **Reversibility:** one-way

$ sed -n '1,11p' .../03-UI-SPEC.md
status: approved
approved: 2026-08-06
checker_flags_resolved: 7
upstream_design_system: /Users/matul/claudeprojects/themely/Design.md (sibling repo, read-only)

$ grep -n "Amendment 3" -A 6 .planning/ROADMAP.md
219:> **Amended 2026-08-06 (Amendment 3).** ... Two runtime dependencies enter the phase
     (`motion` v12 and vendored lucide-animated icons, D-27/D-28)
```

Three independent approved artifacts carry the direction: `03-CONTEXT.md` D-01 (owner-locked, and
recording that *"the user directed this explicitly"*), `03-UI-SPEC.md` with `status: approved` and
7 checker flags resolved, and `ROADMAP.md` Amendment 3 as a landed scope edit.

**No file in `files_modified` was touched before this gate was answered.** Tasks 2, 3, and 4 all
postdate it; the first commit of this plan is `b512356`.

---

## RED probes (3, with output)

Immutable Safety Constraint 10: *a gate must be able to fail on the bug it covers.* Every probe
used the scratchpad copy-and-restore protocol from `coding-rules/general.md` § Git safety.
**`git checkout --` was not run at any point in this plan**, on any file.

### Probe 1 — assertion 7, the motion lockstep

**Break:** copy `src/lib/motion/tokens.ts` to the scratchpad, then change `DURATION_BASE` from
`0.24` to `0.25` **in the TS layer only**.

```
$ npx vitest run src/lib/motion/tokens.test.ts

 ❯ src/lib/motion/tokens.test.ts (8 tests | 1 failed) 5ms
     × mirrors every token value across both layers after normalisation 3ms

 FAIL  src/lib/motion/tokens.test.ts > motion token lockstep (theme.css :root <-> lib/motion/tokens.ts)
       > mirrors every token value across both layers after normalisation
AssertionError: "--motion-duration-base" in theme.css disagrees with DURATION_BASE.:
              expected 240 to be 250 // Object.is equality

- Expected
+ Received

- 250
+ 240

 ❯ src/lib/motion/tokens.test.ts:201:11

 Test Files  1 failed (1)
      Tests  1 failed | 7 passed (8)
```

**Restore:** `cp "$SP/tokens.ts.orig" src/lib/motion/tokens.ts` — **copied back from the
scratchpad, not `git checkout --`.** SHA-256 before and after the probe:
`4ec0268da3cb514bb2991f09aaef89d560c8df63a0ca290d64771d637ff1f8e6`, byte-identical. Re-run: 8
passed.

### Probe 2 — assertion 22, the icon handle contract

**Break:** copy `src/components/icons/PaletteIcon.tsx` to the scratchpad, then delete the
`PaletteIconHandle` export (renamed to a non-exported local so the file still parses — a *silent*
break, not a syntax error).

```
$ npx vitest run src/components/icons/iconContract.test.ts

 ❯ src/components/icons/iconContract.test.ts (20 tests | 1 failed) 8ms
     × PaletteIcon.tsx exports a forwardRef component and a structurally identical handle 1ms

 FAIL  ... > vendored icon contract (assertion 22)
       > PaletteIcon.tsx exports a forwardRef component and a structurally identical handle
AssertionError: PaletteIcon.tsx declares no PaletteIconHandle interface.:
              expected undefined to be defined
 ❯ src/components/icons/iconContract.test.ts:130:9

 Test Files  1 failed (1)
      Tests  1 failed | 19 passed (20)
```

**Restore:** copied back from the scratchpad. SHA-256 before and after:
`48aae4ca608300638915ace8084c6f077b30cedba7107981bbcc0926a54c428c`, byte-identical. Re-run: 20
passed.

### Probe 3 — assertion 28, the provenance two-way set equality

Run in **both** directions, because "two-way" is the claim and a one-direction probe would only
prove half of it.

**3a — a file with no provenance line.** Added `GhostIcon.tsx` (a copy of `CheckIcon.tsx`).

```
$ npx vitest run src/components/icons/iconContract.test.ts

 ❯ src/components/icons/iconContract.test.ts (20 tests | 2 failed) 9ms
     × vendors exactly the glyph inventory the UI-SPEC names 3ms
     × records evidence and files as a TWO-WAY equal set 1ms

AssertionError: expected [ 'CheckIcon.tsx', …(14) ] to deeply equal [ 'CheckIcon.tsx', …(13) ]
+   "GhostIcon.tsx",

AssertionError: expected [ 'CheckIcon.tsx', …(16) ] to deeply equal [ 'CheckIcon.tsx', …(17) ]
```

**3b — a provenance line with no file.** Removed the `MoonIcon.tsx` line from `PROVENANCE.md`.

```
 ❯ src/components/icons/iconContract.test.ts (20 tests | 1 failed) 9ms
     × records evidence and files as a TWO-WAY equal set 2ms

 FAIL  ... > vendored icon provenance (assertion 28 / R-V2)
       > records evidence and files as a TWO-WAY equal set
AssertionError: expected [ 'CheckIcon.tsx', …(15) ] to deeply equal [ 'CheckIcon.tsx', …(16) ]
```

**Restore:** `rm src/components/icons/GhostIcon.tsx` (a file this session created, never tracked),
and `cp "$SP/PROVENANCE.md.orig" src/components/icons/PROVENANCE.md`. SHA-256 before and after:
`356910e69a3be82061c3166684fc7c8290c84b8d5295557d82de538aa87addae`, byte-identical. Directory back
to 17 files. Re-run: 20 passed.

---

## Design.md discretion items **[FOR REVIEW]**

`Design.md` § 7 is marked `[FOR REVIEW]` in the file itself. **Nothing in it is an owner
decision** — Themely has no analog for these surfaces, so `03-CONTEXT.md` § Claude's Discretion
delegated them, and they are listed here so the owner can skim what was chosen at discretion rather
than have it buried in a 700-line document.

| # | Surface | What was decided at discretion |
|---|---|---|
| 1 | Shell + canvas | `.map-workspace__square` renamed `.map-workspace__canvas`; `aspect-ratio: 1` moves to `.map-frame`; `[data-panel-open]` is exactly `'true' \| 'false'`; the panel track animates a registered `--panel-width`, never `grid-template-columns` |
| 2 | Rail row | 36px, `--radius-row` 10px, `--text-body-sm`, Nav Ink constant across all three states, **instant** hover, glyph animated from ROW hover through the handle. Glyph choices: `palette` / `list` / `layers` / `folder`, plus `undo-2` / `redo-2` |
| 3 | HUD header | 32×32 Powder monogram chip (or a `map` glyph when unnamed), name at `--text-h3` with ellipsis, a neutral `Saved` / `Unsaved changes` pill. At 56px the name and pill go `opacity: 0`, **never `display: none`** |
| 4 | HUD footer | Export filled from the mode-invariant `--accent-fill`; theme toggle **neutral** ghost (`sun` / `moon`) with `aria-pressed` and a destination-naming accessible name |
| 5 | Colour swatch grid | `repeat(auto-fit, minmax(76px, 1fr))` derived tracks; 48px min tile; 24×24 swatch with the `--swatch-border` hairline; the `check` glyph sits **on the tile background, not on the swatch**; `--active-check-*` deleted |
| 6 | Mixed-selection chip | A 24×24 diagonal split of Porcelain / Slate Blue plus the visible text `Mixed`; it **flips with the theme** because it represents a state, not a colour. Replaces the deleted `--mixed-color-*` |
| 7 | Legend editor rows | Porcelain card with **no inner hairline**; actions stacked onto their own 44×44 row; `<fieldset>` legends at `--text-body-sm` weight 500, deliberately **not** `--text-subheading`; invalid state keyed on the **data attribute**, never a positional selector |
| 8 | Saved-map row | 32×32 Platinum chip stepping **up** from the Porcelain card; ghost `Load This Map`; destructive `Delete Saved Map` never one-shot; the confirmation pair swaps into the row |
| 9 | Floating controls | One bordered cluster of four 44×44 buttons in the **letterbox gutter**, never over the export frame; `Zoom Out` absent at the whole-world fit; `Move Map` **retained as a fourth control** because it is the only keyboard pan affordance |
| 10 | Period surface | A **visibly inert read-only pill**, not a disabled `<select>` — no chevron, no "coming soon", no count of hidden periods |
| 11 | Tooltip | Fixed dark ink chip (`#061b31` / `#ffffff`, 17.9:1) even though it can never reach the export clone |

**Two items in `Design.md` are flagged for the owner but are NOT discretion — they are open
questions inherited from the UI-SPEC**, restated so they cannot be lost:

- **`Move Map` retention** (item 9). D-21 names *three* controls; the UI-SPEC keeps four on
  accessibility grounds. If the owner wants three, keyboard panning needs a replacement first.
- **The saved-map period short label** (§ 7.6). A hand-crafted `localStorage` record carrying
  `"snapshotId": "1914"` validates today and the row renders `1914`. **This is pre-existing Phase 2
  behavior, not a Phase 3 regression**, Live Invariant 6 is intact (manifest text never reaches the
  UI), and reaching it requires hand-editing browser storage. `Design.md` records it as an open
  correction and explicitly says Phase 3 must **neither restate the false comment nor silently fix
  the validator**. Not fixed here — a storage-validator behavior change is out of a chrome plan's
  scope (deviation Rule 4).

---

## Finding A, implemented as decided — A4 moved, it was not removed

`03-01` FINDING 1: the exact `motion@12.40.0` pin does **not** deliver the byte-match with Themely
it was partly chosen for. Measured again this session against the resolved tree:

```
$ node -p "require('./node_modules/motion/package.json').dependencies"
{ 'framer-motion': '^12.40.0', tslib: '^2.4.0' }

motion         12.40.0     (Themely: 12.40.0)
framer-motion  12.43.0     (Themely: 12.40.0)
motion-dom     12.43.0     (Themely: 12.40.0)
motion-utils   12.39.0     (Themely: 12.39.0)

$ node -p "JSON.stringify(require('./package.json').overrides ?? null)"
null
```

**The orchestrator's decision was implemented, not re-litigated: the transitive 12.43.0 is
accepted and NO npm `overrides` block was added.** Rationale, recorded in `Design.md` § 5:

- The actual threat (T-03-01, silently reaching `13.x`) is mitigated — `^12.40.0` cannot cross a
  major, and `package-lock.json` pins all four exactly so `npm ci` is deterministic.
- `03-RESEARCH.md` § Standard Stack independently recommended 12.43.0.
- Forcing a transitive **downgrade** below what the package author's own range declares is riskier
  than accepting it, and is a supply-chain policy change the R-V1 gate did not authorize.

**Research assumption A4 is NOT removed. It moved one level down, to the transitive
`framer-motion` resolution, where it is less visible than it was before.** That sentence is in
`Design.md` § 5 verbatim. Nothing in this plan implies A4 was eliminated.

**The vendored icons were therefore verified against the RESOLVED 12.43.0 in this repo**, not
against Themely's 12.40.0:

```
$ node --input-type=module -e "import * as m from 'motion/react'; ..."
has motion: function
has useAnimation: function
motion.svg: object
motion.path: object
```

Plus `npm run build` (`tsc -b && vite build`) typechecks all 14 components against that tree, clean.

---

## Finding B, carried not widened — the latin-only subset

`03-01` FINDING 2 is **routed to `03-11`**, where the font is actually embedded, and was **not**
fixed here. `Design.md` § 4 records the subset stops at `U+00FF`, names the affected orthographies,
states plainly that `Košice` and `Łódź` do not render while `Magyarország` does, and points at
`03-11`. **No claim of full Unicode coverage is made anywhere.**

---

## Task-by-task

| # | Task | Type | Commit | Result |
|---|---|---|---|---|
| 1 | D-01 one-way commitment gate | `checkpoint:decision` | *(no file change)* | `proceed`, on a blanket authorization; recorded above |
| 2 | Motion tokens + lockstep | `auto` (tdd) | `b512356` | 8 assertions, RED-proven |
| 3 | Vendored icons + provenance | `auto` | `306047c` | 14 glyphs, 20 assertions, 2 RED probes (3 directions) |
| 4 | `Design.md` + `CLAUDE.md` | `auto` | `3196774` | 9 sections, all verify gates green |

### Task 2 — what actually landed

`src/lib/motion/tokens.ts` exports `EASE_OUT`, `EASE_SNAPPY`, `EASE_IN`, `DURATION_FAST`,
`DURATION_BASE`, `DURATION_SLOW`, `SCENE_CROSSFADE_DURATION_MS`, a **derived**
`CAMERA_MOTION_DURATION_MS = DURATION_BASE * 1000`, and `MOTION_TOKEN_MIRROR` — the lockstep table
the gate iterates.

The gate asserts its own row count **three independent ways** (compared-pair length, mirror key
count, and distinct-key count, all against a literal `EXPECTED_MIRROR_ROWS = 7` written beside the
table), and asserts **two set memberships two-way**: declared `--motion-*` / `--easing-*` tokens
against the accounted-for set, and every export of `tokens.ts` against the mirror's constants minus
a **closed** derived list. A new constant cannot be added without being classified.

The three reconciliations are **checked claims, not comments**, because a rename and a retime look
identical in a diff:

| Reconciliation | Assertion |
|---|---|
| `--motion-fast` → `--motion-duration-fast` | values must be **EQUAL** (byte-identical absorption) |
| `--motion-camera` → `--motion-duration-base` | values must be **EQUAL** |
| `--easing-camera` → `--motion-ease-out` | values must be **EQUAL** |
| `--easing-control: ease-out` → `--motion-ease-snappy` | values must be **DIFFERENT** — a deliberate retime (A8). "Simplifying" the pair into one now fails |
| `--motion-scene: 160ms` | stays local; the test asserts both the value **and** the presence of the recorded reason |

Six `--motion-*` declarations were added to `theme.css` `:root` **additively, removing nothing**,
plus their reduced-motion zeroes. `src/utils/motion.ts` and `src/constants/camera.ts` now read the
mirror instead of holding second copies of `240`, `160`, and the `EASE_OUT` control points.

```
$ node -e "... /CAMERA_MOTION_DURATION_MS\s*=\s*240/ ..."
DERIVED_OK
```

### Task 3 — what actually landed

14 glyphs — `palette`, `list`, `layers`, `folder`, `download`, `undo-2`, `redo-2`, `sun`, `moon`,
`map`, `check`, `plus`, `minus`, `crosshair` — **authored in-repo from lucide path data** in
`search.tsx`'s shape. No registry install, no network at build or run time, no file copied
byte-for-byte across the repository boundary. Tailwind `className` strings were **translated, not
copied** (P-5); the contract test rejects any Tailwind-shaped sizing token outright.

Every file carries a `forwardRef` component, a structurally identical `*IconHandle` whose members
are asserted to be **exactly** `startAnimation` and `stopAnimation`, `useImperativeHandle` wiring,
the `size` prop feeding the svg's own `width`/`height`, and the `strokeWidth` 2→1.5 marker patch.

`PROVENANCE.md` carries a dated `read in full` line for **all 17 files** in the directory —
including `index.ts`, `iconContract.test.ts`, and itself — and the test asserts that set equals the
directory listing in **both** directions.

```
$ node -e "... missing provenance line ..."
PROVENANCE_OK 14
```

### Task 4 — what actually landed

`Design.md`, 9 sections, at the repo root. All four verify gates:

```
DESIGN_OK
PALETTE_VERBATIM_OK
ROUTING_UPDATED
DARK_AND_REST_OK        (every dark value plus the remaining light values, checked verbatim)
```

`CLAUDE.md`'s `Design.md` row moved out of the load-gated table — where it read *"**Does not exist
yet.**"* — into the always-relevant engine docs, with the precedence rule stated: `03-UI-SPEC.md`
outranks `Design.md`, and `Design.md` outranks a component file. The Phase 3 planning docs joined
the load-gated table at 90–140KB each. The two-entry `Last updated` rule was respected by merging
the two oldest into one line in the same edit; `CLAUDE.md`, `frontend.md`, and `Design.md` all sit
at ≤ 2 entries.

---

## Deviations from plan

### [Rule 3 - Blocking] `phase2CssContract.test.ts`'s motion-consumer set was widened

**Found during:** Task 2. **Issue:** the existing assertion *"gives every motion token a
consumer"* reads only `src/utils/motion.ts` and requires every `--motion-*` / `--easing-*` token in
`:root` to be named there or consumed by a `var()`. Adding the six new tokens made it fail
immediately — they have no `var()` call site until `03-04` lands the stylesheet rewrite.

**Fix:** the consumer source set now reads `src/lib/motion/tokens.ts` **in addition to**
`utils/motion.ts`, never instead of it. This is exactly what the plan's own action text authorizes
(*"a `var()` in a stylesheet or a named read in `src/lib/motion/tokens.ts` / `src/utils/motion.ts`
— this is assertion 6's TS half; its CSS half lands in `03-04`"*).

**Stated plainly, because it is a real weakening and this repo has shipped tests that could not
fail:** for `--motion-ease-snappy`, `--motion-ease-in`, and `--motion-duration-slow` the mirror is
currently the **only** reader. Nothing renders using them. For those three the assertion is weaker
than Phase 2's rule was. It is recorded in three places — the test's own comment, the new
`coding-rules/frontend.md` section, and `Design.md` § 5 — and **`03-04` closes it**.
**Commit:** `b512356`.

### [Rule 2 - Correctness] `src/constants/camera.ts` re-exports rather than re-declares

The plan asked for `CAMERA_MOTION_DURATION_MS` to be derived and for `utils/motion.ts` to be
re-pointed. `src/constants/camera.ts` also held both literals and is imported by `MapCanvas.tsx`.
Leaving it declaring `240` would have produced exactly the second copy the derivation exists to
prevent, so it now re-exports from the mirror. Same number, one home. **Commit:** `b512356`.

### [Scope, not fixed] Two items deliberately left alone

- **The saved-map `1914` short label.** Pre-existing Phase 2 behavior. Recorded in `Design.md`
  § 7.6 as an open correction with the recommended resolution; **not** fixed, because a storage
  validator change is out of a chrome plan's scope (Rule 4 — ask, do not assume).
- **The latin-ext font gap.** Routed to `03-11` by the plan's own carry-forward. Documented as a
  known limitation, not widened into this plan.

### Not a deviation, recorded anyway

`CLAUDE.md` gained one extra load-gated row for the Phase 3 planning docs (90–140KB each). Adjacent
to the row Task 4 was required to edit, and it stops an agent reading a 140KB file whole.

---

## What is NOT done

- **Nothing is styled yet.** No surface consumes a `--themely-*` token, no icon is imported by any
  component, and the bundle is byte-for-byte unchanged in size (`index-Bib-ziMh.js`, 546.85 kB —
  identical before and after Task 3, because `motion` still has no source consumer that ships).
  `03-03` and `03-04` land the stylesheet.
- **`Design.md` § 7 is `[FOR REVIEW]`, not reviewed.** The owner has seen none of it.
- **No browser was run in this plan.** No Playwright spec, no visual check, no screenshot. Every
  result here is a `node`-environment unit assertion or a file read. **Chrome 151 is the only
  browser this project has evidence for; Edge is not installed on this machine (D-33); Firefox and
  Safari have never been run here and are not claimed.**
- **`02-28` acceptance matrix — still OPEN.** Untouched by this plan.
- **Historical geometry is unchanged.** The approved catalog still holds exactly `Modern`; the
  1492 / 1700 / 1815 / 1914 packets remain **deferred for missing rights-cleared source material**.
  Nothing here makes a deferred snapshot nameable or reachable.
- **`.planning/STATE.md` and `.planning/ROADMAP.md` are untouched.** `git status --porcelain` on
  both is empty. Neither `state.advance-plan`, `state.update-progress`, nor
  `roadmap.update-plan-progress` was run.

---

## Known Stubs

None. No file created by this plan renders a hardcoded empty value, placeholder string, or
unwired data source. The 14 icon components are complete implementations with no consumer yet —
which is the plan's design, not a stub: `03-05` mounts them.

---

## Threat Flags

None. No new network endpoint, auth path, file-access pattern, or schema change at a trust
boundary was introduced. The two boundaries the plan's threat model names were both exercised:

| Threat ID | Disposition | Evidence |
|---|---|---|
| T-03-02 (tampering via vendored icon files) | mitigated | R-V2 per-file dated provenance, the pattern set recorded beside the verdict, and the forbidden-construct assertion. **The `http://` scan hit on `xmlns="http://www.w3.org/2000/svg"` is recorded as a named benign flag rather than papered over as "no flags"** |
| T-03-63 (a copied Tailwind `className`) | mitigated | assertion 22 plus the Tailwind-sizing-token ban, both green |
| T-03-64 (a motion token read by nothing) | **partially** mitigated | the row-count and two-way assertions are RED-proven; the *consumer* half is genuinely weaker for three tokens until `03-04` — see the deviation above |
| T-03-65 (a mis-transcribed palette value) | mitigated | `PALETTE_VERBATIM_OK` + `DARK_AND_REST_OK` check every light and dark value character-for-character against the UI-SPEC |

---

## Verification

```
$ npm run lint      -> clean
$ npm test          -> Test Files 40 passed (40) · Tests 541 passed (541)
$ npm run build     -> tsc -b clean; built in 73ms
$ npx tsc -b --force -> exit 0

$ npx vitest run src/lib/motion/tokens.test.ts src/components/icons/iconContract.test.ts
                    -> Test Files 2 passed (2) · Tests 28 passed (28)
```

Plan gates:

```
DERIVED_OK              (CAMERA_MOTION_DURATION_MS does not restate 240)
PROVENANCE_OK 14        (every icon .tsx has a provenance line)
DESIGN_OK               (all nine required token/attribution strings present)
PALETTE_VERBATIM_OK     (eight light values, character for character)
DARK_AND_REST_OK        (thirteen further dark and light values)
ROUTING_UPDATED         (CLAUDE.md no longer says Design.md does not exist)
```

Before Phase 2 (521 tests) → after this plan (541 tests): **+20**, all from
`iconContract.test.ts`; the 8 lockstep assertions replaced nothing and were added on top of the
existing 513 → 521 that `03-01` left. No existing test was deleted, skipped, or weakened except the
one consumer-set widening documented above.

---

## Commits

| Hash | Message |
|---|---|
| — | *(Task 1: the D-01 gate — a decision, no file change, nothing to commit)* |
| `b512356` | `feat(3-02): mirror the D-26 motion tokens in TS and pin the CSS lockstep` |
| `306047c` | `feat(3-02): vendor the D-28 animated icon set with per-file dated provenance` |
| `3196774` | `docs(3-02): author CountriesIRL's Design.md and update the routing table` |

---

## Self-Check: PASSED

| Claim | Check |
|---|---|
| `Design.md` | FOUND, 9 sections, § 7 marked `[FOR REVIEW]` |
| `src/lib/motion/tokens.ts` | FOUND, SHA `4ec0268…f8e6` matches the pre-probe value |
| `src/lib/motion/tokens.test.ts` | FOUND, 8 tests green |
| `src/components/icons/*.tsx` | FOUND, exactly 14 |
| `src/components/icons/PROVENANCE.md` | FOUND, SHA `356910e…ddae` matches the pre-probe value, 17 in-repo lines |
| `src/components/icons/iconContract.test.ts` | FOUND, 20 tests green |
| `src/components/icons/index.ts` | FOUND |
| commit `b512356` | FOUND in `git log` |
| commit `306047c` | FOUND in `git log` |
| commit `3196774` | FOUND in `git log` |
| `.planning/STATE.md`, `.planning/ROADMAP.md` | untouched — `git status --porcelain` empty on both |
| `git checkout --` usage | **none, on any file, at any point** |
