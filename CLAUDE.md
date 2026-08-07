# CLAUDE.md

Guidance for Claude Code when working in this repository.

---

## Orientation

- **CountriesIRL** = Web-based choropleth map generator for Instagram creators. Auto-colors maps with flexible framing, legend generation, and instant exports. **Current phase:** Phase 4 (Visual & Cartographic System) — **SHIPPED at code level and physically unverified, 2026-08-07, 16/16 plans.** Sequential ramps replacing the flat swatch grid, a redesigned Colors panel at 360px, a new `Map style` tool (water / uncoloured fill / borders / bands), interior-border rendering with quiet coastlines, gradient bands, title/subtitle/attribution text, a chrome-free legend in two forms, latin-ext font coverage, 207 colourable units, V3 persistence. **Next: Phase 5.**
- **Phase 4 shipped at code level and NOBODY HAS LOOKED AT IT. All EIGHT physical checks are `NOT PERFORMED`** — A9 screen-reader · A10 physical 200% zoom · A11 dark-theme review · A12 latin-ext diacritic export · A13 the rail at ≥1200px (D-5) · the **G-3 rework judgement** · **cartographic resemblance** · PNG-vs-screen differences. **Zero of eight. Never report or cite one as verified, and never substitute an automated result for a physical claim.** The phase ran under a **blanket, in-advance, sight-unseen proceed-authorization** (`04-AUTHORIZATION.md`, written *before* execution): it **authorizes proceeding**, it is **not a content review**, and it is **not hash-bound**. Full record: `.planning/phases/04-…/04-ACCEPTANCE.md`; the independent non-author review and its **five unfixed findings** are in `04-16-REVIEW.md`. ⚠ **`U-6` ships UNREVIEWED** — a single composition ink `#111827`, **the one place `04-UI-SPEC.md` knowingly departs from the owner's Eurostat reference**, and an `[ASSUMED]` row that is **never an owner decision**. **`OQ-1`–`OQ-5` are all still open** — a shipped default is not an answered question — and **`OQ-2` is worse than the spec assumed: the rail floor is 552px, not 540px, and Phase 5's `05-05` Data HUD would add an eighth row (~600px). Decide it before planning Phase 5.**
- **Phase 3 was closed by the owner on a free exploration — the structured UAT was skipped, and skipped is not passed.** Nine of its twelve UAT cells were **never performed**, and **Phase 4 inherited none of them** — every one of Phase 4's eight cells is among Phase 3's nine. **Never report or cite any of them as verified.** Phase 3's three follow-ups were *worked* by Phase 4 and **none is closed**: **`G-3`** → `04-07` rebuilt the panel at 360px and gated the *cause*, but the criterion is the owner's subjective judgement and **resolution is NOT claimed** · **`G-1`** → `04-12` measured it at `y = 32` (2.96 %, 88 units inside the title band) and `04-13` moved it to `y = 152` (14.07 %), re-baselining twelve assertions itemisedly — **`OQ-3` stays OPEN** · **`G-2`** → `04-14` tested it for the **first time by human or machine** and **corrected** it: a 15-char label refuses at the default `medium` size but **exports clean at `small`**, so `03-UAT.md`'s "15–32 chars should refuse" is **wrong as written**. **`03-UAT.md` is annotated, never rewritten** — Phase 3 evidence is annotate-only. **`F-1` (whether 14 chars is the right bound) is still NOT validated**; proving the ceiling bites says nothing about where it sits.
- **The project is browser-only and localhost-only.** No deployment, backend, auth, cloud, or environment secrets. The editor is now **mountable** behind an explicit props boundary for a future Themely transition — the seam exists, **nothing is embedded, and embedding requires new explicit owner authorization.**
- **Historical geometry does not ship.** The snapshot engine is built and tested, but the 1492/1700/1815/1914 packets are **deferred for missing rights-cleared archival source material** — not pending a signature. The approved catalog holds exactly `Modern`. Never describe a historical snapshot as available, and never promote geometry into `public/data/` without the full approval chain (see `.planning/coding-rules/data.md`).
- **Phase 1 is complete and its release evidence is immutable.** Do not rewrite it; annotate instead.
- **Workflow engine:** GSD (`/gsd:*` commands) — see §GSD Integration. Live status: `.planning/STATE.md`; canonical status and counts: `.planning/ROADMAP.md` § Progress.
- **Before touching code**, load the matching `.planning/coding-rules/*.md` (via **`themely-coding-rules` skill adapted for CountriesIRL** or the index at `.planning/CODING_RULES.md`).
- This file is a **routing table** — find the right doc below instead of expecting answers inline.

---

## Stack & Architecture (one screen)

**Stack** — React 18 + TypeScript (strict) + Vite; D3 v7 (one fixed Mercator projection + SVG rendering); `motion` 12.40.0 exact-pinned; **no third-party export library** — Phase 3 owns the SVG→PNG path in `src/utils/export.ts` (`html2canvas` was removed by 03-11, D-34); localStorage behind a storage-adapter interface; Vitest (unit, **`node` environment — no DOM**) + Playwright (**installed Chrome only — Edge is NOT installed on this machine and is NOT certified**). **No deployment target.**

**Core wiring:**
- `MapEditor` — **the mountable boundary** (03-05): `<MapEditor dataBasePath? storage? initialThemeMode? />`. Names **no host global** (asserted as an empty set); storage arrives as a *factory*, not an instance
- `App` — composition root inside that boundary: owns durable state, hands accessors down, re-implements nothing. Sole writer of `.dark` on the mount root and of `data-panel-open`
- `useMapState` — reducer-based **colors-only** history (undo/redo); selection is never in a snapshot
- `useGeoData` — loads and validates the same-origin world asset, builds O(1) entity/core lookups
- `MapCanvas` — D3 SVG render + the camera controller; owns the one `MapCanvasHandle`
- `MapWorkspace` — typed `legendSlot` / `navigationSlot`; placement decides export membership
- **The composition layer stack (Phase 4), painted in this order:** `rect[data-layer=surface]` (the creator's water, a **serialized rect** — host CSS reaches no exported pixel) → the scene paths → `g[data-layer=interior-borders]` (the shared mesh) → `g[data-editor-only]` highlight layer (**never exported**) → `g[data-layer=bands]` → the legend → composition text. **Bands sit under type, not over it** (U-8)
- **`Map style`** — the second rail row: water preset, uncoloured fill, coastline/interior border weights, bands. Map-style changes are **not** in undo history (Live Invariant 2 is untouched); a `Reset Map Style` ghost action stands in
- `ToolRail` / `ToolRailRow` / `ToolPanel` / `HudHeader` / `HudFooter` / `ThemeToggle` — the 56px rail, its one-at-a-time 280px flyout, and the pinned header/footer
- `useComposition{Save,Load,Export}Transaction` — locks, camera lease, outcomes
- `Controls` — one component with a declared `variant` (`rail` | `strip`), never two copies
- `ToastRegion` — allowlist boundary for every creator-facing message
- `exportMapPng` — pure: clones an already-frozen composition → exactly 1080×1080 PNG

**Non-obvious paths:**
- `src/utils/ramps.ts` — five families × five shades, `shadeForIndex` / `shadeForValue`. Monotone in luminance, **globally disjoint** (U-12), every shade carrying a 4.5:1 label colour. `blues` step 3 is `#2171B5`, **a palette substituted on merit rather than a gate loosened**
- `src/utils/contrast.ts` — the **single home** for `relativeLuminance`, `contrastRatio`, `parseHexColor`. Never write a second implementation. `MIN_COMPOSITION_SURFACE_LUMINANCE` is **`0.2164`**, not the spec's `0.216` — a surface sitting exactly on `0.216` measures 4.4941:1 against ink `#111827` and fails AA. **A dead luminance band exists at `(0.183333, 0.216351)`** where neither `#FFFFFF` nor `#111827` clears 4.5:1
- `src/utils/bands.ts` — `BAND_MAX_HEIGHT = floor(1080 / 7) = 154`, `BAND_DEFAULT_HEIGHT = 120`, and the one clamp the drag handle and the renderer share
- `src/utils/compositionText.ts` — title / subtitle / attribution bounds, sanitisation, and refusal. It strips control characters and bidi overrides before they can reach exported text
- `src/constants/mapStyle.ts` — `STROKE_WEIGHTS`, `hasStroke`, `strokeWidthFor`. `thin` is `0.75`, deliberately equal to the pre-`04-08` fixed export width, which is what makes it provably the no-visual-change step
- `public/data/world-modern.geojson` — the Phase 2 world geometry (same-origin, hash-verified)
- `public/data/world-manifest.json` — provenance and integrity record
- `public/data/snapshots/index.json` — the **approved** snapshot catalog (currently `Modern` only)
- `public/data/europe-modern.geojson` — Phase 1 European boundaries, retained
- `src/constants/snapshots.ts` — `SNAPSHOT_CATALOG`; reachability is decided here, not by a manifest
- `src/utils/mapProjection.ts` — the single world projection; centering is a camera transform
- `src/utils/export.ts` — PNG export chokepoint, **owned outright since 03-11**: serialise → SVG-as-image → `drawImage` → `toBlob`. Clone contract, sanitization, refusal reasons. **The most safety-critical file in the repo.** Since `04-08` the clone **honours the composition's own border weights** instead of imposing a fixed black `0.75` on every path — and that loop was **replaced, never deleted**. Deleting it re-opens two recorded defects: a selected country's wrapped date-line repeats ship their 2px selection border into the download, and the paths lose the `non-scaling-stroke` pin that keeps an 8× zoom from exporting 8px borders. At weight `none` the stroke is **omitted**, not set to zero, so the gate can assert absence rather than a number that still rasterises a hairline
- `src/styles/interFontFace.ts` — inlines the vendored Inter woff2 as base64 at build time; this is what puts type inside the PNG
- `src/assets/inter-latin-variable.woff2` — same-origin font bytes, latin subset (48,432 B, SHA-256 in `src/assets/README.md`)
- `src/assets/inter-latin-ext-variable.woff2` — the **latin-ext** face added by `04-04` (85,272 B, SHA-256 `a28eb6d3…`, OFL re-verified by live fetch). The two faces are emitted as **two `@font-face` rules for one family, each with its own `unicode-range`** — `buildFontFace` now always emits a range, because two *unranged* faces at the same family/weight do not divide the character space and the latin-ext file would silently take the whole string. **A12 — actually opening a PNG and inspecting the glyphs — has still never been performed**
- `src/components/editor/` — the mountable editor: `MapEditor`, rail, panel, HUD, theme toggle
- `src/config/editorConfig.ts` — the props boundary's defaults; `createStorage()` factory lives here
- `Design.md` (repo root) — **the design contract every Phase 3 surface implements against**. § 7 is still `[FOR REVIEW]`
- `src/styles/controls/` — eight per-surface sheets that replaced the 1438-line `Controls.css` (03-10); import order is asserted with `editor.css` last
- `src/utils/legend.ts` — `resolveLegendPosition` / `resolveLegendRender`; nothing reads `legend.position` raw on a render or export path. Since `04-12`/`04-13` the legend has **no box chrome at all** — `theme`, `backgroundOpacity`, and `borderStyle` were deleted from `LegendState` — and ships in **two forms**, `bar` (inferred when any assignment is a ramp) and `rows`. Its top inset is **band-aware** (`LEGEND_SAFE_INSET + topBandHeight`), not a hard-coded `y`. `LEGEND_CHARACTERS_PER_LINE` is `{small: 10, medium: 7, large: 6}` — the source of the `medium`-size export refusal, which is **not** a flat character range
- `src/utils/colors.ts` — `resolveColorValue`, the **only** reader that turns a stored `ColorValue` into a hex (Live Invariant 10)
- `src/utils/storage.ts` — bounded records, now **V3**; limits checked **before** `JSON.parse`. A V2 record **migrates in memory** and adopts the new look, so **a saved composition changes appearance when reopened** and its export differs from a PNG the creator may already have posted (D4-17, one-way). ⚠ **A removed field is not a damaged one:** a stored V2 record still *carries* `theme` / `backgroundOpacity` / `borderStyle`, and their presence must **never** be reported as corruption. ⚠ **Headroom fell 48 % → 17 %** — 4,134 nodes per worst-case V3 record, 41,331 of `MAX_STORAGE_JSON_NODES` = 50,000 for ten saved maps
- `src/styles/uiContract.test.ts` — the **only** CSS contract test; machine-enforced token, contrast, export-firewall, and selector rules (`phase2CssContract.test.ts` was retired by plan 03-04)
- `src/styles/themeTokens.test.ts` — the exact Themely palette values plus the token namespace allowlist
- `tests/e2e/support/` — shared browser fixtures; import these, never re-declare helpers
- `.planning/coding-rules/` — Domain-specific rules indexed below

**Environment** — no `.env.local`, no secrets, no `VERCEL_URL`. The app runs from `npm run dev` against bundled data.

---

## Model Routing

Claude models only. Single role per session:

- **Smart tier — orchestrator/planner** (Opus or Fable): architecture decisions, feature planning, code review, debugging complex issues. Token-efficient, high leverage.
- **Workhorse — Opus** (if not smart tier): writes/edits/tests product code off smart-tier plan, bulk reads, verification, doc writing.

**Delegation rule:** Push code writing/editing/debugging and read-heavy sweeps down to a workhorse subagent (executor, code-fixer, verifier) instead of doing them inline. Independent non-author review of the aggregate diff is not optional — see Guardrails.

---

## Commands

```bash
npm run dev              # Start Vite dev server (port 5173)
npm run build            # tsc -b && vite build
npm run preview          # Preview built bundle locally
npm run lint             # eslint .
npm test                 # vitest run (unit; node environment, no DOM)
npm run test:e2e         # playwright test — use `--project=chrome`; Edge is NOT installed here
npm run data:world:check # Verify the bundled world asset against its manifest hash
```

**There is no deploy command.** `vercel deploy` was listed here through Phase 1 and never used —
plans 01-16/01-17 were closed as deferred and no production URL is claimed. Do not add one back
without an explicit owner decision.

**Full gate before claiming a phase-level result:** `npm run lint && npm test && npm run build`,
plus `npm run test:e2e` for anything touching render, camera, export, persistence, or layout.

---

## Guardrails

**Always read `.planning/coding-rules/general.md` first.** Besides naming, TypeScript discipline,
and forbidden patterns, it is the **canonical home** for two lists that bind every change:
**§Live Invariants** (the nine contracts a change can silently regress) and **§Immutable Safety
Constraints** (historical evidence, approval semantics, browser certification, localhost-only
scope). No other planning file restates them — they all link there. The excerpts below are
reminders, not the source of truth.

**No auto-load docs.** `CLAUDE.md` tags which docs to load — respect the guards to keep context lean.

**GeoJSON validation** — all features must have an `id` and `properties.name`. Validate on load; skip malformed entries with a warning (don't crash).

**PNG export size contract** — always export exactly 1080×1080. Test before shipping.

**The export path is ours now.** `html2canvas` was removed by 03-11 (D-34). `src/utils/export.ts`
owns serialise → SVG-as-image → `drawImage` → `toBlob`, with the font inlined as base64 from
same-origin bundled bytes. **No network request may enter the export path** — no Google Fonts
`@import`, no `@import url(http`, no third-party fetch. A consequence worth knowing: the export
sandbox now cuts every CSS route to exported pixels, so theme independence holds **by construction**
rather than by enforcement — which is why assertion 24 can no longer fail on the single-token defect
it advertises. That is documented, not a defect; see `coding-rules/export.md`.

**A selector ceiling is a gate.** `uiContract.test.ts` pins the total selector count — **337 at the
close of Phase 4** (326 at the close of 03-10; it fell to 335 when `04-12` deleted the opacity
slider's three rules, then rose to 337). Adding a rule fails it. Lower it on deletion; raise it only
with a stated reason in the same commit. Stylesheets are discovered by **directory walk**, not an
allowlist — a new sheet must join both the directory and `main.tsx`'s asserted import order
(`editor.css` last).

**195 and 207 are two different counts and are never interchangeable.** `195` is core states
(193 UN member states plus the Holy See and State of Palestine — the definition is **unchanged**).
`207` is units a creator can **paint**: the same 195 plus the twelve `self-colorable` units D4-10
unblocked (`ATA COK CYN FLK GIB IOT KAS KOS NIU SAH SOL TWN`). `data:world:check` reports both.
**D4-10 promoted no geometry and implicated no rights, factual, or topology approval** — it is a
product-policy change on already-shipped, hash-verified Modern geometry, the hash chain was
**re-derived, not waived**, and it **must never later read as a bypassed approval**.

**Approval is evidence, never inference.** Never infer, fabricate, or self-approve a rights,
factual, or topology approval. A BLOCKED packet is not a delivered snapshot and is never counted
as one. **Deferred is not done** — nothing may read as though a historical snapshot shipped. The
six historical region IDs are never silently merged. A blanket, in-advance, sight-unseen approval
authorizes proceeding; it is **not** a content review and it is **not** hash-bound. Record which
one you have.

**Firefox, Safari, and previous-version certification have never been run here** and must never be
reported as passed. **Microsoft Edge is NOT installed on this machine** — the `msedge` Playwright
project cannot launch, so no Edge result may be produced or cited. Phase 3 acceptance is scoped to
**installed Chrome 151.0.7922.75** and says so. **Phase 4's scope drifted mid-phase and its record
states BOTH versions, not one:** plans `04-01`…`04-06` on **Chrome 151.0.7922.75**, `04-07`…`04-16`
on **151.0.7922.76** (Chrome auto-updated between waves). Phase 1/2 evidence recording "Edge 150" is
**immutable — annotate it, never rewrite it** — and until that contradiction is explained, no phase
may cite it (see `STATE.md` § Filed for owner attention).

**A gate must be able to fail on the bug it covers — on its own subject.** Before landing an
assertion, break its subject and watch it go red, then restore by **scratchpad copy-back**. Phase 2
shipped three tests that could not fail (a self-comparing performance gate, a fixture asserting
wiring it re-implemented, and a pixel probe that only checked cross-context equality — which three
blank canvases satisfy). **Phase 3 caught seven more before landing**, plus two in a plan's own
verify block. The recurring shapes, all real:

- a `<= 1px` tolerance that passes against its own 1px-inset probe (derive tolerances from a
  *measurement*: the real disagreement was 6e-14 px)
- a row count written as `a.length * b.length` — green at zero rows (use a literal)
- a probe that throws at *import*, so the assertion never ran at all
- a probe that reddens a **different** gate than the one being proven
- a gate whose subject the browser neutralises anyway (Chrome strips `box-shadow` in forced-colors)
- a `git diff --quiet HEAD` evidence check that passes silently on a *committed* change — the exact
  threat it existed to catch

If you cannot make an assertion go red, **say so plainly instead of claiming it passes.**

**Never `git checkout --` a file with uncommitted work.** Copy it to a scratchpad first and restore
by copying back. Two agents lost edits this way in one session. See `coding-rules/general.md`.

**Never run the gsd-sdk verbs `state.advance-plan`, `state.update-progress`, or
`roadmap.update-plan-progress`.** They infer status from file presence and have already zeroed
this repo's progress counters, deleted its activity log, and marked an incomplete plan complete.
**Edit `.planning/STATE.md` and `.planning/ROADMAP.md` by hand.**

**Independent review is not optional.** Executor self-reported checkpoints proved unreliable:
non-author review of an aggregate diff caught five real defects that the executor had already
marked resolved.

---

## Documentation Routing

### Always-relevant engine docs (updated in place, never archived)

| Doc | Holds | Load when |
|---|---|---|
| `.planning/CODING_RULES.md` | Index → `coding-rules/*.md` (general, frontend, data, export, storage) | Before writing/reviewing any code. **Always read `coding-rules/general.md` first** — it also owns §Live Invariants and §Immutable Safety Constraints — then the section matching the code you're touching. |
| `.planning/STATE.md` | Live position, open owner gates, decisions, blockers, pending todos | Before starting a session; auto-loaded by GSD. |
| `.planning/ROADMAP.md` | **Canonical** phase/plan status and counts (§Progress), verified gates, timeline, risks | Whenever you need to know what is done. No other file restates these counts. |
| `.planning/MILESTONES.md` | Milestone outcomes and the milestone-level deferral table | Milestone framing; what was cut from v1.0 and why. |
| `.planning/ARCHIVES.md` | Archive navigation index + `.planning/` file-hygiene conventions | Before looking for anything historical. **Grep the archives first, read narrowly.** |
| `.planning/REQUIREMENTS.md` | Functional / non-functional / data / acceptance criteria | Reference for feature scope. **Original requirement text is never rewritten** — F2/F3/F7 carry supersession annotations, and Phase 1 Release Acceptance is immutable evidence. |
| `.planning/phases/02-.../.continue-here.md` | Session resumption only: current position, next action, working-tree hazards | Start of any Phase 2 session. It points at the canonical homes rather than copying them. |
| `Design.md` (repo root) | The **normative** design contract Phase 3 implements against: token tables vendored verbatim from Themely, the mode-invariant export firewall, the ten type roles, the accent budget, the CountriesIRL-only anatomy, the post-D-34 export-unsafe reason | Before writing or reviewing any CSS, token, type-role, icon, or motion change. **It outranks a component file, and `03-UI-SPEC.md` outranks it** — a disagreement between the two is reported, never silently resolved. |
| `.planning/PROJECT.md` | Vision, problem, solution, target users, constraints | Shipped; reference only. |

### GSD files (auto-loaded by GSD commands — don't hand-load)

`.planning/{STATE,ROADMAP,REQUIREMENTS,PROJECT}.md`

### Load-gated docs — NEVER auto-load

| Doc | Load ONLY when |
|---|---|
| `.planning/CODEX_PROMPT.md` · `.planning/PHASE1_CODEX_BRIEF.md` | **Spent Phase 1 inputs, kept for provenance only.** Frozen Phase 1 artifacts cite them by path, so they stay put. They describe a Europe-only app with a Vercel deployment target — neither is true now. Load only when auditing Phase 1 evidence. |
| `.planning/phases/02-…/02-RESEARCH.md` · `02-PATTERNS.md` · `02-UI-SPEC.md` · `02-VALIDATION.md` | Planning a change inside the surface they cover. These are large (50–80KB each) — grep them, never read one whole. |
| `.planning/phases/03-…/03-CONTEXT.md` · `03-RESEARCH.md` · `03-UI-SPEC.md` | Planning or executing a Phase 3 change. Larger still (90–140KB each) — grep them, never read one whole. `03-UI-SPEC.md` is the **approved** contract and outranks `Design.md` on any disagreement. |

There is **no** `.planning/codebase/` directory and no `.planning/PHASE2_PLANNING.md`. Rows for
both were carried in this table for months; neither file has ever been committed. Removed
2026-07-26.

---

## GSD Integration

All workflow orchestration, planning, execution, and verification uses GSD `/gsd:*` commands:

- `/gsd:execute-phase <N>` — Execute the phase's plans
- `/gsd:verify-work <N>` — Post-execution verification (goal-backward check)
- `/gsd:debug` — If a bug surfaces during UAT

**Owner gates cannot be delegated or auto-approved.** A `checkpoint:decision` or
`checkpoint:human-verify` marked `autonomous: false` needs the owner. In particular the phase
acceptance matrix requires a human to perform the touch, screen-reader, and visual checks — an
automated result may never be substituted for a physical claim, and a blanket pre-approval
authorizes proceeding without evidencing that anything was reviewed. Record which one you have.

---

## Project Skills (`.claude/skills/`) — Future

None yet. Direct CLI work.

---

## Update Process

`CLAUDE.md`, `.planning/CODING_RULES.md`, and `.planning/coding-rules/*.md` are manually maintained sources of truth.

After a session that changes rules, patterns, or architecture:
1. Propose the exact edit — never auto-save without review
2. Bump the "Last updated" date in the changed file
3. Keep only the **two most recent** "Last updated" entries in each file (git holds the rest)

**Rule 3 is real and was being violated.** `frontend.md` had accumulated seven entries and
`export.md` four before plan 02-25 consolidated them. When you would add a third, merge the two
oldest into one line in the same edit.

**Update the matching `coding-rules/*.md` in the same commit that lands the behavior.** Batching
rule updates to the end of a phase means the rules describe what was planned rather than what
shipped, and a later "documentation catch-up" plan then has to reverse-engineer the delta.

---

## Documentation-as-you-build

Every subsystem owns a rules file, and the rule lands with the code:

| Subsystem | File |
|---|---|
| Cross-cutting (types, naming, testing, git) | `coding-rules/general.md` |
| React / D3 / CSS / composition root | `coding-rules/frontend.md` |
| World asset, catalog, validation | `coding-rules/data.md` |
| PNG export and its clone contract | `coding-rules/export.md` |
| Persistence | `coding-rules/storage.md` |

*(Phase 1 ran this through `.planning/CODEX_PROMPT.md`; the prompt is spent, the practice stands.)*

---

*Last updated: 2026-08-07 — **Phase 4 close-out (plan `04-16`).** Orientation now reads Phase 4 **SHIPPED at code level and physically unverified**, 16/16, with **all eight physical checks `NOT PERFORMED`** named individually, the blanket sight-unseen authorization's exact terms, `U-6` as the one knowing departure from the owner's reference, and `OQ-1`–`OQ-5` all open — with `OQ-2`'s **552px** rail floor flagged as a decision Phase 5 planning must not skip. The Phase 3 bullet was rewritten to say its three follow-ups were **worked but none closed**, and that `G-2` was **corrected** (a `medium`-size trap, not a flat 15–32 char range) with `03-UAT.md` **annotated, never rewritten**. Core wiring gained the **composition layer stack** and the `Map style` tool. Paths gained `ramps.ts`, `contrast.ts` (floor **0.2164**, and the dead luminance band), `bands.ts`, `compositionText.ts`, `colors.ts`, and `constants/mapStyle.ts`; `export.ts` now records that the clone **honours composition border weights** and that its loop was **replaced, never deleted**; `legend.ts` records the deleted chrome, the two forms, and the band-aware inset; `storage.ts` records **V3**, the removed-field-is-not-damaged rule, and the **48 % → 17 %** headroom fall; the font row gained the **latin-ext** second asset with its `unicode-range` trap. Guardrails: the selector ceiling moved 326 → **337**, and **195 vs 207** was added as a standing distinction with D4-10's no-approval-implicated framing.*
*Last updated: 2026-08-06 and earlier, condensed per the two-entry rule — **Phase 3 close-out:** Orientation read Phase 3 SHIPPED (code level) and physically unverified with the 12-item `03-UAT.md` gate named; the stack line corrected (`html2canvas` gone, 03-11 owns the SVG→PNG path, `motion` 12.40.0 in, Playwright scoped to **installed Chrome only — Edge is NOT installed here**, which also corrected the browser-certification guardrail); core wiring gained `MapEditor`'s mountable boundary and the rail/panel/HUD components, and `Controls`' variants were corrected `app-bar | strip` → **`rail | strip`**; paths gained `Design.md`, `src/components/editor/`, `src/config/editorConfig.ts`, `src/styles/controls/`, and `interFontFace.ts`; the owned-export-path and selector-ceiling guardrails were added, and "a gate must be able to fail" was rewritten with the six real shapes Phase 3 caught. Earlier: `phase2CssContract.test.ts` retired by 03-04 so the paths table points at `uiContract.test.ts` and `themeTokens.test.ts`; `Design.md`'s row moved into the always-relevant engine docs with its precedence rule (`03-UI-SPEC.md` outranks it, it outranks a component file), and the Phase 3 planning docs joined the load-gated table at 90–140KB each (03-02). 2026-07-26: Phase 2 routing and the documentation pass — scope, world/catalog paths, the real command set with no deploy target, the evidence-not-inference guardrail, `/gsd:*` command form, owner gates, documentation-as-you-build (02-25); removal of the two routing rows pointing at files that never existed; guardrails re-pointed at `coding-rules/general.md` as canonical for the live invariants and immutable safety constraints; the destructive gsd-sdk verbs; and the load-gating of the spent Phase 1 inputs.*

*Full edit history: `git log -p -- CLAUDE.md`.*
