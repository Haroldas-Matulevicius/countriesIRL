---
phase: 02
slug: region-variants-advanced-features-1-5-2-weeks
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-24
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 (unit/SSR) + Playwright Test 1.61.1 (Chrome and Edge browser flows) |
| **Config file** | `vitest.config.ts`; `playwright.config.ts` added in Wave 0 |
| **Quick run command** | `npm test -- src/utils/camera.test.ts src/utils/legend.test.ts src/utils/compositionStorage.test.ts` |
| **Full suite command** | `npm run lint && npm test && npm run build && npm run test:e2e` |
| **Estimated runtime** | Focused unit feedback under 30 seconds; full browser-inclusive gate measured after Wave 0 |

---

## Sampling Rate

- **After every task commit:** Run focused Vitest files for the changed subsystem; target completion under 30 seconds.
- **After every plan wave:** Run source-scoped lint, `npm test`, and `npm run build`.
- **After camera/export/legend waves:** Add the focused Chrome Playwright smoke for the changed flow.
- **Before `/gsd:verify-work`:** Full unit/build/lint suite, full Chrome and Edge E2E, exact downloaded-PNG inspection, and the manual physical-touch checklist must be complete.
- **Max feedback latency:** 30 seconds for task-level automated sampling; browser suites are wave gates.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-W0-01 | Wave 0 | 0 | Cross-cutting | T-02-01 | Product lint excludes planning/worktree evidence without deleting it | config + CLI | `npm run lint` | ❌ W0 | ⬜ pending |
| 02-W0-02 | Wave 0 | 0 | D-01–D-06, D-16–D-18 | T-02-02 | Camera numbers and transforms are finite and clamped | unit | `npm test -- src/utils/camera.test.ts` | ❌ W0 | ⬜ pending |
| 02-W0-03 | Wave 0 | 0 | D-12–D-15 | T-02-03 | Assets are hash-pinned, validated, finite, and policy-bounded | asset/unit | `npm test -- src/utils/worldDataAsset.test.ts` | ❌ W0 | ⬜ pending |
| 02-W0-04 | Wave 0 | 0 | D-19, F6 | T-02-01 / T-02-04 | Untrusted saved data is bounded, migrated, and rendered as text | unit | `npm test -- src/utils/compositionStorage.test.ts` | ❌ W0 | ⬜ pending |
| 02-W0-05 | Wave 0 | 0 | D-20–D-23, F2 | T-02-03 | Snapshot provenance, geometry, coverage, and IDs are validated | asset/unit | `npm test -- src/utils/historicalValidation.test.ts src/utils/scene.test.ts` | ❌ W0 | ⬜ pending |
| 02-W0-06 | Wave 0 | 0 | D-24–D-27, F4 | T-02-01 / T-02-05 | Labels use text nodes and style values are enums/clamped numbers | unit | `npm test -- src/utils/legend.test.ts` | ❌ W0 | ⬜ pending |
| 02-W0-07 | Wave 0 | 0 | D-07–D-11, F5.2 | T-02-06 / T-02-07 | Export uses same-origin assets, sanitized clones, fixed suffix, and full cleanup | unit | `npm test -- src/utils/export.test.ts` | ✅ extend | ⬜ pending |
| 02-W0-08 | Wave 0 | 0 | NFR3, NFR11 | T-02-02 | Browser controls provide keyboard/single-pointer alternatives and safe gesture bounds | browser | `npm run test:e2e` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Source-scope ESLint so `.planning/**` and `.claude/**` do not contaminate product lint; preserve all evidence files.
- [ ] `src/utils/camera.test.ts` — wrap normalization, one-world minimum, vertical clamp, semantic round trip, pointer-anchor invariants, and antimeridian Locate bounds.
- [ ] `src/utils/worldDataAsset.test.ts` — source hashes, exact 195-state core, supplements, parent/neutral policy, and finite paths.
- [ ] `src/utils/scene.test.ts` — effective color ownership, identity preservation, historical default-white behavior, fallback layering, and crossfade state.
- [ ] `src/utils/legend.test.ts` — non-white derivation, placeholder labels, dormant/unused lifecycle, ordering, bounds, style validation, and drag/corner equivalence.
- [ ] `src/utils/compositionStorage.test.ts` — Phase 1 migration, current-schema round trip, mixed/corrupt records, unknown versions, and size/length bounds.
- [ ] `src/utils/historicalValidation.test.ts` — manifest, hashes, license/provenance, coverage declarations, and identity checks.
- [ ] Extend `src/utils/export.test.ts` for camera transforms, wrapped copies, legend retention, editor-state sanitization, outgoing-scene removal, freeze ordering, exact 1080×1080 output, and cleanup.
- [ ] Add exact-pinned `mapshaper@0.7.48` and `@playwright/test@1.61.1` only after the package identity/supply-chain gate passes.
- [ ] Add `playwright.config.ts`, an `npm run test:e2e` script, and `tests/e2e/phase2-composition.spec.ts` for Chrome/Edge composition flows.
- [ ] Add a manual historical provenance/review template and physical-touch pinch/drag acceptance checklist.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Historical visual and factual accuracy | NFR8, D-20–D-23 | Automated checks prove provenance/shape contracts, not historical truth | For each snapshot, compare every curated region against the cited atlas/source, record reviewer, source, date, known uncertainty, and signed approval; reject unapproved geometry. |
| Physical multitouch pinch behavior | D-03, D-06, NFR11 | Desktop emulation does not certify real two-finger hardware behavior | On available touch hardware, verify midpoint anchoring, pinch zoom, one-finger drag, vertical clamp, date-line continuity, and accessible button alternatives. |
| Screen-reader and focus-flow quality | D-06, NFR11 | Automated accessibility checks cannot certify announcement usefulness and workflow coherence | Run the complete camera, Locate, period, legend, save/load, and export flows by keyboard with the supported screen-reader/browser route; record focus order and announcements. |
| Exact downloaded composition appearance | D-07–D-11 | Pixel assertions need human confirmation of clean composition and intended visual hierarchy | In Chrome and Edge, frame a date-line view, include a custom legend, export, verify 1080×1080 opaque output, viewport parity, no editor indicators, and no clipping/duplicate-world artifact. |

---

## Threat References

- **T-02-01:** Stored XSS or unsafe nested keys through localStorage map names, legend labels, IDs, or color dictionaries.
- **T-02-02:** Non-finite/extreme camera values causing blank scenes, unreachable controls, or excessive work.
- **T-02-03:** Malformed, substituted, or unexpectedly large GeoJSON/snapshot assets causing incorrect output or resource exhaustion.
- **T-02-04:** Oversized/deep saved JSON exhausting the main thread or storage quota.
- **T-02-05:** Persisted raw CSS/style strings causing CSS injection or unsupported export effects.
- **T-02-06:** Remote/tainted resources or unsupported visual effects breaking deterministic export.
- **T-02-07:** Unsafe filenames or incomplete anchor/object-URL/frame cleanup during download.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verification or explicit Wave 0 dependencies.
- [ ] Sampling continuity: no 3 consecutive implementation tasks without automated verification.
- [ ] Wave 0 covers every currently missing test/config reference.
- [ ] No watch-mode flags are used in verification commands.
- [ ] Focused feedback latency remains under 30 seconds.
- [ ] Browser and manual-only gates are attached to the plans that create the relevant behavior.
- [ ] `nyquist_compliant: true` and `wave_0_complete: true` are set only after the plan checker confirms full task mapping.

**Approval:** pending plan generation and checker verification
