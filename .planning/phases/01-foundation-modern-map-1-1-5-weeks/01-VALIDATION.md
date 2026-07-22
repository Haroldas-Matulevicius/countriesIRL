---
phase: 1
slug: foundation-modern-map-1-1-5-weeks
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-21
updated: 2026-07-22
---

# Phase 1 — Validation Strategy

> Per-phase validation contract including the diagnosed Plan 01-15 map-ready failure, the Plan 01-22 traversal correction, and the production-preview Chrome 150/Edge 150 rerun before deployment.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10; exact package identity approved in Plan 01-01 and installed by Plan 01-02 |
| **Config file** | `vitest.config.ts` — source-scoped to `src/**/*.test.{ts,tsx}`, explicitly excludes `.claude/**`, and is guarded by `src/vitestScope.test.ts` |
| **Quick run command** | `npm run test:run -- <affected-test-file>` |
| **Full suite command** | `npm run lint && npm run test:run && node scripts/prepareGeoData.mjs --check && npm run build` |
| **Verified pre-gap baseline** | The failed Plan 01-15 evidence passed 16 source test files / 136 tests plus lint, deterministic GeoJSON, and production build; only the map-ready threshold failed. |
| **Estimated runtime** | Under 60 seconds for focused tests and the source-scoped full gate |

---

## Sampling Rate

- **After every task commit:** Run the directly affected focused test plus `npm run lint`; component-only tasks run lint plus strict TypeScript.
- **After every implementation wave:** Run `npm run test:run && npm run build` once all wave dependencies exist.
- **Plan 01-18 README gap closure (Wave 8):** Correct documentation only, then commit. Complete.
- **Plan 01-14 verification-only gate (Wave 9):** Historical full dependency/security/documentation/lint/TypeScript/test/deterministic-data/build gate passed before source-scoping.
- **Plans 01-19 and 01-20 UAT gap fixes (Wave 10):** Native preset disabling and Chromium download lifecycle fixes are complete, including focused tests and the durable export rule update.
- **Completed deep review after Wave 10:** Source-only Vitest discovery, saved-map deduplication, partial-load warning feedback, effective-white no-op suppression, startup storage alerting, truthful shortcut labels, tooltip clamping/flipping, and responsive-remount modal focus restoration are implemented and covered by source tests.
- **Plan 01-21 focused regression gate (Wave 11):** Completed the full source-scoped suite and exact Chrome 150/Edge 150 active-color/download evidence.
- **Plan 01-22 map-ready gap fix (Wave 12):** Add traversal-count, exact-render equivalence, 57-path, and malformed-geometry regression tests; aggregate finite projected bounds once and generate each final safe path once; then run focused tests, lint, strict TypeScript, deterministic data, full source tests, and production build.
- **Plan 01-15 full UAT rerun (Wave 13):** Run only against `npm run build` plus `npm run preview -- --host 127.0.0.1 --port 4173 --strictPort`. Collect five controlled cold-cache and five controlled warm-cache map-ready samples in each installed release browser, with every sample <500ms, transfer/cache metadata per sample, and browser launch/bootstrap reported separately. Retain every existing current-code browser check in Chrome 150 and Edge 150. Firefox, Safari, and previous-version certification remain explicitly unverified/deferred.
- **Before `/gsd:verify-work`:** Plan 01-22, the complete Plan 01-15 production-preview rerun, and Plans 01-16/01-17 deployment verification must be complete.
- **Max feedback latency:** 60 seconds for automated checks; installed-browser compatibility/timing remains a blocking human check.

---

## Deep-Review Fix Coverage

| Review fix | Completed behavior | Automated evidence | Browser/UAT acceptance |
|------------|--------------------|--------------------|------------------------|
| BL-01 | Exact and trim-equivalent saved-map names deduplicate to the newest valid normalized record | `src/utils/storage.test.ts` | Plan 01-15 persistence success retains exact trimmed-name replacement behavior |
| BL-02 | A valid-subset saved-map load emits warning feedback instead of success-only feedback | `src/components/SaveLoad.test.tsx` | Plan 01-15 verifies exact warning copy/severity and applied valid colors |
| BL-03 | Effective white is canonical; active White/colored presets are disabled and no-op attempts create no history/status/timing work | `src/utils/colors.test.ts`, `src/hooks/useMapState.test.ts`, `src/components/ColorPicker.test.tsx` | Plan 01-21 exact Chrome/Edge checks; Plan 01-15 reruns the complete flow |
| BL-04 | An unavailable onboarding storage read produces an immediate accessible startup alert | `src/App.test.tsx` | Plan 01-15 blocked-startup case |
| WR-01 | Default Vitest discovery is limited to source tests and excludes `.claude/**` worktrees | `src/vitestScope.test.ts`, `vitest.config.ts` | Plan 01-15 records verbose source-only discovery |
| WR-02 | Controls no longer advertise unimplemented shortcuts | `src/components/Controls.test.tsx` | Covered by source-scoped full gate; no deferred shortcut behavior is added |
| WR-03 | Tooltips measure, flip, and clamp within viewport margins | `src/components/Tooltip.test.ts` | Plan 01-15 verifies top/right/bottom behavior at 360px |
| WR-04 | Saved Maps restores focus to the currently mounted responsive control when the original opener disconnects | `src/components/SaveLoad.test.tsx`, `src/components/Controls.test.tsx` | Plan 01-15 verifies both directions across the 1200px remount |

---

## Plan 01-15 UAT Gap Closure

| Gap | Confirmed defect | Closure plans | Acceptance boundary |
|-----|------------------|---------------|---------------------|
| Preset controls and effective-white no-ops | Presets originally lacked native zero-selection disabling; deep review then established that the active effective color itself must remain disabled and side-effect free. | 01-19 + BL-03 → 01-21 → 01-15 | Zero selection disables all ten. White/Red active attempts create no history, success, click, or timing residue in focused tests and the complete rerun. |
| Chromium PNG download | Chrome 150 and Edge 150 received complete PNG bytes but native download ended canceled while UI announced success. | 01-20 → 01-21 → 01-15 | Connected click, bounded handoff, finally cleanup, and completed exact native downloads remain green in both browsers. |
| Map-ready threshold | e2f9190 introduced approximately five full traversals of 129,974 coordinate positions. Current production is 533–713ms; Vite development StrictMode doubles the expensive mount effect to approximately 1.0–1.7s. | 01-22 → 01-15 | Unit tests prove one finite per-feature bounds traversal plus one final path traversal with byte-identical 57 paths/translation and invalid-geometry safety. Production preview then records five cold and five warm samples per browser; every one of all 20 samples is <500ms. |
| Benchmark semantics | The failed harness used `npm run dev`, forced no-cache reloads, omitted transfer/cache metadata, and did not distinguish browser launch/bootstrap from the in-page map-data metric. | 01-15 | Build and preview `dist`; define map-ready as map-data-start through painted interactive SVG; control cold/warm series; record resource/CDP cache facts; report launch/bootstrap separately; do not weaken the threshold. |
| Deep-review browser behavior | Partial-load feedback, startup storage alerting, source-only discovery, tooltip edges, and responsive-remount focus require explicit acceptance beyond unit tests. | BL-02/BL-04/WR-01/WR-03/WR-04 → 01-15 | Exact warning/alert feedback, source-only discovery, 360px tooltip containment, and both focus-restoration directions pass. |
| Release browser/data scope | The user narrowed this release to installed Chrome 150 and Edge 150 and approved the current Natural Earth 5.1.1 Europe presentation. | 01-15 | Complete all current-code UAT in both installed browsers. Deferred browsers stay unverified; Europe approval is recorded without reopening it. |

Optional GeoJSON simplification and lazy html2canvas loading are not part of this closure. They may not replace Plan 01-22's targeted traversal correction or Plan 01-15's unchanged threshold.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | NFR4/NFR5 | T-01-SC | Exact Vitest and Vercel package identities approved | human/package | Registry and official source verification | external | complete |
| 01-02-01 | 02 | 2 | NFR1/NFR2/NFR4 | T-01-SC | Exact audited packages and lockfile | CLI | `npm ls --depth=0` | yes | complete |
| 01-03-02 | 03 | 3 | F1.3/NFR10 | T-01-04 | Strict canonical color parsing | unit | `npm run test:run -- src/utils/colors.test.ts` | yes | complete |
| 01-04-01 | 04 | 4 | F1.4/F1.5/F1.6 | T-01-06/T-01-07 | Immutable bounded reducer | unit | `npm run test:run -- src/hooks/useMapState.test.ts` | yes | complete |
| 01-05-01 | 05 | 4 | F1.1 | T-01-09 | Unknown GeoJSON validation | unit | `npm run test:run -- src/utils/geojson.test.ts` | yes | complete |
| 01-05-02 | 05 | 4 | F1.1/NFR1 | T-01-09 | Byte-deterministic committed map asset | CLI | `node scripts/prepareGeoData.mjs --check` | yes | complete |
| 01-09-01 | 09 | 4 | F6.1/F6.2 | T-01-21/T-01-22 | Saved-map/onboarding validation plus partial-corrupt recovery | unit | `npm run test:run -- src/utils/storage.test.ts` | yes | complete |
| 01-11-01 | 11 | 4 | F5.1/F5.3/NFR4 | T-01-27/T-01-29 | Exact dimensions and cleanup | unit | `npm run test:run -- src/utils/export.test.ts` | yes | complete |
| 01-12-01 | 12 | 6 | NFR7/NFR11 | T-01-44 | MatchMedia drives one active focus-order-correct workspace | static/build | `npm run lint && npm exec tsc -- -p tsconfig.app.json --noEmit` | yes | complete |
| 01-12-02 | 12 | 6 | NFR5 | T-01-30 | Root index.html and React provider bootstrap | static/build | `npm run lint && npm exec tsc -- -p tsconfig.app.json --noEmit` | yes | complete |
| 01-12-03 | 12 | 6 | F1.1-F1.6/F5.1/F6.1/F6.2 | T-01-30/T-01-32 | One-way integration and persisted onboarding | integration/build | `npm run test:run && npm run lint && npm run build` | yes | complete |
| 01-13-01 | 13 | 7 | NFR5/NFR6/NFR7/NFR11 | T-01-45 | Styles wire after composition without CSS reordering | static/build | `npm run lint && npm run build` | yes | complete |
| 01-18-01 | 18 | 8 | NFR5/NFR6/NFR7 | T-01-51/T-01-52 | README-only scope/stack correction | documentation/full | README assertions plus full gate | yes | complete |
| 01-14-01 | 14 | 9 | all phase requirements | T-01-36/T-01-46 | Verification-only historical clean-diff gate | full | Full immutable gate | yes | complete |
| 01-19-01 | 19 | 10 | F1.3/F1.4/NFR5/NFR11 | T-01-54/T-01-55 | Native preset disabled state | component/static | Focused component, lint, types, build | yes | complete |
| 01-20-01 | 20 | 10 | F5.1/F5.3/NFR4/NFR5 | T-01-56/T-01-57/T-01-58 | Connected click, bounded handoff, finally cleanup | unit/build | Focused export, lint, types, build | yes | complete |
| 01-21-01 | 21 | 11 | F1.3/F1.4/F5.1/F5.3/NFR4/NFR5/NFR11 | T-01-59/T-01-60/T-01-61 | Exact-browser active-disabled/no-op and completed downloads | full/browser | Full gate plus local browser evidence | external | complete |
| 01-22-01 | 22 | 12 | F1.1/F5.1/NFR1/NFR5 | T-01-63/T-01-64/T-01-65 | One bounds traversal, one final path traversal, exact 57-path equivalence, invalid-geometry containment | tdd/unit/build | `npm run test:run -- src/utils/mapProjection.test.ts && npm run lint && npm exec tsc -- -p tsconfig.app.json --noEmit && node scripts/prepareGeoData.mjs --check && npm run build` | yes | pending |
| 01-15-01 | 15 | 13 | all phase requirements | T-01-38/T-01-39/T-01-40/T-01-42 | Production-preview complete UAT with controlled cold/warm map-ready evidence | full/browser/human | `npm run lint && npm run test:run && node scripts/prepareGeoData.mjs --check && npm run build` | external | pending |
| 01-16-01 | 16 | 14 | NFR5 | T-01-41 | Human-authorized Vercel identity | CLI/human | `npx --yes vercel@56.4.1 whoami` | external | pending |
| 01-17-01 | 17 | 15 | F5.1/NFR5 | T-01-47/T-01-48 | Production root/data prechecks plus browser/network approval | network/human | Production root/data assertions plus checkpoint | external | pending |

---

## Wave 0 Requirements

- [x] Plan 01-01 — human package legitimacy approval for `vitest` and `vercel`.
- [x] `package.json` scripts: `dev`, `build`, `preview`, `lint`, `test`, `test:run`.
- [x] `vitest.config.ts` — Node environment, source-only include, `.claude/**` exclusion, non-watch.
- [x] `src/vitestScope.test.ts` — guards default discovery scope.
- [x] Existing reducer, color, GeoJSON, storage, component, tooltip, export, and deterministic-data tests.
- [ ] Plan 01-22 extends `src/utils/mapProjection.test.ts` with traversal-count, exact equivalence, and malformed-geometry regression coverage before production measurement.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Installed-browser production-preview preflight | NFR5 | Release evidence must identify exact local browsers and release-mode route | Plan 01-15 records current commit, build/preview command, URL, exact Chrome/Edge builds, title, and 57 paths |
| Controlled map-ready timing | NFR1/NFR2 | Visible browser paint and cache state require Performance/ResourceTiming/CDP evidence | Five cold plus five warm samples per browser; every sample <500ms; record transfer/cache metadata and report launch/bootstrap separately |
| Five-country flow and onboarding persistence | NFR5/NFR6 | Usability, focus, and reload behavior | Plan 01-15 creator flow |
| Revised active-color semantics | F1.3/F1.4/NFR1/NFR2/NFR11 | Native state and absence of visible side effects require observation | Plan 01-15 White/Red active-disabled/no-op flow |
| Stable 57 paths and 100+ interactions | F1.1/F1.2/NFR1/NFR2 | Browser DOM/event behavior | Plan 01-15 stress flow |
| Save/load plus corrupt/unavailable/quota storage | F6.1/F6.2 | Browser-origin storage and feedback translation | Plan 01-15 persistence flows |
| Exact PNG pixels, opacity, contents, parity, and <3 seconds | F5.1/F5.3/NFR4 | Downloaded binary and rasterization require inspection | Plan 01-15 export flow |
| Responsive, tooltip, modal-focus, theme, zoom, and motion | NFR7/NFR11 | Viewport geometry and media preferences | Plan 01-15 responsive/accessibility flows |
| Installed Chrome 150 and Edge 150 release matrix | NFR5/NFR7/NFR11 | Native browser behavior requires direct observation | Plan 01-15; deferred browsers remain unverified |
| Already-loaded offline behavior | NFR5 | Network inspection and loaded-session behavior | Plan 01-15; fresh disconnected reload excluded |
| Natural Earth presentation record | F1.1 | Geopolitical presentation required explicit approval | Confirm unchanged accepted asset/README; do not reopen approval |
| Vercel account authorization | NFR5 | Human identity flow | Plan 01-16 |
| Production browser/network approval | F5.1/NFR5 | External deployment content and same-origin behavior | Plan 01-17 |

---

## Validation Sign-Off

- [x] Every implementation task has automated verification or a blocking prerequisite.
- [x] Plan 01-15's sole failed condition is documented with raw Chrome/Edge evidence and a proven root cause.
- [x] Plan 01-22 uses deterministic traversal/equivalence/safety tests rather than machine-speed assertions.
- [x] Plan 01-22 preserves D-18/D-19 malformed-geometry safety, exact 57 paths, translation, export geometry, and D-53's threshold.
- [x] Plan 01-15 measures only a production build served by Vite preview; Vite development StrictMode timing is not accepted as release evidence.
- [x] Cold and warm cache series are controlled independently and include transfer/cache metadata for every sample.
- [x] Browser process launch and pre-data bootstrap are reported separately from map-data-start-to-painted-SVG duration.
- [x] Every cold and warm map-ready sample must remain <500ms; no averaging, percentile substitution, outlier removal, or threshold relaxation is permitted.
- [x] All prior deep-review, persistence, export, accessibility, responsive, stress, offline, browser-scope, and data-approval checks remain mandatory.
- [x] Firefox, Safari, and previous-version certification remain explicitly unverified/deferred and are not blockers or passed cells.
- [x] Optional GeoJSON simplification and lazy html2canvas loading are excluded from this targeted gap closure.
- [x] No watch-mode flags are used in acceptance commands.
- [x] `nyquist_compliant: true` and `wave_0_complete: true` remain set.

**Approval:** approved planning update 2026-07-22; Plan 01-22 must complete before the production-preview Plan 01-15 rerun, followed by deployment Plans 01-16 and 01-17.
