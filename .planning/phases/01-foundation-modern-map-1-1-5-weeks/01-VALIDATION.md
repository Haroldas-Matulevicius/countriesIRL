---
phase: 1
slug: foundation-modern-map-1-1-5-weeks
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-21
updated: 2026-07-21
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution, including the Plan 01-15 UAT gap-closure chain.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 after blocking package-legitimacy approval |
| **Config file** | `vitest.config.ts` — Plan 01-02 creates |
| **Quick run command** | `npm run test:run -- <affected-test-file>` |
| **Full suite command** | `npm run lint && npm run test:run && node scripts/prepareGeoData.mjs --check && npm run build` |
| **Estimated runtime** | Under 60 seconds for focused tests; full gate targeted under 60 seconds |

---

## Sampling Rate

- **After every task commit:** Run the directly affected focused test plus `npm run lint`; component-only tasks run lint plus strict TypeScript.
- **After every implementation wave:** Run `npm run test:run && npm run build` once all wave dependencies exist.
- **Plan 01-18 README gap closure (Wave 8):** Correct documentation only, then commit.
- **Plan 01-14 verification-only gate (Wave 9):** Run the full suite and require a clean diff; failures route to `/gsd:plan-phase 1 --gaps` rather than inline fixes.
- **Plans 01-19 and 01-20 UAT gap fixes (Wave 10):** Run focused ColorPicker/export tests independently, then lint, strict TypeScript, and build for each product fix.
- **Plan 01-21 focused regression gate (Wave 11):** Run the full automated suite, then block on exact Chrome 150 and Edge 150 native disabled-state and PNG-download regression checks.
- **Plan 01-15 full UAT rerun (Wave 12):** Rerun all twelve original browser/data steps only after Plan 01-21 is approved. BrowserStack/Safari availability and Natural Earth POV approval remain human checkpoint items, not product defects.
- **Before `/gsd:verify-work`:** Full suite, Plan 01-15 browser matrix/UAT, and Plans 01-16/01-17 deployment verification must be complete.
- **Max feedback latency:** 60 seconds for automated checks; browser compatibility/timing is a blocking human matrix.

---

## Plan 01-15 UAT Gap Closure

| Gap | Confirmed defect | Closure plans | Acceptance boundary |
|-----|------------------|---------------|---------------------|
| Preset controls | Preset swatches lack their own native disabled state when zero countries are selected; the custom input and Apply Custom Color button are the reference behavior. | 01-19 → 01-21 | Ten preset buttons are natively disabled at zero selection in focused tests, Chrome 150, and Edge 150; valid selection re-enables normal preset application. |
| Chromium PNG download | Chrome 150 and Edge 150 receive complete valid PNG bytes, but native download ends canceled while the UI announces success; immediate anchor removal/object-URL revocation is the lifecycle under test. | 01-20 → 01-21 | Click initiation uses a connected download anchor, anchor/object URL survive an awaited browser handoff, cleanup occurs afterward, and repeated native downloads complete in both affected browsers while output remains exact. |
| Browser/data availability | Safari/current-previous access and Natural Earth 5.1.1 POV approval remain unresolved human checkpoint work. | 01-15 | These are not product defects and remain blocking acceptance items in the existing full UAT rerun. |

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-02-01 | 02 | 2 | NFR1/NFR2/NFR4 | T-01-SC | Exact audited packages and lockfile | CLI | `npm ls --depth=0` | ❌ W0 | pending |
| 01-03-02 | 03 | 3 | F1.3/NFR10 | T-01-04 | Strict canonical color parsing | unit | `npm run test:run -- src/utils/colors.test.ts` | ❌ W0 | pending |
| 01-04-01 | 04 | 4 | F1.4/F1.5/F1.6 | T-01-06/T-01-07 | Immutable bounded reducer | unit | `npm run test:run -- src/hooks/useMapState.test.ts` | ❌ W0 | pending |
| 01-05-01 | 05 | 4 | F1.1 | T-01-09 | Unknown GeoJSON validation | unit | `npm run test:run -- src/utils/geojson.test.ts` | ❌ W0 | pending |
| 01-05-02 | 05 | 4 | F1.1/NFR1 | T-01-09 | Byte-deterministic committed map asset | CLI | `node scripts/prepareGeoData.mjs && node scripts/prepareGeoData.mjs --check` | ❌ W0 | pending |
| 01-09-01 | 09 | 4 | F6.1/F6.2 | T-01-21/T-01-22 | Saved-map and onboarding storage validation | unit | `npm run test:run -- src/utils/storage.test.ts` | ❌ W0 | pending |
| 01-11-01 | 11 | 4 | F5.1/F5.3/NFR4 | T-01-27/T-01-29 | Exact dimensions and cleanup | unit | `npm run test:run -- src/utils/export.test.ts` | ❌ W0 | pending |
| 01-12-01 | 12 | 6 | NFR7/NFR11 | T-01-44 | G-03/G-10 matchMedia drives one active focus-order-correct workspace | static/build | `npm run lint && npm exec tsc -- -p tsconfig.app.json --noEmit` | ❌ W0 | pending |
| 01-12-02 | 12 | 6 | NFR5 | T-01-30 | Root index.html and React provider bootstrap | static/build | `npm run lint && npm exec tsc -- -p tsconfig.app.json --noEmit` | ❌ W0 | pending |
| 01-12-03 | 12 | 6 | F1.1-F1.6/F5.1/F6.1/F6.2 | T-01-30/T-01-32 | One-way integration and persisted onboarding | integration/build | `npm run test:run && npm run lint && npm run build` | ❌ W0 | pending |
| 01-13-01 | 13 | 7 | NFR5/NFR6/NFR7/NFR11 | T-01-45 | Styles wire after composition without CSS reordering | static/build | `npm run lint && npm run build` | ❌ W0 | pending |
| 01-18-01 | 18 | 8 | NFR5/NFR6/NFR7 | T-01-51/T-01-52 | README-only scope/stack correction before quality-gate rerun | documentation/full | README source assertions plus `npm run lint && npm run test:run && node scripts/prepareGeoData.mjs --check && npm run build` | ✅ | complete |
| 01-14-01 | 14 | 9 | all phase requirements | T-01-36/T-01-46 | Verification-only clean-diff gate | full | `npm run lint && npm run test:run && node scripts/prepareGeoData.mjs --check && npm run build` | ✅ | complete |
| 01-19-01 | 19 | 10 | F1.3/F1.4/NFR5/NFR11 | T-01-54/T-01-55 | Explicit native disabled state prevents zero-selection preset activation | component/static | `npm run test:run -- src/components/ColorPicker.test.tsx && npm run lint && npm exec tsc -- -p tsconfig.app.json --noEmit && npm run build` | ❌ gap plan | pending |
| 01-20-01 | 20 | 10 | F5.1/F5.3/NFR4/NFR5 | T-01-56/T-01-57/T-01-58 | Connected click initiation and deferred URL/anchor cleanup prevent canceled native download and premature success | unit/build | `npm run test:run -- src/utils/export.test.ts && npm run lint && npm exec tsc -- -p tsconfig.app.json --noEmit && npm run build` | ✅ extend | pending |
| 01-21-01 | 21 | 11 | F1.3/F1.4/F5.1/F5.3/NFR4/NFR5/NFR11 | T-01-59/T-01-60 | Full automated gate plus exact affected-browser native regression | full/browser | `npm run lint && npm run test:run && node scripts/prepareGeoData.mjs --check && npm run build` | external | pending |
| 01-15-01 | 15 | 12 | all phase requirements | T-01-38/T-01-39/T-01-40 | Complete measured UAT after focused defect closure | full/browser/human | `npm run lint && npm run test:run && node scripts/prepareGeoData.mjs --check && npm run build` | external | pending |
| 01-16-01 | 16 | 13 | NFR5 | T-01-41 | Human-authorized Vercel identity | CLI/human | `npx --yes vercel@56.4.1 whoami` | external | pending |
| 01-17-01 | 17 | 14 | F5.1/NFR5 | T-01-47/T-01-48 | Automated title/module/non-empty FeatureCollection prechecks plus blocking production browser/network approval | network/human | production root/data Python assertions plus checkpoint | external | pending |

---

## Wave 0 Requirements

- [ ] Plan 01-01 — human package legitimacy approval for `vitest` and `vercel`.
- [ ] `package.json` scripts: `dev`, `build`, `preview`, `lint`, `test`, `test:run`.
- [ ] `vitest.config.ts` — Node environment.
- [ ] `eslint.config.js` — ESLint flat config with TypeScript/browser/React Hooks rules.
- [ ] `src/hooks/useMapState.test.ts` — reducer/history cases including 50+ actions.
- [ ] `src/utils/colors.test.ts` — color grammar/range cases.
- [ ] `src/utils/geojson.test.ts` — unknown/malformed/duplicate feature cases.
- [ ] `src/utils/storage.test.ts` — persistence, onboarding dismissal, corruption, quota, and unavailable cases.
- [ ] `src/utils/export.test.ts` — exact sizing/filename/blob/rejection/cleanup cases.
- [ ] `scripts/prepareGeoData.mjs --check` — byte-deterministic committed asset verification.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Focused preset/download regressions in Chrome 150 and Edge 150 | F1.3/F1.4/F5.1/F5.3/NFR4/NFR5/NFR11 | Native disabled behavior and Chromium download-manager lifecycle cannot be proven by Node unit tests | Plan 01-21 focused checkpoint after Plans 01-19 and 01-20 |
| Five-country flow and persisted onboarding dismissal/reopen | NFR5/NFR6 | Usability, focus, and reload behavior | Plan 01-15 steps 1–2 |
| Five map-ready samples <500ms; ten color, undo, and redo samples each <100ms | NFR1/NFR2 | Visible browser paint timing requires Performance API observation | Plan 01-15 step 3 |
| Stable path count and 100+ rapid interactions | F1.1/F1.2/NFR1/NFR2 | Browser DOM/event behavior | Plan 01-15 step 4 |
| Save/load across reload plus mandatory malformed, blocked, and quota storage | F6.1/F6.2 | Browser origin storage and failure translation | Plan 01-15 steps 5–6 |
| Exact PNG pixels, opacity, contents, parity, and <3 seconds | F5.1/F5.3/NFR4 | Downloaded binary and rasterization require inspection | Plan 01-15 step 7 |
| One active responsive workspace, DOM/focus order, dark theme, 200% zoom, reduced motion | NFR7/NFR11 | Responsive composition and media preferences | Plan 01-15 steps 8–9 |
| Chrome/Firefox/Edge/Safari current and previous matrix | NFR5/NFR7/NFR11 | Cross-engine/browser behavior | Plan 01-15 step 10; BrowserStack/macOS if needed |
| Already-loaded offline behavior with no runtime third-party requests | NFR5 | Network inspection and loaded-session behavior | Plan 01-15 step 11; fresh disconnected reload excluded |
| Natural Earth 5.1.1 default POV/inclusion acceptance | F1.1 | Geopolitical presentation requires approval | Plan 01-15 step 12 |
| Vercel account authorization | NFR5 | Human identity flow | Plan 01-16 Task 1 |
| Production title/Vite entry/non-empty GeoJSON plus browser/network approval | F5.1/NFR5 | External deployment content and same-origin behavior | Plan 01-17 Task 1 checkpoint |

---

## Validation Sign-Off

- [x] All implementation tasks have automated verification or a blocking prerequisite.
- [x] Sampling continuity: no 3 consecutive implementation tasks lack an automated check.
- [x] Wave 0 covers every missing test/config/package/determinism gate.
- [x] Plan 01-14 is verification-only and routes failures to targeted gap plans.
- [x] Plans 01-19 and 01-20 independently close the two confirmed product defects in one wave.
- [x] Plan 01-21 blocks on focused Chrome 150/Edge 150 regression evidence before the complete Plan 01-15 rerun.
- [x] Measured map/interaction thresholds use multiple browser samples.
- [x] Malformed, blocked, and quota storage UAT is mandatory.
- [x] Browser compatibility matrix includes current and previous Chrome, Firefox, Edge, and Safari.
- [x] BrowserStack/Safari availability and Natural Earth POV remain human checkpoint items rather than product defects.
- [x] Offline boundary excludes fresh disconnected reload and service workers.
- [x] No watch-mode flags are used in acceptance commands.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** approved 2026-07-21; updated after failed Plan 01-15 UAT with the 01-19/01-20 → 01-21 → 01-15 gap-closure and rerun chain.
