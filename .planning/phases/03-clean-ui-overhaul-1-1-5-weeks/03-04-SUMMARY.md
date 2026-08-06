---
phase: 03-clean-ui-overhaul-1-1-5-weeks
plan: 04
subsystem: tokens
tags: [design-tokens, dark-mode, contrast, wcag, export-firewall, contract-test, red-probe, delete-dont-alias]
status: complete

requires:
  - phase: 03-clean-ui-overhaul-1-1-5-weeks
    plan: 02
    provides: "`Design.md` as the normative contract; the `--motion-*` TS mirror and its lockstep gate"
  - phase: 03-clean-ui-overhaul-1-1-5-weeks
    plan: 03
    provides: "`uiContract.test.ts` with the ported parser and the globbed stylesheet seam; `editor.css` and the shell that consumes the palette"
provides:
  - "`src/styles/theme.css` — the Themely cool palette verbatim in `:root`, Lights Out in `.dark`, the mode-invariant export firewall, ten `--text-*` role bundles, five radii, flat hairline elevation, seven `--motion-*` tokens, and the same-origin Inter `@font-face`"
  - "`--accent-fill` / `--accent-fill-hover` — mode-invariant, so the Export label is 4.70:1 in both modes"
  - "`--hairline` / `--hairline-color` — the two forms of the D-06 hairline that replaced `--border-default`"
  - "`--destructive` — light `#b42318`, dark `var(--themely-red)`; the destructive surface's own token, for the same reason the Export fill has one"
  - "`src/styles/themeTokens.test.ts` — exact palette values, the fixed-trio identity, the type-role bundles, and the token NAMESPACE ALLOWLIST"
  - "`src/styles/uiContract.test.ts` — assertions 1-6, 8, 9, 17, 19, 26, plus six rules carried forward from the retired Phase 2 contract test"
  - "the retirement of `src/styles/phase2CssContract.test.ts`, with a per-assertion carry-forward mapping"
  - "`coding-rules/frontend.md` § The Phase 3 Token System; `coding-rules/general.md` Live Invariant 9 extended to `.dark`"
affects: [03-05, 03-06, 03-07, 03-08, 03-09, 03-10, 03-11, 03-12]

actuals:
  tokens: 57000
  tasks: 4
  commits: 5

tech-stack:
  added:
    - "`color-mix(in srgb, …)` — the hairline derives from `--themely-stone-gray` at 60 %, so `prefers-contrast: more` re-tones both hairline forms by moving one palette token"
    - "a same-origin `@font-face` for the vendored Inter variable woff2, with `unicode-range` declared to match the latin-only subset"
  patterns:
    - "a surface that owes WCAG AA gets its own token rather than an edited palette value — the owner's `--accent-fill` move, applied twice more"
    - "a contract matrix asserts its row count from a LITERAL, never from the tables it iterates"
    - "a token excluded from a contrast matrix must be excluded by a GATE, not by a paragraph"
    - "a token namespace allowlist, so a retired un-namespaced name cannot reappear beside its replacement"
    - "name-boundary matching in a retired-token scan, so `--accent-fill` is not reported as `--accent`"

key-files:
  created: []
  modified:
    - src/styles/theme.css
    - src/styles/themeTokens.test.ts
    - src/styles/uiContract.test.ts
    - src/styles/App.css
    - src/styles/Controls.css
    - src/styles/MapCanvas.css
    - src/styles/editor.css
    - src/utils/motion.ts
    - src/utils/motion.test.ts
    - src/hooks/useCameraController.ts
    - src/lib/motion/tokens.test.ts
    - src/constants/colors.ts
    - src/components/ColorPicker.tsx
    - src/components/LegendEditor.tsx
    - src/providers/CompositionStateProvider.tsx
    - tests/e2e/responsive.spec.ts
    - Design.md
    - CLAUDE.md
    - .planning/coding-rules/frontend.md
    - .planning/coding-rules/general.md
    - .planning/phases/03-clean-ui-overhaul-1-1-5-weeks/deferred-items.md
  deleted:
    - src/styles/phase2CssContract.test.ts

key-decisions:
  - "The verbatim Themely palette does NOT meet AA for two of the roles Design.md assigned it. Measured, not assumed. Neither value was adjusted (D-04) and no contrast exception was enumerated; instead the two roles were re-assigned, following the owner's own `--accent-fill` precedent"
  - "`--themely-ghost-gray` carries no text in this app — 3.88:1 on Porcelain and 3.60:1 on Powder in dark. Tertiary meta moved to `--themely-slate-blue`, and the restriction is a GATE, not a note"
  - "`--destructive` is `#b42318` in light and `var(--themely-red)` in dark, because `#ff5252` is 3.05:1 on Porcelain and 3.19:1 under white text"
  - "The contrast matrix's row count is the literal 108. The derived form (`cases.length * pairs.length`) was MEASURED unable to fail its own probe — it stayed green at zero rows"
  - "`--border-default` was retired rather than re-toned, and replaced by `--hairline` (a box-shadow) and `--hairline-color` (the same relationship as a colour, for boundaries that occupy layout)"
  - "CF-1 was closed by giving all three tokens real rendering consumers AND restoring the strict rule — the TS mirror no longer counts as a consumer"
  - "`--motion-ease-in` got its consumer as the tool panel's CLOSING curve rather than being deleted, because the panel close is an exit and D-20 already assigns the token that role"

requirements-completed: [D-03, D-04, D-05, D-06, D-07, D-08, D-09, D-10, A-01, A-02, A-03, A-04, A-05, A-06, A-08, A-09, A-17, A-19, A-26]
---

# Phase 3 Plan 04: The Token System Summary

The 349-line Phase 2 token file is replaced by the Themely cool palette declared verbatim in
`:root` and "Lights Out" in `.dark`, flipped by a class with **zero** operating-system colour
queries anywhere in the codebase. Every retired token is deleted rather than aliased, which is what
made all 64 stale `--glass-*` references and every `--accent` consumer fail loudly instead of
looking migrated. Twelve contract assertions land, each proven able to fail, and the Phase 2
contract test is deleted with a per-assertion accounting.

**The most important thing in this plan is not the palette. It is that the verbatim palette does
not meet WCAG AA for two of the roles the design contract assigned it, that this was measured
rather than assumed, and that it was resolved without adjusting a Themely value and without
enumerating a single contrast exception.**

---

## The two measurements that changed a design decision

`03-UI-SPEC.md` and `Design.md` both state: *"Every text-on-surface pair meets WCAG AA in both
modes"* and *"There is no contrast exception in this contract."* Computed against the verbatim
palette, that is **false** for two roles:

| Pair | Ratio | Where the design contract put it |
|---|---|---|
| `--themely-ghost-gray` `#71767b` on dark Porcelain `#16181c` | **3.88:1** | § 7.6 saved-map meta, § 7.5 counter and placeholder |
| `--themely-ghost-gray` `#71767b` on dark Powder `#1d1f23` | **3.60:1** | the same rows, on hover |
| `--themely-ghost-gray` `#64748d` on light Powder `#e5edf5` | **4.01:1** | as above |
| `--themely-red` `#ff5252` on light Porcelain `#f8fafd` | **3.05:1** | § 7.6 `Delete Saved Map` text |
| `#ffffff` on a `--themely-red` `#ff5252` fill | **3.19:1** | § 7.6 `Delete Map: <name>` confirm |

All five are below AA's 4.5:1, and `--text-caption` is 12px, so the large-text exemption does not
apply. Three approved statements were in conflict: **D-04** (no Themely value may be adjusted),
**assertion 19** (no exception may be enumerated), and the accessibility requirements.

**Resolved by applying the precedent the owner had already set for this exact class of problem.**
`Design.md` § 6 records that when white-on-accent measured 3.02:1 in dark, the owner did *not*
re-tone `--themely-apple-blue` and did *not* accept an exception — they introduced a separate,
mode-invariant `--accent-fill`. The same move, twice more:

1. **`--destructive`** is the destructive surface's own token: `#b42318` in light (6.29:1 on
   Porcelain, 6.57:1 under white) and `var(--themely-red)` in dark, where `#ff6b6b` clears AA
   everywhere (6.40:1 on Porcelain). `--themely-red` keeps its verbatim value in both modes.
   `--destructive` already existed in the Phase 2 file and is not in the retired list, so this is a
   re-tone of a surviving token rather than an invention.
2. **`--themely-ghost-gray` carries no text at all.** Tertiary meta moves to `--themely-slate-blue`
   (worst case 5.15:1). The ghost value stays declared, unadjusted, for D-04 palette parity — the
   same "declared for parity, reason recorded" treatment D-09 already gives `--text-display` and
   `--text-stat`.

**The second one is only honest because it is a gate.** Leaving a token out of a contrast matrix
and explaining the omission in a comment is an exception wearing a different hat. So
`uiContract.test.ts` asserts that **no rule sets `color` from `--themely-ghost-gray`** — the
restriction fails on the bug it covers rather than describing it. `Design.md` § 2, § 7.5, and § 7.6
were updated in the same commit so the contract no longer says something that is not true.

---

## RED probes (14 executed, with output)

Immutable Safety Constraint 10: *a gate must be able to fail on the bug it covers.* Every probe used
the scratchpad copy-and-restore protocol from `coding-rules/general.md` § Git safety.
**`git checkout --` was not run at any point in this plan, on any file.** Every restore is confirmed
by a SHA-256 match against the pre-probe value.

The plan called for thirteen. Fourteen were run: one extra for the `backdrop-filter` ban, and
probe 9 was run **twice** because its first run exposed a defect in the assertion itself.

### Probe 1 — the retired teal comes back (`themeTokens.test.ts`, namespace allowlist)

**Break:** re-added `--accent: #0f766e;` to `theme.css`'s `:root`.

```
AssertionError: "--accent" is outside the token namespace allowlist. Colour tokens use
the --themely-* names verbatim; the export set keeps --map-* / --tooltip-*. An
un-namespaced name here is a retired token coming back.: expected false to be true

 Test Files  1 failed (1)
      Tests  1 failed | 11 passed (12)
```

**Restore:** `cp "$SP/probe-theme.css.pre" src/styles/theme.css`. SHA-256 before and after:
`8e94c1b035a004164e33941765885d0f57697c14a7a1b0d8705111f557074614`, byte-identical. Re-run: 12
passed.

**Note on why this probe needed a new assertion.** As specified, `themeTokens.test.ts` asserted only
exact values, and an *extra* token would not have failed any of them. The namespace allowlist is
what makes the probe the plan asks for possible at all — without it the plan's own RED probe would
have come back green.

### Probe 2 — assertion 1, an OS colour preference returns

**Break:** appended `@media (prefers-color-scheme: dark) { :root { --themely-platinum: #000000; } }`
to `theme.css`.

```
× carries no operating-system colour preference in any stylesheet
AssertionError: theme.css: the dark palette flips from a class on the editor mount root.
An OS colour preference here is a second writer of the theme that no control can override.
      Tests  1 failed | 26 passed (27)
```

**Restore:** copied back. SHA-256 `8e94c1b0…4614`, byte-identical.

### Probe 3 — assertion 2, a retired token name in a stylesheet

**Break:** appended `.color-picker__preset-swatch { outline-color: var(--accent); }` to
`Controls.css` — deliberately in a *different* file from the one the allowlist guards, so the two
gates are proven independent.

```
× references no retired token name in any stylesheet
AssertionError: Controls.css: "--accent" was retired by the Phase 3 token system and
deleted rather than aliased, so this reference resolves to nothing. Migrate it to its
replacement.
      Tests  1 failed | 26 passed (27)
```

**Restore:** copied back. SHA-256 `6eaa4fe7139b0f760f95d6000c93bd246cccf6f589e789a93c67108367843c57`.

### Probe 4 — assertion 3, a token dropped from `.dark`

**Break:** deleted `--themely-powder: #1d1f23;` from the `.dark` block.

```
× declares the same token set in both modes
AssertionError: the light and dark palettes must declare the same names:
expected [ '--themely-apple-blue', …(12) ] to strictly equal [ '--themely-apple-blue', …(13) ]
      Tests  1 failed | 26 passed (27)
```

**Restore:** copied back. SHA-256 `8e94c1b0…4614`.

### Probe 5 — assertion 4, an export token redefined in `.dark`

**Break:** added `--map-surface: #16181c;` to the `.dark` block — Live Invariant 9's exact defect,
in the location the class-based flip newly created.

```
× declares no export token outside the unconditioned root
× declares every export token exactly once, and gives each one a consumer
AssertionError: theme.css: "--map-surface" is mode-invariant and must stay fixed; found
under [] .dark. Redefining it makes the exported PNG follow the viewer theme.
AssertionError: "--map-surface" is declared more than once: expected [ …(2) ] to have a
length of 1 but got 2
      Tests  2 failed | 25 passed (27)
```

**Restore:** copied back. SHA-256 `8e94c1b0…4614`.

### Probe 6 — assertion 5, an export token loses its consumer

**Break:** replaced all three `var(--swatch-border)` reads in `Controls.css` with
`var(--hairline-color)`.

```
× declares every export token exactly once, and gives each one a consumer
AssertionError: "--swatch-border" is declared and gated as a fixed export token but
nothing reads it, so the guard describes a treatment the map does not have.
      Tests  1 failed | 26 passed (27)
```

**Restore:** copied back. SHA-256 `6eaa4fe7…3c57`.

### Probe 7 — assertion 6, a motion token loses its consumer

**Break:** changed `editor.css`'s panel-close rule from `var(--motion-ease-in)` to
`var(--motion-ease-out)` — i.e. removed the consumer CF-1 exists to require.

```
× gives every motion token a consumer that actually renders
AssertionError: "--motion-ease-in" is declared and reduced-motion-gated but nothing
renders with it and no runtime read resolves it.
      Tests  1 failed | 26 passed (27)
```

**Restore:** copied back. SHA-256 `4bf780f855d715dcf8eadf4d157f0ba9076cecd49adc869332cce8ea50135037`.

### Probe 8 — assertion 26, the accent fill pointed at the flipping token

**Break:** `--accent-fill: var(--themely-apple-blue);`.

```
× resolves the Export fill to the light Apple Blue in both modes
× declares the accent fill pair once, in the light root, off the flipping token
AssertionError: the Export fill resolves to a value below AA in dark mode:
expected '#2997ff' to be '#0071e3'
AssertionError: expected 'var(--themely-apple-blue)' not to contain 'var('
      Tests  2 failed | 25 passed (27)
```

**Restore:** copied back. SHA-256 `8e94c1b0…4614`.

### Probe 9 — assertion 19, the matrix resolves to nothing

**This probe found a real defect in the assertion and is the most important one in the plan.**

**Break:** emptied `PREFERENCE_CASES`, so the matrix iterates nothing.

**First run, with the row count written as `PREFERENCE_CASES.length * TEXT_ON_SURFACE_PAIRS.length`:**

```
× meets AA for every text-on-surface pair in every mode and preference
AssertionError: expected [] to have a length of 6 but got +0
      Tests  1 failed | 33 passed (34)
```

It failed — but **on a secondary table-length check, not on the row count.** `expect(rows).toBe(…)`
compared `0` against an expectation *derived from the emptied table*, so it was `0 === 0` and
**green**. The derived form is precisely the vacuous pass the assertion exists to prevent: a matrix
whose expectation moves with whatever it happens to iterate cannot fail on resolving to nothing.

Fixed by writing the count as the literal `108`, with the reasoning recorded beside it. **Re-run of
the identical break:**

```
× meets AA for every text-on-surface pair in every mode and preference
AssertionError: expected +0 to be 108
      Tests  1 failed | 33 passed (34)
```

**Restore:** copied back. SHA-256
`53393444de4b9847220762e5c810ad5b90302afa4aca804f592800cca3f4820e`.

This is the **sixth** assertion this repository has caught that could not fail on its own subject,
and the second caught *before* landing rather than after.

### Probe 10 — assertion 19's second probe, the accent fill flipped

**Break:** `--accent-fill: var(--themely-apple-blue);` again, this time checking the matrix half.

```
× meets AA for every text-on-surface pair in every mode and preference
AssertionError: dark: --themely-on-accent (#ffffff) on --accent-fill (#2997ff) is 3.02:1.:
expected 3.015107051688692 to be greater than or equal to 4.5
      Tests  3 failed | 31 passed (34)
```

The 3.02:1 in the spec is now a number this suite computes rather than one it quotes. **Restore:**
copied back, SHA-256 `8e94c1b0…4614`.

### Probe 11 — assertion 8, a colour literal in another component

**Break:** added `const PROBE_TINT = '#0f766e';` to `src/components/MapNavigation.tsx`.

```
× keeps every colour literal out of component source, bar the closed exemption
AssertionError: a component hard-codes a colour. Chrome colours come from tokens; the only
file allowed a literal is the one whose literals are exported into the PNG.:
expected [ Array(2) ] to strictly equal [ 'components/LegendOverlay.tsx' ]
      Tests  1 failed | 33 passed (34)
```

**Restore:** copied back. SHA-256
`e647bacde40eb4d7efe009fad5cd0ad9b0bd992f9a4b74852660ebbe7485d77b`.

### Probe 12 — assertion 9, a third type-role exemption

**Break:** added `'--text-eyebrow'` to `TYPE_ROLE_CONSUMER_EXEMPTIONS`.

```
× declares no type role without a consumer, bar the closed exemption
AssertionError: a declared token needs a consumer, or its contract assertion is theatre.
The exemption is a closed set of exactly two roles - adding a third is a change to the
design contract, not a test fix.:
expected [ '--text-display', '--text-stat' ] to strictly equal [ '--text-display', …(2) ]
      Tests  1 failed | 33 passed (34)
```

**Restore:** copied back. SHA-256 `53393444…820e`.

### Probe 13 — assertion 17, a hairline `box-shadow` on `.map-canvas`

**Break:** added `box-shadow: var(--hairline);` to `.map-canvas` — the exact copy-paste D-06 makes
likely, since hairlines are now pervasive across chrome.

```
× authors no export-unsafe effect on exported content
AssertionError: MapCanvas.css: ".map-canvas" sets box-shadow: var(--hairline) on exported
content.: expected 'var(--hairline)' to be 'none'
      Tests  1 failed | 40 passed (41)
```

**Restore:** copied back. SHA-256
`e896b582ea7d6ae487d2d7556a92f4530e3a5dd8d344b4a1ed14bf016a8bd68a`.

### Probe 14 — assertion 17's other half, `backdrop-filter` returns

Not required by the plan; run because the outright ban is a *new* rule rather than a ported one.
**Break:** added `backdrop-filter: blur(14px);` to `.map-navigation__cluster`.

```
× declares backdrop-filter nowhere, in no rule and no at-rule
AssertionError: MapCanvas.css: ".map-navigation__cluster" declares backdrop-filter. D-06
bans it outright - flat surfaces with hairlines, no glass.
      Tests  1 failed | 40 passed (41)
```

**Restore:** copied back. SHA-256 `e896b582…d68a`. Re-run: 41 passed.

---

## `phase2CssContract.test.ts` carry-forward mapping

The retired file carried **29** assertions. Every one is accounted for below — carried forward to a
named successor, or retired against a named decision. None was dropped silently.

| # | Phase 2 assertion | Disposition |
|---|---|---|
| 1 | parses every stylesheet under the assumptions it actually makes | **Carried** → `uiContract.test.ts` *"parses every discovered stylesheet…"*, and **strengthened**: the successor globs `src/styles/**` instead of naming four files |
| 2 | declares the exact spacing, type, radius, and motion scale | **Carried, split three ways** → `themeTokens.test.ts` *"declares the exact spacing, radius, focus, and elevation scale"* + *"declares the ten type roles with all four parts"*; the motion half is `lib/motion/tokens.test.ts`'s lockstep gate |
| 3 | declares the exact light color contract | **Carried** → `themeTokens.test.ts` *"declares the Themely cool palette verbatim in the light root"* (14 tokens) |
| 4 | declares the exact dark chrome contract | **Carried** → `themeTokens.test.ts` *"declares the Lights Out palette verbatim under the dark class"* (11 tokens) |
| 5 | never redefines an export token outside the unconditioned root | **Carried and EXTENDED** → assertion 4, which now covers `.dark` and an 18-token family rather than 8 |
| 6 | gives every `--map-*` token a consumer | **Carried and extended** → assertion 5, over the whole mode-invariant set |
| 7 | declares every export token exactly once | **Carried** → assertion 5 (same test) |
| 8 | keeps the opaque fallback as the root value | **Retired** — D-06 deletes the `--glass-*` family outright; there is no fallback because there is no glass |
| 9 | applies translucency only under a backdrop-filter supports query | **Retired, superseded by a STRONGER rule** → assertion 17 bans `backdrop-filter` outright, including in at-rule conditions |
| 10 | restores opaque surfaces under every accessibility preference | **Retired with the glass family.** The surviving translucency is `--overlay`, and `prefers-reduced-transparency` still restores it — covered structurally by assertion 19's both-modes backstop |
| 11 | keeps body copy legible on every chrome surface in both schemes | **Carried and expanded** → assertion 19: 54 rated pairs became **108**, across 6 mode×preference combinations, with the row count as a literal |
| 12 | restates the contrast preference for dark rather than inheriting light literals | **Carried, restated in class terms** → assertion 19's *"answers every preference colour override for both modes in the same at-rule"* |
| 13 | strengthens boundaries and focus under contrast and forced colors | **Carried verbatim** → § Carried-forward layout rules |
| 14 | zeroes every motion duration under reduced motion | **Carried** → assertion 6, now over 4 duration tokens |
| 15 | gives every motion token a consumer | **Carried and STRENGTHENED** → assertion 6: the TS mirror no longer counts as a consumer (this is CF-1) |
| 16 | uses the exact desktop measure and grid | **Retired** — the 1440px measure and the 376px inspector are dissolved by D-11/D-19. `03-03`'s assertion 10 owns the successor shell, measured in `shell.spec.ts` |
| 17 | branches CSS sub-layouts only at the declared breakpoints | **Retired → `03-09`**, which owns the D-20 narrow-width contract and the breakpoint set it declares |
| 18 | spans the action strip, map, and legend across the compact grid | **Retired** — the compact grid is dissolved by `03-05` / `03-09` |
| 19 | gives the desktop inspector one shell and no card-in-card sections | **Retired** — the inspector container is dissolved by `03-05`. It was keyed on `--shadow-inspector`, which D-06 deletes |
| 20 | never makes `.app` a scroll container | **Carried and GENERALISED** → *"keeps horizontal containment on the viewport element alone"*: an ownership set on `body`, plus the same claim re-asserted on `.map-editor`. `.app` disappears in `03-05`, and a rule that names a disappearing selector disappears with it |
| 21 | authors application spacing only from the token scale | **Carried verbatim** |
| 22 | keeps every standard control at the 48px minimum target height | **Carried verbatim** |
| 23 | authors no export-unsafe effect on exported content | **Already carried by `03-03`** → assertion 17's first half, with the post-D-34 reason |
| 24 | covers every path class MapCanvas can render | **Already carried by `03-03`** → `EXPORT_CONTENT_PATTERN` bound back to `MapCanvas.tsx` source |
| 25 | scopes `touch-action: none` to the interactive square alone | **Carried verbatim** → § Carried-forward layout rules. `03-08` owns assertion 18's browser half; this keeps the static claim alive in the meantime |
| 26 | keeps the composition square exactly square and opaque | **Already carried by `03-03`** → *"moves the squareness to the frame and keeps the region opaque"* |
| 27 | authors no gradient anywhere | **Carried verbatim** |
| 28 | never styles an interactive control by its position | **Already carried by `03-03`** → assertion 16 |
| 29 | applies backdrop-filter only inside the supports query | **Retired, superseded** → assertion 17's outright ban (see row 9) |

**Totals: 20 carried (6 of them strengthened or extended), 3 already carried by `03-03`, 6 retired
against a named decision.** Of the six retirements, four are layout rules whose subject is dissolved
by `03-05` / `03-09` and two are the glass family D-06 deletes.

The file was **deleted, not skipped**. A skipped contract test is a gate that cannot fail wearing a
different hat.

---

## Assertion count: old / new / delta

| File | Before | After | Delta |
|---|---|---|---|
| `phase2CssContract.test.ts` | 29 | **0 (deleted)** | −29 |
| `uiContract.test.ts` | 14 | **41** | +27 |
| `themeTokens.test.ts` | 2 | **12** | +10 |
| **CSS contract total** | **45** | **53** | **+8** |

`src/lib/motion/tokens.test.ts` stays at 8 tests; its count did not move but two of them were
rewritten (§ Deviations) and one was strengthened.

**Line-by-line accounting of the −29.** 20 of the old file's assertions have a named successor in
the table above; 3 were already carried by `03-03` before this plan started; 6 were retired against
a decision. The +27 in `uiContract.test.ts` is 12 new contract assertions (1-6, 8, 9, 17, 19, 26,
plus the ghost-gray text gate), 6 carried-forward rules, and 9 supporting assertions split out of
larger ones — for example the export firewall is two tests (placement and uniqueness+consumer)
rather than one, so each can name its own failure.

**The contract did not shrink.** It grew by 8 assertions while the file count went from two to one,
and every retirement names the decision that made its subject disappear.

Full unit suite after this plan: **40 files, 567 tests, all green.** The pre-plan total was not
re-measured inside this plan and is deliberately not quoted; the per-file contract counts above are
measured directly and are the number the plan asked for.

---

## What shipped

### Task 1 — the palette (commit `a9e5d96`)

`theme.css` rewritten top to bottom, 396 → 599 lines.

- **14 `--themely-*` tokens verbatim in `:root`, 11 flipping in `.dark`,** the fixed trio
  (`--themely-on-accent`, `-media-backdrop`, `-on-media`) restated identically rather than left to
  inherit, so the parity gate can read their presence as the claim. `.dark` carries
  `color-scheme: dark`.
- **Zero operating-system colour queries in the entire codebase**, including comments. The plan
  warned that naming the forbidden pattern in a comment would make the gate self-invalidating; the
  rule is described in `Design.md` instead.
- **The mode-invariant set — 16 export tokens plus the two accent-fill tokens — declared exactly
  once, in the unconditioned `:root`**, in no `.dark` block, media query, or supports block.
  `--map-border-focus` re-tones from the retired teal to Apple Blue's light value `#0071e3`;
  `--map-fixed-text` stays `#111827`, unchanged, because re-toning it would change exported pixels
  for every existing saved composition.
- **Ten `--text-*` role bundles** (size + line-height + weight + tracking each) with eight
  `.text-<role>` classes — deliberately not ten, so the closed consumer exemption can fail.
- **Five radii** including the new `--radius-row: 10px`; **flat hairline elevation**
  (`--hairline`, `--hairline-color`, `--popover-shadow`, `--dialog-shadow`, with `.dark` swapping
  the popover tier); **seven `--motion-*` tokens**.
- **The same-origin Inter `@font-face`**, `unicode-range` declared to match the latin-only subset so
  a latin-ext character falls back cleanly instead of rendering as a notdef box. The build now emits
  `dist/assets/inter-latin-variable-*.woff2` at 48,430 B.
- **`themeTokens.test.ts` rewritten** (2 → 12 assertions) with the exact values *and* a **token
  namespace allowlist**, which is what makes the plan's own RED probe possible.

```
CLASS_FLIP_OK
EXPORT_FIREWALL_OK
LEGIT_QUERIES_OK      (reduced-motion, reduced-transparency, contrast, forced-colors all present)
```

### Task 2 — the consumers and assertions 1-6, 26 (commit `4f7ddc4`)

Every enumerated consumer migrated, using `03-RESEARCH.md`'s inventory as the worklist:

| Retired | Replacement |
|---|---|
| `--accent` / `-hover` / `-contrast` | `--themely-apple-blue` / `-hover` / `--themely-on-accent`, **except** the `Export PNG` fill → `--accent-fill` / `--accent-fill-hover` |
| `--surface-card` / `-hover` / `-pressed` / `-page` / `-accent-tint` | `--themely-porcelain` / `--themely-powder` |
| `--text-primary` / `-secondary` / `-muted` | `--themely-midnight-ink` / `--themely-slate-blue` |
| `--border-default` | `--hairline-color` |
| `--border-strong` | `--themely-slate-blue` |
| `--glass-*` (all six) | flat Porcelain surfaces with hairlines; **all three `@supports (backdrop-filter…)` blocks deleted** |
| `--shadow-inspector` | deleted with the shell's elevation (D-06 is flat) |
| `--shadow-navigation`, `--toast-shadow` | `--popover-shadow` |
| `--modal-shadow` | `--dialog-shadow` |
| `--font-*`, `--weight-*` | the `--text-*` role bundles |
| `--radius-large` | `--radius-card` (inspector shell) / `--radius-modal` (dialogs) |
| `--mixed-color-light` / `-dark` | `--themely-porcelain` / `--themely-slate-blue` |
| `--active-check-*` | `--themely-powder` + `--themely-midnight-ink` + `--hairline-color` |
| `--motion-fast`, `--motion-camera`, `--easing-camera`, `--easing-control` | `--motion-duration-fast`, `--motion-duration-base`, `--motion-ease-out`, `--motion-ease-snappy` |

```
NO_RETIRED_TOKENS
NO_BACKDROP_FILTER
```

### Task 3 — the contrast matrix and two closed sets (commit `482be76`)

**Assertion 19** resolves the palette through the real cascade for all six mode × preference
combinations. The resolver models `.dark` and `:root` as **equal specificity decided by source
order** — which is why a `:root` override authored inside `prefers-contrast` wins in dark mode
unless the same at-rule answers it, and why the structural backstop compares the two override sets
rather than trusting the author. 108 pairs, row count a literal, **no exception enumerated**.

**Assertion 8**: the colour-literal exemption is closed at exactly `LegendOverlay.tsx`, checked in
**both** directions — a stale exemption for a file that no longer carries a literal is a standing
licence for the next one. Three literals were removed from other components as part of this:
`CompositionStateProvider.tsx` and `LegendEditor.tsx` now import `DEFAULT_COLOR` instead of
restating `'#FFFFFF'` (a real de-duplication, not a relocation), and `ColorPicker.tsx`'s
`#RRGGBB or rgb(0, 0, 0)` placeholder moved to `constants/colors.ts` beside the other colour
constants.

**Assertion 9**: the type-role consumer exemption is closed at exactly `--text-display` and
`--text-stat`, matched on the exact four-token family so `--text-body-sm` cannot be mistaken for a
consumer of `--text-body`.

### Task 4 — assertion 17 and the retirement (commit `98e0fca`)

Assertion 17 bans `backdrop-filter` outright, scanning **at-rule conditions** as well as
declarations — an emptied `@supports (backdrop-filter: …)` wrapper is scaffolding waiting to be
refilled. The export-unsafe guard keeps `03-03`'s post-D-34 reason: the clone is an isolated SVG
document that sees none of the host page's stylesheets, so an externally-authored effect renders
**not at all**, not approximately. `EXPORT_CONTENT_PATTERN` is still bound back to `MapCanvas.tsx`
source.

```
OLD_CONTRACT_RETIRED
NO_STALE_REFS
LAST_UPDATED_OK 2
ROW_COUNT_ASSERTED
```

### Task 4b — the two motion e2e specs (commit `fae49f1`)

See § Legacy e2e.

---

## CF-1 — CLOSED, and how

`03-02` weakened the motion-consumer check to accept a named read in `src/lib/motion/tokens.ts`.
For `--motion-ease-snappy`, `--motion-ease-in`, and `--motion-duration-slow` the mirror was the
**only** reader — that is, the gate accepted *the file it was comparing against* as proof that the
token was used.

**Closed by doing all three of the options CF-1 offered, in the order that made each possible:**

| Token | Its new rendering consumer |
|---|---|
| `--motion-ease-snappy` | control micro-feedback — the `button` transition in `theme.css`, `.country-path`'s fill/stroke transition, the country-list row hover |
| `--motion-duration-slow` | the **theme crossfade** on `.map-editor`'s `background-color` and `color`. A theme toggle repaints the whole wall at once, and snapping between a white and a black wall is the one surface change in this editor where instant reads as a fault rather than as responsiveness |
| `--motion-ease-in` | the tool panel's **closing** curve. Entrance is the settle curve, exit is the exit curve — the same directional pairing D-20 already specifies for the narrow-width bottom sheet, so `03-09` joins this token rather than introducing a second one |

**Then the strict rule was restored**, in both places that check it: the consumer set is now a CSS
`var()` **in a rule that paints** or a named read in `src/utils/motion.ts`. `src/lib/motion/tokens.ts`
was **removed** from the consumer set. Probe 7 proves the restored rule fails.

**Why `--motion-ease-in` was given a consumer rather than deleted.** Deleting it would have meant
editing `Design.md`'s motion table, `tokens.ts`'s mirror, and `tokens.test.ts`'s row-count literal
and classification list — four coordinated edits to remove a token that D-20 already assigns a role
and that `03-09` will need in two plans. The panel close *is* an exit; using the exit curve for it
is the token's documented role, not an invented behaviour.

## CF-4 — CLOSED

`editor.css`'s two deliberate loud failures are resolved. `--themely-platinum` now resolves
(`#ffffff` light, `#000000` dark) and the editor wall paints. `--border-default` is **gone**, not
re-toned, and `editor.css`'s three rail/panel hairlines consume `--hairline-color`.

`resolveRootTokens` — the helper `03-03` deliberately did not port because it had no consumer — was
ported as `resolvePaletteTokens`, extended for the class-based flip, and is now read by both the
contrast matrix and assertion 26. `deferred-items.md` § D-2 is marked closed.

---

## Deviations from plan

### [Rule 1 — Bug] The plan's own retired-token scan reports `--accent-fill` as `--accent`

The plan's Task 2 verify command tests `t.includes('--accent')` against every stylesheet. That
substring matches `--accent-fill`, which is a token the same plan's artifact table says to **add**.
As written the gate is red on arrival, and the only ways to make it green are to delete
`--accent-fill` or to loosen the scan — and a loosened scan is exactly how the retired name comes
back.

The landed assertion 2 uses name-boundary matching (`(?<![\w-])--accent(?![\w-])`), which
distinguishes `--accent` from `--accent-fill` *and* from the class name
`.onboarding__action--accent`. **The boundary behaviour is itself asserted**, in a separate test, so
if it ever degrades to a substring test that fails before assertion 2 starts misreporting.

### [Rule 1 — Bug] The contrast matrix's row count could not fail its own probe

Covered in full under **Probe 9**. Deriving `EXPECTED_CONTRAST_ROWS` from the tables it counts made
the count agree with an empty matrix. Fixed to a literal, with the reasoning written beside it so a
later reader cannot "simplify" it back. **This is the single most important finding in the plan**,
and it is the sixth gate-that-cannot-fail this repository has caught.

### [Rule 2 — Correctness] The verbatim palette misses AA for two roles

Covered in full under **§ The two measurements that changed a design decision**. Neither Themely
value was adjusted and no exception was enumerated; two role assignments changed, both recorded in
`Design.md` and one of them converted into a gate.

### [Rule 3 — Blocking] `themeTokens.test.ts` as specified could not fail its own probe

The plan's Task 1 RED probe is *"re-add the retired teal `--accent: #0f766e` to `:root` and watch it
fail."* A file of exact-value assertions does not notice an **extra** token. The namespace allowlist
(which `must_haves` truth 1 requires anyway) is what makes that probe possible, so it was written
before the probe was run rather than after.

### [Rule 3 — Blocking] Deleting the absorbed motion names breaks two things the plan does not list

`--motion-fast`, `--motion-camera`, `--easing-camera`, and `--easing-control` are read outside the
stylesheets:

1. **`src/utils/motion.ts`** reads `--motion-camera` and `--easing-camera` at runtime through
   `getComputedStyle`. Both were re-pointed, and their exported constants **renamed after the tokens
   they read** (`MOTION_CAMERA_TOKEN` → `MOTION_DURATION_BASE_TOKEN`, `EASING_CAMERA_TOKEN` →
   `MOTION_EASE_OUT_TOKEN`). A constant whose name outlives its value is the `__square` defect in a
   different file.
2. **`src/lib/motion/tokens.test.ts`** asserted the absorptions as an *equality between two live
   declarations*, which stops being expressible once the predecessor is deleted. Rather than drop
   the claim with the name — the retirement commit is precisely where a retime could ride along
   unnoticed — the absorption is now asserted against the **absorbed values**: `--motion-duration-fast`
   must still be exactly `150ms`, `--motion-duration-base` `240ms`, `--motion-ease-out`
   `cubic-bezier(0.22, 1, 0.36, 1)`. The one deliberate retime is asserted as *not* the keyword
   `ease-out`.

### [Rule 2 — Correctness] `--destructive`, `--success`, `--warning`, `--overlay` gained dark values

None of the four is in the plan's retired list, and all four were light-only. Under `.dark` they
would have painted `#b42318` text on `#16181c` and a `#fffaeb` warning surface on a black wall.
Dark counterparts were added and every one is rated by the matrix. **D-05's collapse of the status
hues onto Themely Red and neutral ink is left to `03-10`**, which owns the toast severity surfaces —
retiring the tokens here would have restyled three surfaces this plan does not own.

`--overlay` now derives from `--themely-media-backdrop`, which also gives that token its first real
consumer.

### [Rule 2 — Correctness] The onboarding banner lost its accent tint and accent edge

The Phase 2 banner carried a `--surface-accent-tint` background, a 4px `--accent` left rule, **and**
a filled accent CTA. D-05 gives the surface exactly **one** Apple Blue element. Both the tint and
the rule are gone; the CTA survives as the one accent. Recorded in `Design.md` § 7.10.

### [Rule 2 — Correctness] Three colour literals removed from component `.tsx` files

`CompositionStateProvider.tsx` and `LegendEditor.tsx` restated `'#FFFFFF'` where
`constants/colors.ts` already exports `DEFAULT_COLOR`; both now import it, which removes a real
drift risk rather than relocating a string. `ColorPicker.tsx`'s syntax placeholder moved to
`constants/colors.ts` beside the other colour constants.

### [Rule 3 — Blocking] `files_modified` omits eleven files the change requires

The plan lists five stylesheets and three test files. Also modified: `src/utils/motion.ts` and its
test, `src/hooks/useCameraController.ts`, `src/lib/motion/tokens.test.ts`, `src/constants/colors.ts`,
three component/provider files, `tests/e2e/responsive.spec.ts`, and four documentation files. Each
is listed in `key-files` with its reason above.

### [Scope — recorded, not fixed] `--radius-row` and `--radius-pill` have no consumer yet

Both are declared for D-07 completeness and are first consumed by `03-06`'s rail rows and status
pills. No gate covers radii, so this is recorded rather than gated — noted here so `03-06` does not
re-derive the values.

---

## Legacy e2e — the honest number

```
$ npx playwright test --project=chrome
  65 passed, 14 failed   (before the motion rename fix)
  67 passed, 12 failed   (after)
```

**Two tests were made red by this plan and were repaired inside it.**
`reduced-motion preference removes every authored transition` and `the map reads the SPEC motion
tokens when motion is not reduced` read `--motion-camera` and `--easing-camera` **by name**. Those
names were absorbed byte-identically and then deleted, so only the names moved in the spec — every
value asserted is the same bytes. Leaving them red would have grown `03-09`'s worklist by two for a
rename anyone can follow.

**The remaining 12 are exactly the 12 `03-03` recorded**, re-measured rather than assumed, and they
remain `03-09`'s to close. Two rows in `deferred-items.md` § D-1 that named `03-04` as a co-owner
now name `03-09` alone: this plan deleted the tokens they key on, which is what makes them
unfixable in place rather than merely unfixed.

**The hazard `03-03` stated still stands:** a suite that is red for several plans stops being read,
and `03-12`'s full-gate evidence is not honest until it is clear.

---

## Verification

```
$ npm run lint      -> clean
$ npm test          -> Test Files 40 passed (40) · Tests 567 passed (567)
$ npm run build     -> tsc -b clean; built in 75ms
                       dist/assets/inter-latin-variable-*.woff2  48.43 kB

$ npx vitest run src/styles/uiContract.test.ts       -> 41 passed
$ npx vitest run src/styles/themeTokens.test.ts      -> 12 passed
$ npx vitest run src/lib/motion/tokens.test.ts       -> 8 passed
$ npx playwright test --project=chrome               -> 67 passed, 12 failed (all responsive.spec.ts)
```

Plan gates:

```
CLASS_FLIP_OK           (no OS colour-scheme query in theme.css, comments stripped)
EXPORT_FIREWALL_OK      (no mode-invariant token in any .dark block)
LEGIT_QUERIES_OK        (reduced-motion, reduced-transparency, contrast, forced-colors all present)
NO_RETIRED_TOKENS       (name-boundary scan over every globbed stylesheet, comments stripped)
NO_BACKDROP_FILTER
ROW_COUNT_ASSERTED
OLD_CONTRACT_RETIRED
NO_STALE_REFS           (grep -rn "phase2CssContract" src/ tests/ -> nothing)
LAST_UPDATED_OK 2       (frontend.md, general.md, Design.md, CLAUDE.md each at exactly 2)
```

**Chrome only. Chrome 151 is the only browser with evidence.** Edge is **not installed on this
machine** (D-33) and no Edge result is reported. Firefox, Safari, and previous-version certification
have never been run here and are not claimed.

---

## What is NOT done

- **No visual, touch, or screen-reader claim is made anywhere in this plan.** The plan's
  verification asks for a hand check via `npm run dev` with a hard reload and the `.dark` class
  toggled in devtools. That is a **physical claim**, and an automated result may never be
  substituted for one (Immutable Safety Constraint 8). Every ratio here is computed, every token
  value is read from the file, and every gate is a `node` assertion.
  **PENDING: a human look at both modes.** In particular nobody has seen the Lights Out palette
  rendered, the Inter face resolving, or the theme crossfade.
- **The theme toggle does not exist yet.** This plan lands the tokens; `03-06` builds the control
  that writes the `.dark` class, and D-30 requires it to persist through the storage-adapter
  interface with **light** as the absent-key default. Until then the class can only be set by hand
  in devtools.
- **`Design.md` § 7 is still `[FOR REVIEW]`.** The owner has reviewed none of it, including the
  edits this plan made to § 7.5, § 7.6, and § 7.10. The § 2 and § 6 edits recording the two
  measurements are equally unreviewed.
- **The owner authorization in force is a blanket, in-advance, sight-unseen PROCEED-authorization.**
  It is **not** a content review and **not** hash-bound. Nothing here was reviewed by the owner, and
  no diff was inspected by them.
- **`responsive.spec.ts` is red** — 12 tests, itemised with owners in `deferred-items.md` § D-1.
- **Historical geometry is unchanged.** The approved catalog still holds exactly `Modern`; the
  1492 / 1700 / 1815 / 1914 packets remain **deferred for missing rights-cleared source material**.
  Nothing here makes a deferred snapshot nameable or reachable.
- **`.planning/STATE.md` and `.planning/ROADMAP.md` are UNTOUCHED.** Neither `state.advance-plan`,
  `state.update-progress`, nor `roadmap.update-plan-progress` was run.

---

## Known Stubs

| Stub | File | Why it is intentional | Resolved by |
|---|---|---|---|
| `--radius-row` and `--radius-pill` are declared with no consumer | `src/styles/theme.css` | D-07 vendors the full radius scale; the rail row and the status pills are built by `03-06`. No gate covers radii, so this is recorded rather than gated | `03-06` |
| `--themely-ghost-gray`, `--themely-on-media` have no consumer | `src/styles/theme.css` | Declared for D-04 palette parity. Ghost gray additionally **may not** carry text (measured), and that restriction is gated | — (parity, permanent) |
| The dark palette can only be reached by setting `.dark` by hand | — | The toggle is `03-06`'s deliverable; this plan is the token layer | `03-06` |

No file created or modified by this plan renders a hardcoded empty value, a placeholder string, or
an unwired data source.

---

## Threat Flags

None new. The five threats the plan's register names were all exercised:

| Threat ID | Disposition | Evidence |
|---|---|---|
| T-03-11 (an export token redefined in `.dark`) | mitigated | Assertion 4 over the full 18-token family, RED-proven by Probe 5 |
| T-03-12 (white-on-accent at 3.02:1 in dark) | mitigated | Assertion 26 **and** the matrix's dark row, RED-proven twice (Probes 8 and 10) — the 3.02 is now computed, not quoted |
| T-03-13 (a contrast matrix that resolves to nothing) | mitigated, and it **caught a live instance** | Probe 9. The derived row count was green at zero rows |
| T-03-14 (a retired token silently aliased) | mitigated | Assertion 2, name-boundary matched, RED-proven by Probe 3, with the boundary behaviour itself asserted |
| T-03-15 (an inherited CSS effect dropped from the PNG) | mitigated | Assertion 17, RED-proven by Probes 13 and 14; `EXPORT_CONTENT_PATTERN` still bound back to `MapCanvas.tsx` |

---

## Carry-forward for later plans

- **`03-05` / `03-06`:** the `Export PNG` fill must stay on `--accent-fill`, never on
  `--themely-apple-blue`. Two gates cover it. The theme toggle writes the `.dark` class on the
  editor mount root, persists through the **storage adapter**, and defaults to **light** when the
  key is absent — no OS read anywhere, gated by assertion 1.
- **`03-06`:** `--radius-row` (10px) and `--radius-pill` are waiting for the rail row and the
  status pills. Rail row text is `--themely-nav-ink` and is **constant** across
  inactive/hover/active; only the background carries state.
- **`03-09`:** `deferred-items.md` § D-1 is your worklist and it is now 12, re-measured. Two of
  those rows previously named `03-04` as a co-owner and no longer do. Assertion 24 needs re-arming
  against the **class**, because `emulateMedia({ colorScheme })` now changes nothing.
- **`03-10`:** D-05's collapse of `--success` / `--warning` onto Themely Red and neutral ink is
  yours; both tokens have dark values now so nothing is broken in the meantime. The glob seam and
  assertion 20 are unchanged. `--hairline` is consumed by two rows (`.saved-map-row`,
  `.legend-editor__entry`); the rest of the card surfaces still use `--hairline-color` borders.
- **`03-11`:** CF-2 (the latin-only Inter subset) is untouched and still yours. The `@font-face`
  now exists in `theme.css` with `unicode-range` declared, so the editor-side half is done; the
  base64 inlining for the export clone is not.
- **Anyone editing `theme.css`:** the namespace allowlist in `themeTokens.test.ts` is a **closed
  set**. A new token family needs a deliberate entry, which is the point.

---

## Commits

| Hash | Message |
|---|---|
| `a9e5d96` | `feat(3-04): land the Themely cool palette and the class-driven dark flip` |
| `4f7ddc4` | `refactor(3-04): migrate every retired-token consumer and gate the new system` |
| `482be76` | `test(3-04): land the contrast matrix and the two closed exemption sets` |
| `98e0fca` | `test(3-04): retire the Phase 2 CSS contract behind assertion 17` |
| `fae49f1` | `test(3-04): re-point the two motion preference specs at the absorbed tokens` |

---

## Self-Check: PASSED

| Claim | Check |
|---|---|
| `src/styles/theme.css` | FOUND, 599 lines, SHA `8e94c1b0…4614` matches every pre-probe value |
| `src/styles/themeTokens.test.ts` | FOUND, 12 tests green |
| `src/styles/uiContract.test.ts` | FOUND, 41 tests green, SHA `53393444…820e` matches the pre-probe value |
| `src/styles/phase2CssContract.test.ts` | **ABSENT** (`test ! -f` -> `OLD_CONTRACT_RETIRED`) |
| `src/styles/Controls.css` | FOUND, SHA `6eaa4fe7…3c57` matches the pre-probe value |
| `src/styles/MapCanvas.css` | FOUND, SHA `e896b582…d68a` matches the pre-probe value |
| `src/styles/editor.css` | FOUND, SHA `4bf780f8…5037` matches the pre-probe value |
| `src/components/MapNavigation.tsx` | FOUND, SHA `e647bacd…5d77b` matches the pre-probe value |
| `Design.md` §§ 2, 5, 6, 7.5, 7.6, 7.10 | FOUND, 2 `Last updated` entries |
| `.planning/coding-rules/frontend.md` § The Phase 3 Token System | FOUND, 2 `Last updated` entries |
| `.planning/coding-rules/general.md` Live Invariant 9 | FOUND, extended to `.dark`, 2 `Last updated` entries |
| `CLAUDE.md` non-obvious paths | FOUND, points at the two surviving contract tests, 2 `Last updated` entries |
| commits `a9e5d96` `4f7ddc4` `482be76` `98e0fca` `fae49f1` | all FOUND in `git log` |
| `.planning/STATE.md`, `.planning/ROADMAP.md` | untouched — `git status --porcelain` empty on both |
| `git checkout --` usage | **none, on any file, at any point** |
