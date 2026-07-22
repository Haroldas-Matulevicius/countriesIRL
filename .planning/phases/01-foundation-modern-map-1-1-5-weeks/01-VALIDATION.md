---
phase: 1
slug: foundation-modern-map-1-1-5-weeks
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-21
updated: 2026-07-21
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution, including the completed deep-review fixes and the Plan 01-21 → 01-15 UAT acceptance chain.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10; exact package identity approved in Plan 01-01 and installed by Plan 01-02 |
| **Config file** | `vitest.config.ts` — source-scoped to `src/**/*.test.{ts,tsx}`, explicitly excludes `.claude/**`, and is guarded by `src/vitestScope.test.ts` |
| **Quick run command** | `npm run test:run -- <affected-test-file>` |
| **Full suite command** | `npm run lint && npm run test:run && node scripts/prepareGeoData.mjs --check && npm run build` |
| **Verified baseline** | Current post-deep-review run passes 11 source test files / 98 tests in 792ms. Plan 01-14's historical 33-file / 573-test evidence predates WR-01 and included duplicate agent-worktree discovery. |
| **Estimated runtime** | Under 60 seconds for focused tests and the source-scoped full gate |

---

## Sampling Rate

- **After every task commit:** Run the directly affected focused test plus `npm run lint`; component-only tasks run lint plus strict TypeScript.
- **After every implementation wave:** Run `npm run test:run && npm run build` once all wave dependencies exist.
- **Plan 01-18 README gap closure (Wave 8):** Correct documentation only, then commit. Complete.
- **Plan 01-14 verification-only gate (Wave 9):** Historical full dependency/security/documentation/lint/TypeScript/test/deterministic-data/build/clean-diff gate passed before source-scoping.
- **Plans 01-19 and 01-20 UAT gap fixes (Wave 10):** Native preset disabling and Chromium download lifecycle fixes are complete, including focused tests and the durable export rule update.
- **Completed deep review after Wave 10:** Source-only Vitest discovery, saved-map deduplication, partial-load warning feedback, effective-white no-op suppression, startup storage alerting, truthful shortcut labels, tooltip clamping/flipping, and responsive-remount modal focus restoration are implemented and covered by source tests.
- **Plan 01-21 focused regression gate (Wave 11):** Run the full source-scoped automated suite; preflight exact Chrome 150 and Edge 150 by local-direct access or BrowserStack Local/approved equivalent tunnel; prove any remote browser loads the local Vite URL; then block on zero-selection disabling, White→Red active-disabled transitions, side-effect-free active attempts, and two completed native downloads per browser.
- **Plan 01-15 full UAT rerun (Wave 12):** Verify source-only discovery, rerun all twelve browser/data steps after Plan 01-21 approval, and explicitly exercise partial-corrupt load warnings, blocked startup storage alerting, 360px tooltip edges, 1200px modal-focus remounts, and revised active-color semantics. Preflight every matrix cell using an exact local browser or proven BrowserStack Local/approved tunnel route. BrowserStack/Safari availability and Natural Earth POV approval remain human checkpoint items, not product defects.
- **Before `/gsd:verify-work`:** Full suite, Plan 01-15 browser matrix/UAT, and Plans 01-16/01-17 deployment verification must be complete.
- **Max feedback latency:** 60 seconds for automated checks; browser compatibility/timing is a blocking human matrix.

---

## Deep-Review Fix Coverage

| Review fix | Completed behavior | Automated evidence | Browser/UAT acceptance |
|------------|--------------------|--------------------|------------------------|
| BL-01 | Exact and trim-equivalent saved-map names deduplicate to the newest valid normalized record | `src/utils/storage.test.ts` | Plan 01-15 persistence success retains exact trimmed-name replacement behavior |
| BL-02 | A valid-subset saved-map load emits warning feedback instead of success-only feedback | `src/components/SaveLoad.test.tsx` | Plan 01-15 step 6 verifies exact warning copy/severity and applied valid colors |
| BL-03 | Effective white is canonical; active White/colored presets are disabled and no-op attempts create no history/status/timing work | `src/utils/colors.test.ts`, `src/hooks/useMapState.test.ts`, `src/components/ColorPicker.test.tsx` | Plan 01-21 exact Chrome/Edge checks; Plan 01-15 steps 2, 3, and matrix step 10 |
| BL-04 | An unavailable onboarding storage read produces an immediate accessible startup alert | `src/App.test.tsx` | Plan 01-15 step 6 blocked-startup case |
| WR-01 | Default Vitest discovery is limited to source tests and excludes `.claude/**` worktrees | `src/vitestScope.test.ts`, `vitest.config.ts` | Plan 01-15 step 0 records verbose source-only discovery |
| WR-02 | Controls no longer advertise unimplemented shortcuts | `src/components/Controls.test.tsx` | Covered by source-scoped full gate; no deferred shortcut behavior is added |
| WR-03 | Tooltips measure, flip, and clamp within viewport margins | `src/components/Tooltip.test.ts` | Plan 01-15 step 8 verifies top/right/bottom behavior at 360px |
| WR-04 | Saved Maps restores focus to the currently mounted responsive control when the original opener disconnects | `src/components/SaveLoad.test.tsx`, `src/components/Controls.test.tsx` | Plan 01-15 steps 8–9 verify both directions across the 1200px remount |

---

## Plan 01-15 UAT Gap Closure

| Gap | Confirmed defect | Closure plans | Acceptance boundary |
|-----|------------------|---------------|---------------------|
| Preset controls and effective-white no-ops | Presets originally lacked native zero-selection disabling; deep review then established that the active effective color itself must remain disabled and side-effect free. | 01-19 + BL-03 → 01-21 | Zero selection disables all ten. Selecting an uncolored country leaves White active/disabled and nine alternatives enabled. Applying Red makes Red active/disabled and enables White. Active attempts create no history, success, or `countriesirl-color-start` residue in focused tests, Chrome 150, and Edge 150. |
| Chromium PNG download | Chrome 150 and Edge 150 received complete PNG bytes but native download ended canceled while UI announced success; immediate anchor removal/object-URL revocation was the lifecycle under test. | 01-20 → 01-21 | Connected click initiation, bounded awaited post-click handoff, finally cleanup after handoff, immediate click-failure cleanup, durable rule correction, and two completed downloads in each affected browser while output remains exact. |
| Deep-review browser behavior | Partial-load feedback, startup storage alerting, source-only discovery, tooltip edges, and responsive-remount focus require explicit acceptance beyond unit tests. | BL-02/BL-04/WR-01/WR-03/WR-04 → 01-15 | Exact warning/alert feedback, source-only verbose discovery, 360px top/right/bottom tooltip containment, and focus restoration in both directions across 1200px all pass. |
| Browser/data availability | Safari/current-previous access and Natural Earth 5.1.1 POV approval remain unresolved human checkpoint work. | 01-15 | These are not product defects. Remote browsers require a proven BrowserStack Local/approved equivalent tunnel route to the local Vite app before acceptance. |

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
| 01-12-01 | 12 | 6 | NFR7/NFR11 | T-01-44 | G-03/G-10 matchMedia drives one active focus-order-correct workspace | static/build | `npm run lint && npm exec tsc -- -p tsconfig.app.json --noEmit` | yes | complete |
| 01-12-02 | 12 | 6 | NFR5 | T-01-30 | Root index.html and React provider bootstrap | static/build | `npm run lint && npm exec tsc -- -p tsconfig.app.json --noEmit` | yes | complete |
| 01-12-03 | 12 | 6 | F1.1-F1.6/F5.1/F6.1/F6.2 | T-01-30/T-01-32 | One-way integration and persisted onboarding | integration/build | `npm run test:run && npm run lint && npm run build` | yes | complete |
| 01-13-01 | 13 | 7 | NFR5/NFR6/NFR7/NFR11 | T-01-45 | Styles wire after composition without CSS reordering | static/build | `npm run lint && npm run build` | yes | complete |
| 01-18-01 | 18 | 8 | NFR5/NFR6/NFR7 | T-01-51/T-01-52 | README-only scope/stack correction before quality-gate rerun | documentation/full | README assertions plus full gate | yes | complete |
| 01-14-01 | 14 | 9 | all phase requirements | T-01-36/T-01-46 | Verification-only historical clean-diff gate | full | `npm run lint && npm run test:run && node scripts/prepareGeoData.mjs --check && npm run build` | yes | complete |
| 01-19-01 | 19 | 10 | F1.3/F1.4/NFR5/NFR11 | T-01-54/T-01-55 | Explicit native disabled state prevents zero-selection preset activation | component/static | `npm run test:run -- src/components/ColorPicker.test.tsx && npm run lint && npm exec tsc -- -p tsconfig.app.json --noEmit && npm run build` | yes | complete |
| 01-20-01 | 20 | 10 | F5.1/F5.3/NFR4/NFR5 | T-01-56/T-01-57/T-01-58 | Connected click, bounded handoff, finally cleanup, immediate click-failure cleanup, and synchronized durable rule | unit/build | `npm run test:run -- src/utils/export.test.ts && npm run lint && npm exec tsc -- -p tsconfig.app.json --noEmit && npm run build` | yes | complete |
| 01-21-01 | 21 | 11 | F1.3/F1.4/F5.1/F5.3/NFR4/NFR5/NFR11 | T-01-59/T-01-60/T-01-61 | Source-scoped full gate plus exact-browser active-disabled/no-op and two-download regression | full/browser | `npm run lint && npm run test:run && node scripts/prepareGeoData.mjs --check && npm run build` | external | pending |
| 01-15-01 | 15 | 12 | all phase requirements | T-01-38/T-01-39/T-01-40/T-01-41/T-01-42 | Complete deep-review and measured UAT through recorded local-direct or proven tunneled routes | full/browser/human | `npm run lint && npm run test:run && node scripts/prepareGeoData.mjs --check && npm run build` | external | pending |
| 01-16-01 | 16 | 13 | NFR5 | T-01-41 | Human-authorized Vercel identity | CLI/human | `npx --yes vercel@56.4.1 whoami` | external | pending |
| 01-17-01 | 17 | 14 | F5.1/NFR5 | T-01-47/T-01-48 | Automated title/module/non-empty FeatureCollection prechecks plus blocking production browser/network approval | network/human | production root/data Python assertions plus checkpoint | external | pending |

---

## Wave 0 Requirements

- [x] Plan 01-01 — human package legitimacy approval for `vitest` and `vercel`.
- [x] `package.json` scripts: `dev`, `build`, `preview`, `lint`, `test`, `test:run`.
- [x] `vitest.config.ts` — Node environment, source-only include, `.claude/**` exclusion, non-watch.
- [x] `src/vitestScope.test.ts` — guards default discovery scope.
- [x] `src/hooks/useMapState.test.ts` — reducer/history/effective-white/timing cases including 50+ actions.
- [x] `src/utils/colors.test.ts` — color grammar/range/effective-white cases.
- [x] `src/utils/geojson.test.ts` — unknown/malformed/duplicate feature cases.
- [x] `src/utils/storage.test.ts` — persistence, deduplication, onboarding dismissal, corruption, quota, and unavailable cases.
- [x] `src/components/SaveLoad.test.tsx` — partial-load warning feedback and responsive focus fallback.
- [x] `src/App.test.tsx` — startup storage-unavailable alert.
- [x] `src/components/Tooltip.test.ts` — 360px pointer/keyboard edge positioning.
- [x] `src/utils/export.test.ts` — exact sizing/filename/blob/rejection/cleanup cases.
- [x] `scripts/prepareGeoData.mjs --check` — byte-deterministic committed asset verification.

The post-deep-review source-scoped baseline passes 11 files and 98 tests. Plan 01-15 records verbose discovery paths before browser acceptance.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Exact-browser local/tunnel preflight | NFR5 | Remote browser evidence is invalid until the intended local Vite app is reachable | Plans 01-21 and 01-15: record local-direct or BrowserStack Local/approved equivalent route, exact version/build, URL, and successful title/map load |
| Focused active-preset/download regressions in Chrome 150 and Edge 150 | F1.3/F1.4/F5.1/F5.3/NFR4/NFR5/NFR11 | Native disabled/no-op behavior and Chromium download-manager lifecycle cannot be proven by Node unit tests | Plan 01-21 verifies White→Red active transitions, no history/status/timing residue, and two downloads per browser |
| Five-country flow and persisted onboarding dismissal/reopen | NFR5/NFR6 | Usability, focus, and reload behavior | Plan 01-15 step 1 |
| Revised active-color semantics | F1.3/F1.4/NFR1/NFR2/NFR11 | Native control state and absence of browser-visible side effects require observation | Plan 01-15 steps 2–3 and matrix step 10 |
| Five map-ready samples <500ms; ten effective color, undo, and redo samples each <100ms | NFR1/NFR2 | Visible browser paint timing requires Performance API observation | Plan 01-15 step 3 |
| Stable path count and 100+ rapid interactions | F1.1/F1.2/NFR1/NFR2 | Browser DOM/event behavior | Plan 01-15 step 4 |
| Save/load plus partial-corrupt, malformed, startup-blocked, blocked-write, and quota storage | F6.1/F6.2 | Browser origin storage and feedback translation | Plan 01-15 steps 5–6 |
| Exact PNG pixels, opacity, contents, parity, and <3 seconds | F5.1/F5.3/NFR4 | Downloaded binary and rasterization require inspection | Plan 01-15 step 7 |
| One active responsive workspace, 360px tooltip edges, 1200px modal focus remount, dark theme, 200% zoom, reduced motion | NFR7/NFR11 | Responsive composition, viewport geometry, and media preferences | Plan 01-15 steps 8–9 |
| Chrome/Firefox/Edge/Safari current and previous matrix | NFR5/NFR7/NFR11 | Cross-engine/browser behavior | Plan 01-15 step 10 after per-cell route preflight |
| Already-loaded offline behavior with no runtime third-party requests | NFR5 | Network inspection and loaded-session behavior | Plan 01-15 step 11; fresh disconnected reload excluded |
| Natural Earth 5.1.1 default POV/inclusion acceptance | F1.1 | Geopolitical presentation requires approval | Plan 01-15 step 12 |
| Vercel account authorization | NFR5 | Human identity flow | Plan 01-16 Task 1 |
| Production title/Vite entry/non-empty GeoJSON plus browser/network approval | F5.1/NFR5 | External deployment content and same-origin behavior | Plan 01-17 Task 1 checkpoint |

---

## Validation Sign-Off

- [x] All implementation tasks have automated verification or a blocking prerequisite.
- [x] Sampling continuity: no 3 consecutive implementation tasks lack an automated check.
- [x] Wave 0 infrastructure and current source-scoped tests are complete.
- [x] Plan 01-14 remains the historical verification-only gate; WR-01 corrects its over-broad test discovery for all subsequent gates.
- [x] Plans 01-19 and 01-20 completed the original preset/download product gaps.
- [x] Deep-review BL-01 through BL-04 and WR-01 through WR-04 are implemented and mapped to automated or browser acceptance.
- [x] Plan 01-21 blocks on a local-direct or proven tunneled exact-browser preflight, revised active-color no-op evidence, and two completed Chrome 150/Edge 150 downloads before Plan 01-15.
- [x] Plan 01-15 requires source-only discovery evidence, all deep-review manual checks, every browser matrix route/version, and successful local-app preflight.
- [x] BrowserStack Local or equivalent remains external test tooling, not a product dependency.
- [x] Measured map/interaction thresholds use multiple browser samples and exclude active-color no-ops.
- [x] Partial-corrupt load warning, malformed JSON, blocked startup read, blocked writes, and quota storage UAT are mandatory.
- [x] Browser compatibility matrix includes current and previous Chrome, Firefox, Edge, and Safari.
- [x] BrowserStack/Safari availability and Natural Earth POV remain human checkpoint items rather than product defects.
- [x] Offline boundary excludes fresh disconnected reload and service workers.
- [x] No watch-mode flags are used in acceptance commands.
- [x] `nyquist_compliant: true` and `wave_0_complete: true` are set in frontmatter.

**Approval:** approved 2026-07-21; synchronized with the completed deep-review fixes and revised 01-21 → 01-15 source-scope/active-color/storage/tooltip/focus acceptance chain.
