---
phase: 1
slug: foundation-modern-map-1-1-5-weeks
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-21
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
| **Full suite command** | `npm run lint && npm run test:run && npm run build` |
| **Estimated runtime** | Under 60 seconds for focused tests; full gate targeted under 60 seconds |

---

## Sampling Rate

- **After every task commit:** Run the directly affected focused test plus `npm run lint`; for component-only tasks run lint plus strict TypeScript.
- **After every plan wave:** Run `npm run test:run && npm run build` once the wave has all required source dependencies.
- **Before `/gsd:verify-work`:** `npm run lint && npm run test:run && npm run build` must be green.
- **Max feedback latency:** 60 seconds for automated checks.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-02-01 | 02 | 2 | NFR1/NFR2/NFR4 | T-01-SC | Exact audited packages and lockfile | CLI | `npm ls --depth=0` | ❌ W0 | pending |
| 01-03-02 | 03 | 3 | F1.3/NFR10 | T-01-04 | Strict canonical color parsing | unit | `npm run test:run -- src/utils/colors.test.ts` | ❌ W0 | pending |
| 01-04-01 | 04 | 4 | F1.4/F1.5/F1.6 | T-01-06/T-01-07 | Immutable bounded reducer | unit | `npm run test:run -- src/hooks/useMapState.test.ts` | ❌ W0 | pending |
| 01-05-01 | 05 | 4 | F1.1 | T-01-09 | Unknown GeoJSON validation | unit | `npm run test:run -- src/utils/geojson.test.ts` | ❌ W0 | pending |
| 01-09-01 | 09 | 4 | F6.1/F6.2 | T-01-21/T-01-22 | Untrusted storage schema and bounded capacity | unit | `npm run test:run -- src/utils/storage.test.ts` | ❌ W0 | pending |
| 01-11-01 | 11 | 4 | F5.1/F5.3/NFR4 | T-01-27/T-01-29 | Exact dimensions and cleanup | unit | `npm run test:run -- src/utils/export.test.ts` | ❌ W0 | pending |
| 01-12-02 | 12 | 6 | F1.1-F1.6/F5.1/F6.1/F6.2 | T-01-30/T-01-32 | Narrow one-way subsystem integration | integration/build | `npm run test:run && npm run lint && npm run build` | ❌ W0 | pending |
| 01-14-02 | 14 | 7 | all phase requirements | T-01-36 | Complete regression gate | full | `npm run lint && npm run test:run && npm run build` | ❌ W0 | pending |
| 01-16-01 | 16 | 9 | F5.1/NFR5 | T-01-41/T-01-43 | Verified static production deployment | CLI/network | `npm run lint && npm run test:run && npm run build && npx --yes vercel@56.4.1 --prod` | ❌ W0 | pending |

---

## Wave 0 Requirements

- [ ] Plan 01-01 — human package legitimacy approval for `vitest` and `vercel`.
- [ ] `package.json` scripts: `dev`, `build`, `preview`, `lint`, `test`, `test:run`.
- [ ] `vitest.config.ts` — Node environment.
- [ ] `eslint.config.js` — ESLint flat config with TypeScript/browser/React Hooks rules.
- [ ] `src/hooks/useMapState.test.ts` — reducer/history cases including 50+ actions.
- [ ] `src/utils/colors.test.ts` — color grammar/range cases.
- [ ] `src/utils/geojson.test.ts` — unknown/malformed/duplicate feature cases.
- [ ] `src/utils/storage.test.ts` — persistence/corruption/quota/unavailable cases.
- [ ] `src/utils/export.test.ts` — exact sizing/filename/blob/rejection/cleanup cases.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Five-country first-use flow under two minutes | NFR5/NFR6 | Usability and discoverability require direct observation | Plan 01-15 step 2 |
| Stable D3 path count, keyboard map, tooltip, and 100+ rapid interactions | F1.1/F1.2/NFR1/NFR2/NFR11 | Browser DOM/focus/performance behavior | Plan 01-15 steps 3, 4, and 8 |
| Save/load persistence across page reload and modal focus | F6.1/F6.2/NFR11 | Browser origin storage and focus lifecycle | Plan 01-15 step 5 |
| Exact downloaded PNG pixels, opacity, contents, visual parity, and under-3-second completion | F5.1/F5.3/NFR4 | Downloaded binary and browser rasterization require inspection | Plan 01-15 step 6 |
| Desktop/tablet/360px, dark theme, 200% zoom, reduced motion | NFR7/NFR11 | Visual/responsive/media-query behavior | Plan 01-15 steps 7 and 8 |
| Natural Earth 5.1.1 default POV and inclusion acceptance | F1.1 | Geopolitical presentation requires human approval | Plan 01-15 step 9 |
| Production Vercel URL and deployed core workflow | NFR5 | External service and public URL | Plan 01-16 tasks 1–2 |

---

## Validation Sign-Off

- [x] All tasks have automated verification or a blocking Wave 0 dependency.
- [x] Sampling continuity: no 3 consecutive implementation tasks lack an automated check.
- [x] Wave 0 covers every missing test/config/package gate.
- [x] No watch-mode flags are used in acceptance commands.
- [x] Feedback latency target is under 60 seconds.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** approved 2026-07-21 for execution planning; Wave 0 artifacts remain pending implementation.
