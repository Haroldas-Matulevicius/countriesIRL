# v1.1 ROADMAP Archive — In-Flight

> **In-flight archive.** Verbatim closed-phase blocks moved out of the active
> [`ROADMAP.md`](../../ROADMAP.md) during the milestone, not at close. The active roadmap
> keeps only pending and in-progress phases in full detail; each closed phase keeps a
> one-line row in the Progress table pointing here.
>
> Each moved block is **verbatim** — the roadmap text as it stood when the phase closed,
> amendments and all. The `**Outcome**` paragraph that follows a block is the only generated
> content in this file, and it is written after the fact from the phase's `*-SUMMARY.md`
> files, its independent review, and its verification report.
>
> At v1.1 close this file becomes the natural `ROADMAP-AT-CLOSE.md` snapshot.
>
> Archive index: [`../../ARCHIVES.md`](../../ARCHIVES.md)

---

## Phase Details (closed phases)

## Phase 3: Clean UI Overhaul (1–1.5 weeks)

**Goal:** Replace the current editor chrome — the slate/teal token system (`--accent: #0f766e`,
`--text-primary: #111827`, `--border-strong: #1f2937`, the heavy `--shadow-inspector`/
`--shadow-navigation` panels, and the retired-in-name-only `--glass-*` family) and the
app-bar + right-inspector arrangement — with a **super-clean minimal studio**: a full-bleed,
scrollable/pannable map canvas with a Google-Maps-like feel, and **one left-side tool HUD**
holding every tool (coloring, palettes, legend, text, export, saved maps, period). Neutral
near-white chrome, one restrained accent, clean typography, no visual noise, no "techy"
density. The design system is **adopted wholesale from the sibling Themely repo** (D-01…D-03).

> **Amended 2026-08-06 (Amendment 3).** This phase was originally specced as "chrome, layout,
> and tokens only," with "nothing about map *content* rendering changes." **That is no longer
> true, deliberately.** Three expansions were authorized during `/gsd:discuss-phase 3` and a
> fourth after `/gsd:plan-phase 3` research. Two runtime dependencies enter the phase (`motion`
> v12 and vendored lucide-animated icons, D-27/D-28), and the legend adopts Themely typography
> (D-25) — and because the legend renders **inside the export-bearing composition**, that
> **changes exported PNG pixels**. Export fixtures must therefore be re-baselined as a
> deliberate, recorded act, never a silently updated fixture. Full detail:
> `phases/03-clean-ui-overhaul-1-1-5-weeks/03-CONTEXT.md` § Roadmap Amendments.

**Depends on:** Phase 2 engineering (complete). Does not wait for owner gates `02-25`/`02-28`
to be *closed*, but must not disturb their evidence: the acceptance matrix binds `fe5f946`,
so if `02-28` is still pending when Phase 3 lands, the owner performs the matrix against the
preserved tag/commit, not against the restyled HEAD. **`03-01` therefore opens by creating an
annotated git tag on `fe5f946` (D-31)** so the pre-restyle build stays trivially reachable;
the matrix itself is untouched and the gate stays OPEN.

**Transition-readiness constraint (binding for every Phase 3 plan):** the restyled editor is
built **embed-ready** for the planned Themely transition (~1–2 months out) without doing any
integration now. Concretely: the canvas + HUD assemble into one mountable editor component
behind an explicit props boundary — it never assumes it owns `document`/`window` chrome beyond
its mount point; persistence is consumed through a storage-adapter interface (the localStorage
implementation stays the only one shipped); the data asset base path is a parameter, not a
hard-coded literal scattered through fetch calls; new design tokens are namespaced so they can
coexist with a host app's stylesheet. No auth/entitlement awareness is added — that belongs to
the future host. Plans `03-02`/`03-04` carry the boundary; `/gsd:plan-phase 3` turns each point
into a RED-provable gate (e.g. a grep gate on hard-coded `/data/` literals outside the config
home). Embedding itself remains outside scope and needs new explicit authorization
(§ Beyond v1.1). **Already largely discharged:** `StorageAdapter` exists (`storage.ts:71-88`)
with exactly **one** production `localStorage` site (`storage.ts:142`), and hard-coded `/data/`
literals number **three** in production fetch paths (`useGeoData.ts:11-12`, `snapshots.ts:7`).
Two further literals in `historicalValidation.ts:1098,1190` are **safety predicates and must be
exempted, not parameterised** — parameterising them would quietly widen the approval chain.

**Plans (excruciating breakdown — final wording at `/gsd:plan-phase 3`):**

1. `03-01` **Design.md + design-token specification.** Create `Design.md` (CLAUDE.md already
   anticipates it): audit and name every current token being retired, define the replacement
   neutral system (surfaces, text scale, one accent, borders, radii, shadows ≈ none/hairline),
   define the HUD anatomy and spacing grid. *Gate:* `themeTokens.test.ts` updated to the new
   set and proven RED against the old palette (re-add `--accent: #0f766e` → test fails).
2. `03-02` **Layout contract.** *(**Amendment 2** — this plan originally specified a "left HUD
   **column** (collapsible sections, one scroll container)"; the HUD is now an **icon rail +
   single flyout panel**, D-16.)* Specify the target DOM: full-bleed canvas layer + a ~56px
   always-present icon rail that opens **one 280px tool panel at a time** (the VS Code / Figma
   idiom, not an accordion) + minimal floating map controls (zoom/reset, bottom-right,
   Google-Maps idiom) + toast region. The panel **reserves layout space** — the canvas reflows;
   it does not overlay the map (D-19). Per **D-32** the map is a full-bleed *surface* carrying a
   centred **1:1 export frame** so the creator sees exactly what lands in the PNG; the SVG
   `viewBox` stays `0 0 1080 1080` and the frame is `data-editor-only`. Breakpoint behavior:
   below the existing narrow breakpoint the rail becomes a **bottom bar** and a tapped tool
   raises a **bottom sheet** (D-20). *Gate:* a rewritten `phase2CssContract.test.ts` (successor
   `uiContract.test.ts`) asserting the new selectors/tokens, each assertion broken once and
   observed RED before landing.
   - *No `ResizeObserver` is required:* `useCameraController.ts:310-313` pins d3-zoom's `extent`
     to `[[0,0],[1080,1080]]` and `MapCanvas.tsx:839-840` fixes the `viewBox`, so a panel reflow
     cannot disturb the projection, the camera lease, or the export.
3. `03-03` **Token replacement in `theme.css`.** Land the new token values; delete retired
   tokens rather than aliasing them so stale references fail loudly at the contract test.
   *Gate:* contract test green; `npm run lint && npm test` clean; zero references to retired
   token names (`grep` gate wired into the contract test so it can fail).
4. `03-04` **Workspace restructure.** `MapWorkspace` re-slotted: canvas becomes full-bleed;
   the typed `legendSlot`/`navigationSlot` contract and export-membership semantics preserved
   verbatim; the inspector column retired as a *container* (its tools move, not die).
   *Gate:* `tests/e2e/responsive.spec.ts` updated + RED-proven; export e2e still green
   (placement still decides export membership).
5. `03-05` **Left HUD shell + coloring/palette tools migration.** HUD component with
   collapsible sections; move color presets, custom hex, bulk apply, undo/redo into it.
   `Controls` keeps its single-component `variant` rule — a HUD variant is added, never a
   copy. *Gate:* color-workflow e2e slice green; keyboard/focus order proven in e2e.
6. `03-06` **Legend, saved maps, period, export migration + app-bar declutter.** Remaining
   tools move into HUD sections; the app bar reduces to identity + save state + export (or
   dissolves entirely — plan-time decision). Status allowlist (`ToastRegion`) untouched.
   *Gate:* persistence + export e2e slices green; the `02-22` action-order semantics either
   preserved or explicitly superseded in the plan (recorded, not silent).
7. `03-07` **Map chrome polish.** Floating zoom/reset controls, hover states, cursor
   discipline (colorable = pointer, neutral units = default — carries the Kosovo fix
   forward), tooltip restyle. *Gate:* camera e2e slice green; a tooltip assertion that fails
   if the neutral-unit copy regresses to a color readout.
8. `03-08` **Responsive + reduced-preference pass.** 360px/200%-equivalent containment,
   `prefers-reduced-motion`/`-transparency` behavior re-verified in the new chrome.
   *Gate:* `responsive.spec.ts` green on **Chrome** (see the Edge note under `03-11`).
9. `03-09` **CSS mass + dead-style sweep.** Delete orphaned rules (the 1128-line
   `Controls.css` is split per-surface); comment density matched to the new files.
   *Gate:* contract test's selector inventory shrinks — asserted, so growth fails.
10. `03-10` **Export pipeline: own the SVG→PNG path.** *(**Amendment 4** — a plan the original
    breakdown did not contain at all.)* Remove `html2canvas` and render the frozen clone
    directly: serialise → embed required fonts inline as base64 `@font-face` in the SVG's
    `<defs><style>` → `Image` → `drawImage` onto a 1080×1080 canvas → `toBlob` (**D-34**). The
    font-embedding step is built **generalised** ("collect the fonts this composition uses"),
    used only for Inter here, so Phase 4's text tools need not re-open the chokepoint
    (**D-34a**). *Why:* the whole composition is a single SVG, and `html2canvas` only
    `XMLSerializer`s it and rasterises it as an `<img>` — an isolated document that sees no
    host `@font-face`. That is why `LegendOverlay.tsx:167` names Inter while the repo has **zero**
    `@font-face` rules: **the legend already exports in a system fallback today.**
    - **Blocking spike first (OQ-1):** prove an inline base64 `@font-face` actually renders
      inside SVG-as-image in installed Chrome, **before** legend typography is locked.
    - *Gate:* the 1080×1080 size contract, the clone contract, every existing refusal reason
      (disconnected / multi-SVG / sibling-legend), `sanitizeExportClone`'s strip list, and
      `data-editor-only` exclusion all preserved and RED-proven against the **new** path.
      UI-SPEC assertion 25 must measure **rendered pixels** — a legend-region diff against a
      font-suppressed control run, with a blank-crop discrimination control so three empty
      regions cannot satisfy the inequality. Asserting `font-family: Inter` appears in the
      clone's markup is **green today, before any work**, and is not acceptable evidence.
    - ⚠ `src/utils/export.ts` is the most safety-critical file in the repo. This is Phase 3's
      largest single risk and earns the `03-11` review on its own.
11. `03-11` **Independent non-author review of the aggregate diff + full gate.** Reviewer is
    not the executor of `03-01`…`03-10`. *Gate:* `npm run lint && npm test && npm run build` +
    full `npm run test:e2e`.
    - **Browser scope (D-33):** the gate runs **Chrome only**, and its evidence must state
      **"Edge not certified — not installed"** rather than omit it or infer a pass. Microsoft
      Edge is not installed on this machine, so the `msedge` Playwright project cannot launch.
      ⚠ This contradicts `STATE.md`'s "Edge 150 — 71/71" record at `fe5f946`. That record is
      **immutable Phase 2 evidence — annotate, never rewrite**; resolving it is filed against
      Phase 2 and is **not** Phase 3 work. Phase 3 must not cite or repeat it.

**Plan files (written 2026-08-06; execution ledger — tick by hand, never with a gsd-sdk verb):**

The numbered breakdown above has eleven items; the plan set has **twelve files**, because item 1
was split into `03-01` (commitments, spike, supply chain) and `03-02` (the authored contract) on
plan-checker advice — 8 tasks with no shared subject was over budget. **Every roadmap item *n* ≥ 2
is plan `03-{n+1}`.** This table is the authoritative mapping.

| Wave | Plan | Roadmap item | Objective | Autonomous |
|---|---|---|---|---|
| 1 | [ ] `03-01-PLAN.md` | 1a | Tag `fe5f946` (D-31) · OQ-1 spike · D-01 one-way gate · R-V1 owner gate · `motion@12.40.0` + Inter bytes | **no** — D-01 + R-V1 |
| 2 | [ ] `03-02-PLAN.md` | 1b | Motion lockstep · vendored icons + provenance (R-V2) · `Design.md` | yes |
| 3 | [ ] `03-03-PLAN.md` | 2 | Shell: `.map-editor` grid, rail/panel tracks, D-32 export frame; `uiContract.test.ts` created | yes |
| 4 | [ ] `03-04-PLAN.md` | 3 | Token replacement: Themely cool `:root` + Lights Out `.dark`, delete-never-alias, assertions 1-9/17/19/26 | yes |
| 5 | [ ] `03-05-PLAN.md` | 4 | `MapEditor` props boundary, app-bar/inspector dissolve, `editorConfig.ts`, transition-readiness gates | yes |
| 6 | [ ] `03-06-PLAN.md` | 5 | Icon rail + flyout, HUD header/footer, theme toggle, colours panel; assertions 15 (rail) / 27 | yes |
| 7 | [ ] `03-07-PLAN.md` | 6 | Period HUD + rehomed live region, saved maps, legend/countries panels; assertions 13/14/15/23 | yes |
| 8 | [ ] `03-08-PLAN.md` | 7 | Floating cluster, tooltip ink chip, Kosovo cursor discipline; assertion 12 | yes |
| 9 | [ ] `03-09-PLAN.md` | 8 | Narrow width + preference pass; **re-arms assertion 24 (D-35)**; assertion 18 | yes |
| 10 | [ ] `03-10-PLAN.md` | 9 | `Controls.css` split + dead-style sweep; assertions 20/21 | yes |
| 11 | [ ] `03-11-PLAN.md` | 10 | Own the SVG→PNG path, remove `html2canvas`, legend typography; assertion 25 + **assertion 24 re-proven against the new path** | **no** — D-34 + D-25 one-way gates |
| 12 | [ ] `03-12-PLAN.md` | 11 | Independent non-author review of the aggregate diff + full Chrome gate | **no** — reviewer-independence gate |

Waves are strictly sequential: every plan shares `files_modified` with its predecessor, and
`src/utils/export.ts` was deliberately not parallelised with the responsive gate that tests it.

**Two notes for whoever executes this.** `03-11` deliberately was **not** split despite its size:
its two one-way checkpoints and the non-negotiable probe battery must sit in one commitment chain,
because a plan boundary between the `export.ts` rewrite and its proof would let a partially-proven
export path land at a commit boundary. And every plan carries `estimate.confidence: low` — fewer
than three completed phases carry actuals here, so **weigh the task and file counts above the
token figures.**

**Key decisions — all resolved before planning** (`03-CONTEXT.md` D-01…D-35): the app bar
**dissolves entirely** (D-11); the narrow-width treatment is a **bottom sheet** over a bottom
bar (D-20); the accent is **Apple Blue `#0071e3`**, reserved for one element per surface
(D-05). Rail/panel widths, section order, and per-surface recipes are fixed in
`03-UI-SPEC.md`.

**Out of scope (Phase 3):** any change to map fills, palettes, borders, legend *content* model,
bands/text tools (Phase 4); any data features (Phase 5).
*(**Amendment 1** — **dark mode is now IN scope**, ported class-based from Themely's "Lights
Out" palette. The flip mechanism moves from `prefers-color-scheme` to a **`.dark` class on the
editor mount root** (D-08), set by a neutral toggle pinned in the rail footer and persisted
through the storage-adapter interface (D-30). **No `prefers-color-scheme` read anywhere** — not
even to seed a first-run default — so a future host controls the class with no OS listener to
fight it.)*

**Risks:**
- The CSS contract test is load-bearing for export fidelity — rewriting it without RED-proving
  each assertion recreates the "gate that cannot fail" failure mode this repo has shipped three
  times.
- **The dark-mode switch silently disarms an existing gate (D-35).**
  `tests/e2e/responsive.spec.ts:1025,1048` proves exported PNGs are identical across themes by
  flipping `page.emulateMedia({ colorScheme })`. Once `.dark` drives the palette that emulation
  is a **no-op**, both exports are trivially identical, and **Live Invariant 9 loses its only
  browser-level guard**. The assertion must be rebound to toggling the class and RED-proven by
  making the export theme-sensitive on purpose.
- The `02-28` matrix binds `fe5f946`, so restyling before the owner runs it must not be allowed
  to confuse which build the matrix describes — mitigated by D-31's tag.
- `03-10` rewrites the export chokepoint. Highest-risk change in the phase.

---

**Outcome**: **Shipped at the code level 2026-08-06 — and physically unverified.** All 12 plans
completed in **94 commits across 181 files (+39,234 / −6,832)** measured against tag
`acceptance-02-28` → `fe5f946060707c48c3d9591d368b5f3f8f90dd4d`. The editor is now a full-bleed map
surface carrying a centred 1:1 export frame (D-32), driven by a 56px icon rail that opens **one**
280px flyout panel at a time; the app bar and the right inspector are retired as *containers*
(D-11) and every control they held has a named new home. The slate/teal token system is gone,
replaced by the Themely cool palette with a Lights Out `.dark` class on the editor mount root, set
from a rail-footer toggle and persisted through the storage adapter, with **zero
`prefers-color-scheme` reads anywhere** (D-30) — so a future host owns the flip with no OS listener
to fight it. `Design.md` was authored at the repo root as the normative design contract, 14 animated
icons were vendored in-repo behind two-way provenance gates, and the 1438-line `Controls.css` was
split into 8 per-surface sheets under an asserted distinct-selector ceiling. `phase2CssContract.test.ts`
was retired into `uiContract.test.ts` (45 → 53 carried assertions), which additionally carries the
28 Phase 3 UI-SPEC assertions — each landing with a **captured RED proof**.

The largest single change is **D-34: `html2canvas` was removed.** Phase 3 now owns the SVG→PNG path
end to end in `src/utils/export.ts` (serialise → inline base64 `@font-face` → `Image` → `drawImage`
→ `toBlob`), behind a **generalised** font-collection seam (D-34a) used only for Inter here, so
Phase 4's text tools need not reopen the export chokepoint. The 1080×1080 size contract, the clone
contract, `sanitizeExportClone`'s strip list, `data-editor-only` exclusion, and every existing
refusal reason were preserved and RED-proven against the *new* path; bundle size fell
**689,445 → 555,717 B (−133,728)**. The transition-readiness constraint is discharged: `MapEditor`
mounts behind an explicit props boundary with storage supplied as a **factory** and the data asset
base path as a **prop** — **no embedding was performed and none is authorized** (§ Beyond v1.1).

**Gate at close**, re-run by an independent verifier rather than copied from a summary:
`npm run lint` clean · `npm test` **637/637** · `npm run build` clean · Chrome E2E **103/103** ·
`npm run data:world:check` PASS. **Browser scope is installed Chrome 151.0.7922.75 only. Microsoft
Edge is not installed on this machine and is not certified; Firefox, Safari, and previous-version
certification have never been run in this repository and are not claimed.** Decision coverage is
**36/36** (D-01…D-35 + D-34a) and assertions A-01…A-28 are all bound to an owning plan. Phase 3
execution left `.planning/phases/02-region-variants-advanced-features-1-5-2-weeks/` **byte-unchanged**,
so owner gates `02-25` and `02-28` keep their evidence intact and remain OPEN; the `acceptance-02-28`
tag was verified to still resolve to `fe5f946060707c48c3d9591d368b5f3f8f90dd4d`. The approved
snapshot catalog is still exactly `Modern` — the deferred 1492/1700/1815/1914 snapshots were not
made nameable, and the `ToastRegion` allowlist actively **rejects** copy that would advertise them.

**Carry-forwards.** Verification closed at **`human_needed`, 18/19 must-haves**. The nineteenth is
the phase goal's own aesthetic predicate, and **nobody has looked** — not at the restyled editor,
either theme, the rail, the flyout, the tooltips, or a single exported PNG. Twelve human items are
recorded in [`03-UAT.md`](../../phases/03-clean-ui-overhaul-1-1-5-weeks/03-UAT.md). **Open owner
decision F-1:** legend labels longer than **20 / 14 / 12** characters (small / medium / large) are
now export-blocked, and at the default `medium` the effective ceiling moved from effectively
unreachable (36, against a 32-character storage cap) to **14**. The verifier judged this a genuine
creator-facing regression on three grounds, two of them new: the bound is derived from a
worst-case-uniform glyph advance and over-estimates line count by roughly 1.8×; it **silently breaks
already-saved compositions** — a Phase-2-era saved map with a 15–32 character label loads cleanly and
then refuses to export, and no test covers it; and the repo's own e2e fixture was shortened
`'Imperial lands'` → `'Empire lands'` to keep the suite green. **Seven assertions that could not fail
were caught and fixed during the phase**, plus two more found in `03-12-PLAN.md`'s own verify block —
the honest self-reporting is itself part of the evidence. Every blocking gate in the phase was
answered under a **blanket, in-advance, sight-unseen proceed-authorization dated 2026-08-06 — not a
content review, and not hash-bound** (Immutable Safety Constraint 8); it authorized proceeding and
certifies nothing about the visual outcome. Full evidence:
[`03-VERIFICATION.md`](../../phases/03-clean-ui-overhaul-1-1-5-weeks/03-VERIFICATION.md) ·
[`03-12-REVIEW.md`](../../phases/03-clean-ui-overhaul-1-1-5-weeks/03-12-REVIEW.md) ·
[`deferred-items.md`](../../phases/03-clean-ui-overhaul-1-1-5-weeks/deferred-items.md).

---

