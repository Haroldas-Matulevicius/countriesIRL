---
phase: 4
slug: visual-cartographic-system-1-5-2-weeks
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: true
created: 2026-08-06
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> **Source:** `04-RESEARCH.md` § Validation Architecture (line 1672). That section is the
> detailed original; this file is the execution-facing contract seeded from it.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (unit)** | **Vitest 4.1.10**, `node` environment — **NO DOM** |
| **Framework (browser)** | **Playwright 1.61.1**, `testDir: ./tests/e2e`, `fullyParallel: false`, `workers: 1`, `retries: 0` |
| **Browser projects** | `chrome` (installed 151.0.7922.75 — the only usable project) · `msedge` (**cannot launch — Edge is NOT installed on this machine**) |
| **Data check** | `npm run data:world:check` → `node scripts/prepareWorldData.mjs --check` |
| **CSS contract** | `src/styles/uiContract.test.ts` + `src/styles/themeTokens.test.ts` (run under Vitest) |
| **Config file** | `vite.config.ts` (vitest) · `playwright.config.ts` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm run lint && npm test && npm run build && npm run test:e2e -- --project=chrome` |
| **Estimated runtime** | unit ~seconds · full gate ~minutes |

**Baseline at Phase 3 close, for regression comparison:** 637/637 unit · Chrome e2e 103/103 ·
lint and build clean · `data:world:check` PASS. Chrome only — no Edge, Firefox, or Safari result
exists and none may be cited.

**Layer legend:** `unit` = Vitest node (no DOM) · `e2e` = Playwright `--project=chrome` ·
`data` = `npm run data:world:check` · `css` = `uiContract.test.ts` / `themeTokens.test.ts`

---

## Sampling Rate

- **After every task commit:** `npm test` — catches ramp, contrast, legend, storage, and every
  CSS-contract regression in seconds.
- **After every plan wave:** `npm run lint && npm test && npm run build`, plus
  `npm run test:e2e -- --project=chrome` for any wave touching render, camera, export,
  persistence, or layout — **which in Phase 4 is most of them.**
- **Before any export-pixel wave:** `rm -rf .artifacts/playwright/downloads/` — stale PNGs are
  stale evidence.
- **Before `/gsd-verify-work`:** full suite green + `data:world:check` PASS.
- **Max feedback latency:** unit < 30s; e2e per-spec < 3 min.

---

## Per-Decision Verification Map

Phase 4 has **no REQ-IDs mapped in ROADMAP.md** (`phase_req_ids` is null). Coverage is therefore
tracked against `04-CONTEXT.md` decisions **D4-01 … D4-18**. This substitution is deliberate and
recorded — it is not a missing-requirements defect.

| Decision | Behavior to prove | Layer | Automated command | File status |
|---|---|---|---|---|
| D4-01 | Ramp shades strictly monotone in luminance; `shadeForValue`/`shadeForIndex` order-preserving | unit | `npx vitest run src/utils/ramps.test.ts` | ❌ W0 |
| D4-01 | Ramp shade-sets pairwise disjoint (Open Question 5) | unit | same file | ❌ W0 |
| D4-02 | Every ramp shade has a label colour reaching 4.5:1 | unit | `npx vitest run src/utils/contrast.test.ts src/utils/ramps.test.ts` | ❌ W0 |
| D4-02 | `contrast.ts` reproduces the values `uiContract.test.ts` already asserts | unit | `npx vitest run src/utils/contrast.test.ts` | ❌ W0 (extract from `uiContract.test.ts:266-296`) |
| D4-02 | `ColorMap` union round-trips through `resolveColorValue`, history, canonicalisation | unit | `npx vitest run src/utils/colors.test.ts src/hooks/useMapState.test.ts` | ✅ extend |
| D4-03 | Ocean pixel in the exported PNG equals the chosen water preset; two presets differ | e2e | `npx playwright test tests/e2e/export.spec.ts --project=chrome -g "water preset"` | ✅ extend |
| D4-03 | `--map-surface` stays a mode-invariant token in the unconditioned `:root` | css | `npx vitest run src/styles/uiContract.test.ts` | ✅ exists (assertions 4/5) |
| D4-04 | Mesh re-derives byte-identically; check fails on a one-digit mutation | data | `npm run data:world:check` | ✅ extend `prepareWorldData.mjs` |
| D4-05 | Panel track resolves to `0px` closed and **`360px`** open; `grid-template-columns` unchanged | css | `npx vitest run src/styles/uiContract.test.ts -t "panel track"` | ✅ update assertion 10 |
| D4-05 | Selector inventory at or below the raised, justified ceiling | css | `npx vitest run src/styles/uiContract.test.ts -t "selector inventory"` | ✅ update ceiling |
| D4-05 | Every discovered stylesheet imported, `editor.css` last | css | same file, assertion 20 | ✅ exists |
| D4-07 | Coastline sample has no dark pixel while an inland border sample does | e2e | `npx playwright test tests/e2e/export.spec.ts --project=chrome -g "border"` | ❌ W0 |
| D4-08 | Each named stroke step yields a distinct measured stroke width in the PNG | e2e | same | ❌ W0 |
| D4-09 | Uncolored country renders the grey fill while its **stored** value stays `#FFFFFF` | unit + e2e | `npx vitest run src/utils/scene.test.ts` + export sample | ✅ extend |
| D4-10 | `data:world:check` reports **207** selectable units and refuses a disagreeing manifest | data | `npm run data:world:check` | ✅ extend |
| D4-10 | `LOGICAL_CORE_COUNT` = 207 and `waitForApp` finds 207 option paths | e2e | `npx playwright test --project=chrome` (all specs) | ✅ update `tests/e2e/support/appHarness.ts` |
| D4-10 | The twelve units are selectable, colourable, and appear in `CountryList`/Locate | unit + e2e | `npx vitest run src/utils/scene.test.ts` + `locate.spec.ts` | ✅ extend |
| D4-11 | `LegendState` drops the three chrome fields; a V2 record carrying them loads **without** a repair warning | unit | `npx vitest run src/utils/storage.test.ts src/utils/legend.test.ts` | ✅ extend |
| D4-12 | Both legend forms lay out within bounds and resolve through `resolveLegendPosition` | unit | `npx vitest run src/utils/legend.test.ts` | ✅ extend |
| D4-13 | Default legend position matches the specified anchor; PNG legend region carries ink | unit + e2e | `npx vitest run src/utils/legend.test.ts` + `legend.spec.ts` | ✅ extend |
| D4-14 | Every export gate has a blank/known-different discrimination control **in the same run** | e2e | `npx playwright test tests/e2e/final-integration.spec.ts --project=chrome` | ✅ pattern exists (02-27) |
| D4-15 | Clone `<style>` carries **two** `@font-face` rules with `unicode-range`; a latin-ext string rasterises differently from the font-suppressed control | e2e | `npx playwright test tests/e2e/export.spec.ts --project=chrome -g "font"` | ✅ extend assertion 25 |
| D4-16 | Band luminance monotone along the band axis; flat with bands off | e2e | `npx playwright test tests/e2e/export.spec.ts --project=chrome -g "band"` | ❌ W0 |
| D4-16 | Band height clamps to the 1/7 cap | unit | `npx vitest run src/utils/bands.test.ts` | ❌ W0 |
| D4-17 | A V2 record migrates in memory to V3 defaults with no data loss and no spurious repair | unit | `npx vitest run src/utils/storage.test.ts` | ✅ extend |
| D4-18 (G-2) | A V2 record with a 15–32 char legend label loads cleanly, then blocks export | unit | `npx vitest run src/utils/storage.test.ts src/utils/legend.test.ts` | ✅ extend |
| all | PNG is exactly 1080×1080 (`IHDR` parse) | e2e | `npx playwright test tests/e2e/export.spec.ts --project=chrome` | ✅ exists |
| `04-11` | `package.json` / lockfile unchanged for the whole phase | unit or gate step | `git diff --stat <phase-start>..HEAD -- package.json package-lock.json` | ❌ W0 |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/utils/contrast.ts` + `src/utils/contrast.test.ts` — extract `parseHexColor`,
      `relativeLuminance`, `contrastRatio` from `uiContract.test.ts:255-296`; repoint
      `uiContract.test.ts` at the new module **in the same change** (D4-02)
      → **landed `04-01`.** Both files exist; `uiContract.test.ts:7` imports from
      `'../utils/contrast'`. The shipped floor is `MIN_COMPOSITION_SURFACE_LUMINANCE`
      **0.2164**, not the spec's 0.216.
- [x] `src/utils/ramps.ts` + `src/utils/ramps.test.ts` — monotonicity, disjointness, contrast
      (D4-01, D4-02) → **landed `04-02`.** `blues` step 3 is `#2171B5`, substituted on merit
      rather than by loosening the gate.
- [x] `src/utils/bands.ts` + `src/utils/bands.test.ts` — the 1/7 cap (D4-16)
      → **landed `04-10`.** `BAND_MAX_HEIGHT = floor(1080 / 7)`, `BAND_DEFAULT_HEIGHT = 120`.
- [x] `tests/e2e/export.spec.ts` — new describes for water, border, band, and text properties,
      **each with its own discrimination control** (D4-03, D4-05/D4-08, D4-16, D4-07)
      → **landed across `04-01`, `04-08`, `04-09`, `04-10`, `04-11`.** Eight describes:
      `PNG export`, `water preset`, `interior borders`, `highlight layer`, `border weight`,
      `uncolored fill`, `band`, `composition text`.
- [x] `scripts/prepareWorldData.mjs` — mesh derivation + verification branch (D4-04)
      → **landed `04-06`.** `--check` re-derives the mesh and matches it:
      *"327 geometries, 366767 bytes."*
- [x] `tests/e2e/support/appHarness.ts` — `LOGICAL_CORE_COUNT` 195 → 207 (D4-10;
      **blocks every e2e spec until updated**) → **landed `04-03`.** `appHarness.ts:12`.
- [x] A `package.json`-unchanged assertion for `04-11`
      → **landed `04-15`**, and it was the ONE row still unsatisfied when this phase's
      integration plan ran. Until then the row rested on a `git diff` a human had to remember
      to run and on per-plan SUMMARY self-reports. It is now a gate:
      `tests/e2e/final-integration.spec.ts` § *no package was installed during phase 4*
      asserts `package.json` **and** `package-lock.json` against the phase-start dependency
      set — three-way, so a lockfile edited on its own is caught and the failure names the
      package. RED-proved by adding a slopsquat-shaped `reqeusts`.

**No new framework install is needed** — Vitest and Playwright are both present and configured,
and `mapshaper 0.7.48` is already a devDependency. Phase 4 should add **zero** runtime packages.

**`wave_0_complete: true` was set by `04-15` on 2026-08-07**, after each row above was checked
against a landed artifact rather than against a plan that said it would land one.
`nyquist_compliant` and `status` are deliberately **untouched** — `04-16` sets those after the
independent review, and a plan marking its own phase compliant is the self-report this project
has learned not to trust.

---

## RED-Proof Requirement (non-negotiable)

Every gate above must be **RED-proved on its own subject** before it lands: break the thing the
assertion covers, watch that assertion go red, then restore by **scratchpad copy-back** — never
`git checkout --` a file with uncommitted work.

Phase 2 shipped three gates that could not fail; Phase 3 caught seven more plus two inside a
plan's own verify block. The recurring shapes to avoid:

- a tolerance that passes against its own probe (derive tolerances from a *measurement*)
- a row count written as `a.length * b.length` — green at zero rows (use a literal)
- a probe that throws at *import*, so the assertion never runs
- a probe that reddens a **different** gate than the one being proven
- a gate whose subject the browser neutralises anyway
- a `git diff --quiet HEAD` evidence check that passes on a *committed* change

**If a gate cannot be made to go red, say so plainly instead of claiming it passes.**

---

## Export-Gating Rule for This Phase

Export gating is **per-property with NO whole-image baselines** (D4-14). Five of eleven plans move
exported pixels, and a re-baseline diff cannot fail on its own subject. Each export gate asserts a
named property (this pixel is the water colour / this band is monotone / this coastline sample
carries no dark ink) and pairs it with a discrimination control in the same run so a blank or
uniformly-black canvas cannot satisfy it.

---

## Manual-Only Verifications

| Behavior | Decision | Why manual | Test instructions |
|---|---|---|---|
| latin-ext diacritics render correctly **inside the exported PNG** | D4-15 | Requires a human to look at rasterised glyphs; an automated byte-difference proves *something changed*, not that it is *correct* | Set a title containing `Łódź / Čeština / Ștefan`, export, open the PNG, confirm no glyph falls back mid-string |
| Colors panel is no longer "too squished" (G-3 rework) | D4-05, 04-02 | The acceptance criterion is the owner's subjective judgement — the original complaint was subjective | Open the colors flyout at 360px, exercise ramp selection and manual paint, compare against the G-3 complaint text |
| Overall cartographic resemblance to the Eurostat reference | D4-03, D4-07, D4-12 | Aesthetic judgement | Build the reference frame and compare side-by-side with the supplied reference |

⚠️ **These are the only three.** They are recorded as manual because they *cannot* be automated —
not as a licence to substitute an automated result for a physical check. Phase 3's UAT was skipped
and nine of twelve cells were never performed; **skipped is not passed**, and nothing from Phase 3
(screen-reader, touch targets, 200% zoom, latin-ext export, dark-theme review) may be cited here as
already verified.

---

## Browser Scope (state plainly, never infer)

Automated browser evidence for Phase 4 comes from **installed Chrome 151.0.7922.75 only**.
Microsoft Edge is **not installed on this machine** — the `msedge` Playwright project cannot
launch, so no Edge result may be produced or cited. Firefox and Safari have never been run here.

---

## Validation Sign-Off

- [ ] All tasks have an `<automated>` verify or a declared Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without an automated verify
- [ ] Wave 0 covers every ❌ reference above
- [ ] No watch-mode flags in any command
- [ ] Feedback latency < 30s for unit
- [ ] Every gate RED-proved on its own subject, with the proof recorded
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
