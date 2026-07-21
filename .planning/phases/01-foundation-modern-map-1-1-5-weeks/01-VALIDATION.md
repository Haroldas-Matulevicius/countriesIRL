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

> Per-phase validation contract for feedback sampling during execution.

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
- **Plan 01-14 verification-only gate:** Run the full suite and require a clean diff; failures route to `/gsd:plan-phase 1 --gaps` rather than inline fixes.
- **Before `/gsd:verify-work`:** Full suite, Plan 01-15 browser matrix/UAT, and Plans 01-16/01-17 deployment verification must be complete.
- **Max feedback latency:** 60 seconds for automated checks; browser compatibility/timing is a blocking human matrix.

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
| 01-12-01 | 12 | 6 | NFR7/NFR11 | T-01-44 | matchMedia drives one active focus-order-correct workspace | static/build | `npm run lint && npm exec tsc -- -p tsconfig.app.json --noEmit` | ❌ W0 | pending |
| 01-12-03 | 12 | 6 | F1.1-F1.6/F5.1/F6.1/F6.2 | T-01-30/T-01-32 | One-way integration and persisted onboarding | integration/build | `npm run test:run && npm run lint && npm run build` | ❌ W0 | pending |
| 01-13-01 | 13 | 7 | NFR5/NFR6/NFR7/NFR11 | T-01-45 | Styles wire after composition without CSS reordering | static/build | `npm run lint && npm run build` | ❌ W0 | pending |
| 01-14-01 | 14 | 8 | all phase requirements | T-01-36/T-01-46 | Verification-only clean-diff gate | full | `npm run lint && npm run test:run && node scripts/prepareGeoData.mjs --check && npm run build` | ❌ W0 | pending |
| 01-16-01 | 16 | 10 | NFR5 | T-01-41 | Human-authorized Vercel identity | CLI/human | `npx --yes vercel@56.4.1 whoami` | external | pending |
| 01-17-01 | 17 | 11 | F5.1/NFR5 | T-01-47 | Verified root and bundled asset on exact production URL | network | production root/data `curl -fsS` checks | external | pending |

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
| Production URL/root/bundled asset and smoke | F5.1/NFR5 | External deployment | Plan 01-17 Task 1 |

---

## Validation Sign-Off

- [x] All implementation tasks have automated verification or a blocking prerequisite.
- [x] Sampling continuity: no 3 consecutive implementation tasks lack an automated check.
- [x] Wave 0 covers every missing test/config/package/determinism gate.
- [x] Plan 01-14 is verification-only and routes failures to targeted gap plans.
- [x] Measured map/interaction thresholds use multiple browser samples.
- [x] Malformed, blocked, and quota storage UAT is mandatory.
- [x] Browser compatibility matrix includes current and previous Chrome, Firefox, Edge, and Safari.
- [x] Offline boundary excludes fresh disconnected reload and service workers.
- [x] No watch-mode flags are used in acceptance commands.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** approved 2026-07-21 after plan-checker revisions; Wave 0 artifacts remain pending implementation.
