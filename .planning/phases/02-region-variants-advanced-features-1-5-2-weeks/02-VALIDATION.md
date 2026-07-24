---
phase: 02
slug: region-variants-advanced-features-1-5-2-weeks
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-24
revised: 2026-07-24
---

# Phase 02 — Validation Strategy

> Plan-level sampling contract for execution. This document maps planned verification only; it does not claim that infrastructure, tests, historical evidence, or acceptance have executed.

## Test Infrastructure

| Property | Value |
|---|---|
| Unit/SSR | Vitest 4.1.10, Node environment, source-scoped `src/**/*.test.{ts,tsx}` |
| Browser | Playwright Test 1.61.1 with installed Chrome and Edge channels |
| Browser artifacts | Every report/result/trace/screenshot/video/download under ignored `.artifacts/playwright/`; `git check-ignore` is mandatory before first browser run |
| Quick source command | `npm test -- src/utils/camera.test.ts src/utils/scene.test.ts src/utils/legend.test.ts src/utils/storage.test.ts src/utils/export.test.ts` |
| Focused browser sampling | Chrome slices run in owning camera/navigation/Locate/legend/history/persistence/export/responsive plans |
| Final aggregate | Plan 02-27 records HEAD after the final E2E commit, creates a detached clean worktree at that SHA, runs fresh `npm ci` plus lint/test/type/data/history/build/Chrome/Edge, records evidence, and safely removes the worktree |
| Historical check | Offline/non-mutating; vector extraction may regenerate, manual traces verify evidence/procedure/input hashes without pretending to regenerate |
| Execution state | `wave_0_complete` remains false until execution creates and passes every planned test/harness/gate |

## Sampling Contract

- Every implementation task ends with its exact green `<automated>` command; no RED-only task is a completion state.
- Node Vitest is limited to pure logic, parsers, reducers, injected orchestration, and static semantics. Focus, gestures, drag, responsive behavior, downloads, and browser lifecycle claims require Playwright.
- Focused Playwright runs use installed Chrome in the owning plan. Plan 02-27 aggregates all domain specs in both installed Chrome and Edge from the exact detached worktree.
- NFR3 warm samples start at committed period selection activation and end on the first painted frame where the incoming scene is ready/full opacity and outgoing is inaccessible/removed. Assets are prewarmed; the first diagnostic sample is discarded; at least five subsequent samples per approved snapshot must each be below 500ms.
- Historical source/license approval, factual accuracy, physical multitouch, screen-reader quality, and visual PNG inspection remain human gates. Automation never substitutes for these facts.
- Any failed final-gate command requires a named gap-closure plan. The exact gate performs no inline product correction or assertion weakening.

## Per-Task Verification Map

| Task ID | Plan / Wave | Task | Requirement IDs | Planned files/evidence | Automated command | Status |
|---|---|---|---|---|---|---|
| 02-01-T1 | 02-01 / 1 | Task 1: Install audited exact build and browser dependencies | F7.1, F7.2, F7.3, NFR11 | package.json, package-lock.json | `npm ls mapshaper@0.7.48 @playwright/test@1.61.1 --depth=0` | pending |
| 02-01-T2 | 02-01 / 1 | Task 2: Source-scope lint and isolate every Playwright artifact | F7.1, F7.2, F7.3, NFR11 | eslint.config.js, playwright.config.ts, .gitignore | `npm run lint && npm exec playwright -- --version && git check-ignore .artifacts/playwright/test-results/probe.txt .artifacts/playwright/report/index.html .artifacts/playwright/downloads/probe.png` | pending |
| 02-01-T3 | 02-01 / 1 | Task 3: Preserve the accepted Phase 1 browser baseline before cutover | F7.1, F7.2, F7.3, NFR11 | tests/e2e/phase2-composition.spec.ts | `npm run test:e2e -- --project=chrome --grep "Phase 1 baseline"` | pending |
| 02-02-T1 | 02-02 / 1 | Task 1: Define live-camera, effective-scene, and complete-composition contracts | F2.1, F2.2, F2.4, F3.1, F3.2, F3.3, F3.4, F3.5, F4.1, F4.2, F4.3, F4.4, F4.5, F6.1, F6.2, F7.1, F7.2, F7.3, NFR9, NFR11 | src/types/map.ts, src/types/composition.ts, src/types/ui.ts | `npm exec tsc -- -p tsconfig.app.json --noEmit && npm run lint` | pending |
| 02-02-T2 | 02-02 / 1 | Task 2: Lock camera and snapshot constants | F2.1, F2.2, F2.4, F3.1, F3.2, F3.3, F3.4, F3.5, F4.1, F4.2, F4.3, F4.4, F4.5, F6.1, F6.2, F7.1, F7.2, F7.3, NFR9, NFR11 | src/constants/camera.ts, src/constants/snapshots.ts | `npm exec tsc -- -p tsconfig.app.json --noEmit && npm run lint` | pending |
| 02-03-T1 | 02-03 / 2 | Task 1: Implement and prove composition ownership and dirty-baseline behavior | F4.3, F4.4, F4.5, F6.1, F6.2, NFR11 | src/providers/CompositionStateProvider.tsx, src/hooks/useCompositionState.ts, src/hooks/useCompositionState.test.tsx | `npm test -- src/hooks/useCompositionState.test.tsx && npm run lint && npm exec tsc -- -p tsconfig.app.json --noEmit` | pending |
| 02-04-T1 | 02-04 / 2 | Task 1: Build the reviewed canonical world manifest | F7.1, F7.2, F7.3, NFR9 | public/data/world-manifest.json | `node -e "const m=require('./public/data/world-manifest.json'); const ids=new Set(m.coreStates.map(x=>x.id)); if(ids.size!==195\|\|m.supplements.length!==6) process.exit(1)"` | pending |
| 02-04-T2 | 02-04 / 2 | Task 2: Implement deterministic hybrid world generation and its package gate | F7.1, F7.2, F7.3, NFR9 | package.json, scripts/prepareWorldData.mjs, public/data/world-modern.geojson, .gitattributes | `node scripts/prepareWorldData.mjs && npm run data:world:check` | pending |
| 02-04-T3 | 02-04 / 2 | Task 3: Record world provenance and runtime policy | F7.1, F7.2, F7.3, NFR9 | public/data/README.md | `npm run data:world:check && npm run lint` | pending |
| 02-05-T1 | 02-05 / 3 | Task 1: Extend validation for world scene metadata and poles | F7.1, F7.2, F7.3, NFR1, NFR9 | src/utils/geojson.test.ts, src/utils/geojson.ts | `npm test -- src/utils/geojson.test.ts` | pending |
| 02-05-T2 | 02-05 / 3 | Task 2: Load and verify the canonical world asset | F7.1, F7.2, F7.3, NFR1, NFR9 | src/hooks/useGeoData.ts, src/utils/worldDataAsset.test.ts | `npm test -- src/utils/geojson.test.ts src/utils/worldDataAsset.test.ts && node scripts/prepareWorldData.mjs --check` | pending |
| 02-06-T1 | 02-06 / 2 | Task 1: Implement and prove fixed-Mercator wrapped camera invariants | F3.1, F3.2, F3.3, F3.4, F3.5, F7.1, F7.2, F7.3, NFR11 | src/utils/camera.ts, src/utils/camera.test.ts, src/utils/mapProjection.ts, src/utils/mapProjection.test.ts | `npm test -- src/utils/camera.test.ts src/utils/mapProjection.test.ts && npm run lint && npm exec tsc -- -p tsconfig.app.json --noEmit` | pending |
| 02-07-T1 | 02-07 / 4 | Task 1: Implement the live camera controller and idempotent freeze lease | F1.1, F1.2, F3.2, F3.4, F3.5, F7.1, F7.2, F7.3, NFR1, NFR2, NFR11 | src/hooks/useCameraController.ts, src/components/MapCanvas.test.tsx | `npm test -- src/components/MapCanvas.test.tsx src/utils/camera.test.ts` | pending |
| 02-07-T2 | 02-07 / 4 | Task 2: Render wrapped effective scenes with one logical selectable entity | F1.1, F1.2, F3.2, F3.4, F3.5, F7.1, F7.2, F7.3, NFR1, NFR2, NFR11 | src/components/MapCanvas.tsx, src/components/MapCanvas.test.tsx | `npm test -- src/components/MapCanvas.test.tsx src/hooks/useMapState.test.ts src/utils/mapProjection.test.ts && npm run lint` | pending |
| 02-07-T3 | 02-07 / 4 | Task 3: Replace the Phase 1 runtime smoke with the world camera baseline | F1.1, F1.2, F3.2, F3.4, F3.5, F7.1, F7.2, F7.3, NFR1, NFR2, NFR11 | tests/e2e/phase2-composition.spec.ts, tests/e2e/fixtures/camera.html | `npm run test:e2e -- --project=chrome --grep "world baseline\|camera input\|camera freeze"` | pending |
| 02-08-T1 | 02-08 / 5 | Task 1: Implement the exact three-action navigation cluster | F3.2, F3.3, F3.4, F3.5, NFR11 | src/components/MapNavigation.tsx, src/components/MapNavigation.test.tsx | `npm test -- src/components/MapNavigation.test.tsx && npm run lint && npm exec tsc -- -p tsconfig.app.json --noEmit` | pending |
| 02-08-T2 | 02-08 / 5 | Task 2: Prove navigation focus and dismissal in installed Chrome | F3.2, F3.3, F3.4, F3.5, NFR11 | tests/e2e/navigation.spec.ts, tests/e2e/fixtures/navigation.html | `npm run test:e2e -- --project=chrome --grep "camera controls\|Move Map"` | pending |
| 02-09-T1 | 02-09 / 5 | Task 1: Add modern-core search and Select Visible | F1.2, F1.4, F3.1, F3.2, F3.5, NFR5, NFR9, NFR11 | src/components/CountryList.test.tsx, src/components/CountryList.tsx | `npm test -- src/components/CountryList.test.tsx src/hooks/useMapState.test.ts` | pending |
| 02-09-T2 | 02-09 / 5 | Task 2: Build the explicit committed-target Locate combobox | F1.2, F1.4, F3.1, F3.2, F3.5, NFR5, NFR9, NFR11 | src/components/LocateCountry.test.tsx, src/components/LocateCountry.tsx | `npm test -- src/components/LocateCountry.test.tsx && npm run lint && npm exec tsc -- -p tsconfig.app.json --noEmit` | pending |
| 02-09-T3 | 02-09 / 5 | Task 3: Prove Locate combobox and camera independence in Chrome | F1.2, F1.4, F3.1, F3.2, F3.5, NFR5, NFR9, NFR11 | tests/e2e/locate.spec.ts, tests/e2e/fixtures/locate.html | `npm run test:e2e -- --project=chrome --grep "Locate Country\|country search"` | pending |
| 02-10-T1 | 02-10 / 2 | Task 1: Compose effective scenes and reconcile active interaction identities | F1.2, F1.3, F1.5, F2.2, F2.4, F4.1, F4.2, F4.3, F4.4, F4.5, NFR9 | src/utils/scene.test.ts, src/utils/scene.ts | `npm test -- src/utils/scene.test.ts src/utils/colors.test.ts` | pending |
| 02-10-T2 | 02-10 / 2 | Task 2: Reconcile and validate deterministic legends | F1.2, F1.3, F1.5, F2.2, F2.4, F4.1, F4.2, F4.3, F4.4, F4.5, NFR9 | src/utils/legend.test.ts, src/utils/legend.ts | `npm test -- src/utils/legend.test.ts && npm run lint && npm exec tsc -- -p tsconfig.app.json --noEmit` | pending |
| 02-11-T1 | 02-11 / 3 | Task 1: Implement legend disclosure and editor semantics | F4.1, F4.2, F4.3, F4.4, F4.5, F5.2, NFR11 | src/components/LegendDisclosure.tsx, src/components/LegendEditor.tsx, src/components/LegendEditor.test.tsx | `npm test -- src/components/LegendEditor.test.tsx src/utils/legend.test.ts && npm run lint && npm exec tsc -- -p tsconfig.app.json --noEmit` | pending |
| 02-11-T2 | 02-11 / 3 | Task 2: Render the export-safe SVG legend and pointer movement | F4.1, F4.2, F4.3, F4.4, F4.5, F5.2, NFR11 | src/components/LegendOverlay.tsx, src/components/LegendEditor.test.tsx | `npm test -- src/components/LegendEditor.test.tsx src/utils/legend.test.ts && npm run build` | pending |
| 02-11-T3 | 02-11 / 3 | Task 3: Prove legend focus, drag, reorder, and blocking in Chrome | F4.1, F4.2, F4.3, F4.4, F4.5, F5.2, NFR11 | tests/e2e/legend.spec.ts, tests/e2e/fixtures/legend.html | `npm run test:e2e -- --project=chrome --grep "legend"` | pending |
| 02-12-T1 | 02-12 / 3 | Task 1: Validate source readiness, six regions, assets, and durable approvals | F2.1, F2.2, F2.4, F2.5, NFR3, NFR8, NFR9 | src/utils/historicalValidation.test.ts, src/utils/historicalValidation.ts | `npm test -- src/utils/historicalValidation.test.ts src/utils/scene.test.ts` | pending |
| 02-12-T2 | 02-12 / 3 | Task 2: Implement the offline historical CLI for vector and manual-trace modes | F2.1, F2.2, F2.4, F2.5, NFR3, NFR8, NFR9 | scripts/prepareHistoricalSnapshot.mjs, src/utils/historicalPreparationCli.test.ts, src/utils/fixtures/historicalSnapshot.ts, public/data/snapshots/index.json | `npm test -- src/utils/historicalPreparationCli.test.ts && node scripts/prepareHistoricalSnapshot.mjs --help && npm run lint` | pending |
| 02-12-T3 | 02-12 / 3 | Task 3: Implement reviewed snapshot caching and failure retention | F2.1, F2.2, F2.4, F2.5, NFR3, NFR8, NFR9 | src/hooks/useSnapshotData.ts, src/hooks/useSnapshotData.test.tsx | `npm test -- src/hooks/useSnapshotData.test.tsx src/utils/historicalValidation.test.ts src/utils/scene.test.ts && npm exec tsc -- -p tsconfig.app.json --noEmit` | pending |
| 02-13-T1 | 02-13 / 6 | Task 1: Generate the 1492 candidate and review atlas | F2.1, F2.2, F2.3, F2.4, F2.5, NFR8, NFR9 | data/historical-reviewed/1492.geojson, data/historical-reviewed/1492.review.json, data/historical-reviewed/1492.review.html | `node scripts/prepareHistoricalSnapshot.mjs --snapshot 1492 --sources sources/historical/1492.sources.json --input sources/historical/1492.input.geojson --output data/historical-reviewed/1492.geojson --review-output data/historical-reviewed/1492.review.json --review-html data/historical-reviewed/1492.review.html` | pending |
| 02-13-T2 | 02-13 / 6 | Task 2: Create the unsigned exact 1492 approval request | F2.1, F2.2, F2.3, F2.4, F2.5, NFR8, NFR9 | data/historical-reviewed/1492.approval-request.json | `node scripts/prepareHistoricalSnapshot.mjs --snapshot 1492 --sources sources/historical/1492.sources.json --input sources/historical/1492.input.geojson --output data/historical-reviewed/1492.geojson --review-output data/historical-reviewed/1492.review.json --review-html data/historical-reviewed/1492.review.html --check && npm test -- src/utils/historicalValidation.test.ts` | pending |
| 02-14-T1 | 02-14 / 6 | Task 1: Generate the 1700 candidate and review atlas | F2.1, F2.2, F2.3, F2.4, F2.5, NFR8, NFR9 | data/historical-reviewed/1700.geojson, data/historical-reviewed/1700.review.json, data/historical-reviewed/1700.review.html | `node scripts/prepareHistoricalSnapshot.mjs --snapshot 1700 --sources sources/historical/1700.sources.json --input sources/historical/1700.input.geojson --output data/historical-reviewed/1700.geojson --review-output data/historical-reviewed/1700.review.json --review-html data/historical-reviewed/1700.review.html` | pending |
| 02-14-T2 | 02-14 / 6 | Task 2: Create the unsigned exact 1700 approval request | F2.1, F2.2, F2.3, F2.4, F2.5, NFR8, NFR9 | data/historical-reviewed/1700.approval-request.json | `node scripts/prepareHistoricalSnapshot.mjs --snapshot 1700 --sources sources/historical/1700.sources.json --input sources/historical/1700.input.geojson --output data/historical-reviewed/1700.geojson --review-output data/historical-reviewed/1700.review.json --review-html data/historical-reviewed/1700.review.html --check && npm test -- src/utils/historicalValidation.test.ts` | pending |
| 02-15-T1 | 02-15 / 6 | Task 1: Generate the 1815 candidate and review atlas | F2.1, F2.2, F2.3, F2.4, F2.5, NFR8, NFR9 | data/historical-reviewed/1815.geojson, data/historical-reviewed/1815.review.json, data/historical-reviewed/1815.review.html | `node scripts/prepareHistoricalSnapshot.mjs --snapshot 1815 --sources sources/historical/1815.sources.json --input sources/historical/1815.input.geojson --output data/historical-reviewed/1815.geojson --review-output data/historical-reviewed/1815.review.json --review-html data/historical-reviewed/1815.review.html` | pending |
| 02-15-T2 | 02-15 / 6 | Task 2: Create the unsigned exact 1815 approval request | F2.1, F2.2, F2.3, F2.4, F2.5, NFR8, NFR9 | data/historical-reviewed/1815.approval-request.json | `node scripts/prepareHistoricalSnapshot.mjs --snapshot 1815 --sources sources/historical/1815.sources.json --input sources/historical/1815.input.geojson --output data/historical-reviewed/1815.geojson --review-output data/historical-reviewed/1815.review.json --review-html data/historical-reviewed/1815.review.html --check && npm test -- src/utils/historicalValidation.test.ts` | pending |
| 02-16-T1 | 02-16 / 6 | Task 1: Generate the 1914 candidate and review atlas | F2.1, F2.2, F2.3, F2.4, F2.5, NFR8, NFR9 | data/historical-reviewed/1914.geojson, data/historical-reviewed/1914.review.json, data/historical-reviewed/1914.review.html | `node scripts/prepareHistoricalSnapshot.mjs --snapshot 1914 --sources sources/historical/1914.sources.json --input sources/historical/1914.input.geojson --output data/historical-reviewed/1914.geojson --review-output data/historical-reviewed/1914.review.json --review-html data/historical-reviewed/1914.review.html` | pending |
| 02-16-T2 | 02-16 / 6 | Task 2: Create the unsigned exact 1914 approval request | F2.1, F2.2, F2.3, F2.4, F2.5, NFR8, NFR9 | data/historical-reviewed/1914.approval-request.json | `node scripts/prepareHistoricalSnapshot.mjs --snapshot 1914 --sources sources/historical/1914.sources.json --input sources/historical/1914.input.geojson --output data/historical-reviewed/1914.geojson --review-output data/historical-reviewed/1914.review.json --review-html data/historical-reviewed/1914.review.html --check && npm test -- src/utils/historicalValidation.test.ts` | pending |
| 02-17-T1 | 02-17 / 9 | Task 1: Publish and verify approved overlays while unlisted | F2.1, F2.2, F2.3, F2.4, F2.5, NFR3, NFR8, NFR9 | public/data/snapshots/1492.geojson, public/data/snapshots/1700.geojson, public/data/snapshots/1815.geojson, public/data/snapshots/1914.geojson | `for id in 1492 1700 1815 1914; do node scripts/prepareHistoricalSnapshot.mjs --snapshot "$id" --sources "sources/historical/$id.sources.json" --input "sources/historical/$id.input.geojson" --output "public/data/snapshots/$id.geojson" --review-output "data/historical-reviewed/$id.review.json" --review-html "data/historical-reviewed/$id.review.html" --approval "data/historical-reviewed/$id.approval.json" --check \|\| exit 1; done && npm test -- src/utils/historicalValidation.test.ts src/utils/scene.test.ts` | pending |
| 02-17-T2 | 02-17 / 9 | Task 2: Atomically update the production catalog last | F2.1, F2.2, F2.3, F2.4, F2.5, NFR3, NFR8, NFR9 | public/data/snapshots/index.json | `npm test -- src/utils/historicalValidation.test.ts src/utils/scene.test.ts && node -e "const fs=require('node:fs'),c=require('node:crypto'),x=require('./public/data/snapshots/index.json'); const req=['poland','lithuania','hungary','balkans','iberia','scandinavia']; if(x.snapshots.length!==5)process.exit(1); for(const s of x.snapshots.filter(v=>v.id!=='modern')){if(s.reviewStatus!=='historian-reviewed'\|\|JSON.stringify(s.coverageRecords.map(r=>r.id).sort())!==JSON.stringify([...req].sort()))process.exit(1); const p='public'+s.assetPath; if(c.createHash('sha256').update(fs.readFileSync(p)).digest('hex')!==s.sha256)process.exit(1);}"` | pending |
| 02-18-T1 | 02-18 / 10 | Task 1: Build exact composition bar and world loading/fatal/recovery states | F1.2, F1.3, F1.5, F2.1, F2.2, F2.3, F2.4, F2.5, F5.2, NFR3, NFR8, NFR9, NFR11 | src/components/CompositionBar.tsx, src/components/FatalErrorState.tsx, src/components/MapWorkspace.test.tsx | `npm test -- src/components/MapWorkspace.test.tsx` | pending |
| 02-18-T2 | 02-18 / 10 | Task 2: Compose accessible historical scenes and reconcile interaction | F1.2, F1.3, F1.5, F2.1, F2.2, F2.3, F2.4, F2.5, F5.2, NFR3, NFR8, NFR9, NFR11 | src/components/MapCanvas.tsx, src/components/MapWorkspace.tsx, src/components/MapWorkspace.test.tsx | `npm test -- src/components/MapWorkspace.test.tsx src/utils/scene.test.ts src/components/MapCanvas.test.tsx && npm run lint` | pending |
| 02-18-T3 | 02-18 / 10 | Task 3: Add period tooltip and multi-sample warm-switch Chrome gate | F1.2, F1.3, F1.5, F2.1, F2.2, F2.3, F2.4, F2.5, F5.2, NFR3, NFR8, NFR9, NFR11 | src/components/Tooltip.tsx, src/components/MapWorkspace.test.tsx, tests/e2e/history.spec.ts, tests/e2e/fixtures/history.html | `npm test -- src/components/MapWorkspace.test.tsx src/utils/historicalValidation.test.ts && npm run build && npm run test:e2e -- --project=chrome --grep "snapshot switch\|historical entity\|world loading"` | pending |
| 02-19-T1 | 02-19 / 4 | Task 1: Implement the bounded V1/V2 composition storage authority | F6.1, F6.2, F4.3, F4.4, F4.5, NFR11 | src/utils/storage.ts, src/utils/storage.test.ts, src/hooks/useLocalStorage.ts | `npm test -- src/utils/storage.test.ts && npm run lint && npm exec tsc -- -p tsconfig.app.json --noEmit` | pending |
| 02-20-T1 | 02-20 / 11 | Task 1: Implement complete-composition Save/Load states and focus | F6.1, F6.2, F4.3, F4.4, F4.5, NFR5, NFR7, NFR11 | src/components/SaveLoad.tsx, src/components/SaveLoad.test.tsx | `npm test -- src/components/SaveLoad.test.tsx src/utils/storage.test.ts src/hooks/useCompositionSaveTransaction.test.tsx && npm run lint && npm exec tsc -- -p tsconfig.app.json --noEmit` | pending |
| 02-20-T2 | 02-20 / 11 | Task 2: Prove live-camera persistence and focus in Chrome | F6.1, F6.2, F4.3, F4.4, F4.5, NFR5, NFR7, NFR11 | tests/e2e/persistence.spec.ts, tests/e2e/fixtures/persistence.html | `npm run test:e2e -- --project=chrome --grep "save during\|complete composition\|Saved Maps"` | pending |
| 02-21-T1 | 02-21 / 11 | Task 1: Implement exact prepared-composition export sanitization | F5.1, F5.2, F5.3, F5.5, NFR4 | src/utils/export.ts, src/utils/export.test.ts | `npm test -- src/utils/export.test.ts && npm run lint && npm exec tsc -- -p tsconfig.app.json --noEmit && npm run build` | pending |
| 02-21-T2 | 02-21 / 11 | Task 2: Prove Pacific clone/download behavior in Chrome | F5.1, F5.2, F5.3, F5.5, NFR4 | tests/e2e/export.spec.ts, tests/e2e/fixtures/export.html | `npm run test:e2e -- --project=chrome --grep "export\|Pacific"` | pending |
| 02-22-T1 | 02-22 / 12 | Task 1: Implement exact global actions and header hierarchy | F1.5, F1.6, F5.1, F5.2, F6.1, F6.2, NFR5, NFR6, NFR7, NFR11 | src/components/AppHeader.tsx, src/components/Controls.tsx, src/components/Controls.test.tsx | `npm test -- src/components/Controls.test.tsx && npm run lint` | pending |
| 02-22-T2 | 02-22 / 12 | Task 2: Update onboarding and prove the complete creator-safe status allowlist | F1.5, F1.6, F5.1, F5.2, F6.1, F6.2, NFR5, NFR6, NFR7, NFR11 | src/components/OnboardingBanner.tsx, src/components/ToastRegion.tsx, src/components/ToastRegion.test.tsx | `npm test -- src/components/ToastRegion.test.tsx src/components/Controls.test.tsx && npm exec tsc -- -p tsconfig.app.json --noEmit` | pending |
| 02-23-T1 | 02-23 / 13 | Task 1: Compose providers, UI, and delegated transactions | F1.1, F1.2, F1.3, F1.4, F1.5, F1.6, F2.1, F2.2, F2.4, F3.1, F3.2, F3.3, F3.4, F3.5, F4.1, F4.2, F4.3, F4.4, F4.5, F5.1, F5.2, F5.3, F5.5, F6.1, F6.2, F7.1, F7.2, F7.3, NFR5, NFR6, NFR7, NFR9, NFR10, NFR11 | src/App.tsx, src/App.test.tsx, src/main.tsx | `npm test -- src/App.test.tsx src/hooks/useCompositionLoadTransaction.test.tsx src/hooks/useCompositionSaveTransaction.test.tsx src/hooks/useCompositionExportTransaction.test.tsx src/components/MapWorkspace.test.tsx src/components/SaveLoad.test.tsx && npm run lint && npm exec tsc -- -p tsconfig.app.json --noEmit && npm run build` | pending |
| 02-23-T2 | 02-23 / 13 | Task 2: Prove integrated live-camera transactions and remount recovery in Chrome | F1.1, F1.2, F1.3, F1.4, F1.5, F1.6, F2.1, F2.2, F2.4, F3.1, F3.2, F3.3, F3.4, F3.5, F4.1, F4.2, F4.3, F4.4, F4.5, F5.1, F5.2, F5.3, F5.5, F6.1, F6.2, F7.1, F7.2, F7.3, NFR5, NFR6, NFR7, NFR9, NFR10, NFR11 | tests/e2e/transactions.spec.ts | `npm run test:e2e -- --project=chrome --grep "transaction\|responsive remount\|historical color history"` | pending |
| 02-24-T1 | 02-24 / 14 | Task 1: Implement exact tokens and preference fallbacks | F3.4, F4.2, F4.4, F4.5, F5.2, NFR5, NFR7, NFR11 | src/styles/theme.css, src/styles/phase2CssContract.test.ts | `npm test -- src/styles/phase2CssContract.test.ts && npm run lint && npm run build` | pending |
| 02-24-T2 | 02-24 / 14 | Task 2: Implement responsive map-first layout and inspector | F3.4, F4.2, F4.4, F4.5, F5.2, NFR5, NFR7, NFR11 | src/styles/App.css, src/styles/Controls.css, src/styles/phase2CssContract.test.ts, tests/e2e/responsive.spec.ts | `npm test -- src/styles/phase2CssContract.test.ts src/App.test.tsx src/components/Controls.test.tsx src/components/SaveLoad.test.tsx && npm run build && npm run test:e2e -- --project=chrome --grep "responsive\|360\|200%\|preference"` | pending |
| 02-24-T3 | 02-24 / 14 | Task 3: Style world paths, camera controls, tooltip, legend, and export isolation | F3.4, F4.2, F4.4, F4.5, F5.2, NFR5, NFR7, NFR11 | src/styles/MapCanvas.css, src/styles/Controls.css, src/styles/phase2CssContract.test.ts | `npm test -- src/styles/phase2CssContract.test.ts src/components/MapWorkspace.test.tsx src/components/LegendEditor.test.tsx && npm run build` | pending |
| 02-25-T1 | 02-25 / 15 | Task 1: Materialize exact subsystem and authority-document proposals | F2.1, F2.2, F3.1, F3.2, F4.2, F5.2, F6.1, F7.1, F7.2, F7.3, NFR11 | .planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-CODING-RULES-PROPOSAL.patch, .planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-AUTHORITY-DOCS-PROPOSAL.patch | `git apply --check --whitespace=error-all .planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-CODING-RULES-PROPOSAL.patch && git apply --check --whitespace=error-all .planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-AUTHORITY-DOCS-PROPOSAL.patch && npm run lint && npm test && npm run build` | pending |
| 02-25-T2 | 02-25 / 15 | Task 2: Approve both complete exact proposal artifacts | F2.1, F2.2, F3.1, F3.2, F4.2, F5.2, F6.1, F7.1, F7.2, F7.3, NFR11 | none | `sha256sum .planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-CODING-RULES-PROPOSAL.patch .planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-AUTHORITY-DOCS-PROPOSAL.patch` | pending |
| 02-26-T1 | 02-26 / 16 | Task 1: Apply and prove approved coding-rule Patch A exactly | F2.1, F2.2, F4.2, F5.2, F6.1, F6.2, NFR11 | .planning/CODING_RULES.md, .planning/coding-rules/frontend.md, .planning/coding-rules/data.md, .planning/coding-rules/export.md, .planning/coding-rules/storage.md | `npm test -- src/utils/camera.test.ts src/utils/worldDataAsset.test.ts src/utils/historicalValidation.test.ts src/utils/export.test.ts src/utils/storage.test.ts && npm run lint && npm exec tsc -- -b --pretty false && npm run build` | pending |
| 02-27-T1 | 02-27 / 17 | Task 1: Complete cross-domain E2E and exact-commit gate tooling | F1.1, F1.2, F1.3, F1.4, F1.5, F1.6, F2.1, F2.2, F2.3, F2.4, F2.5, F3.1, F3.2, F3.3, F3.4, F3.5, F4.1, F4.2, F4.3, F4.4, F4.5, F5.1, F5.2, F5.3, F5.5, F6.1, F6.2, F7.1, F7.2, F7.3, NFR1, NFR2, NFR3, NFR4, NFR5, NFR6, NFR7, NFR8, NFR9, NFR10, NFR11 | tests/e2e/final-integration.spec.ts, scripts/verifyPhase2ExactCommit.mjs | `npm run test:e2e -- --project=chrome && node scripts/verifyPhase2ExactCommit.mjs --help` | pending |
| 02-27-T2 | 02-27 / 17 | Task 2: Verify the final E2E commit in a fresh detached worktree | F1.1, F1.2, F1.3, F1.4, F1.5, F1.6, F2.1, F2.2, F2.3, F2.4, F2.5, F3.1, F3.2, F3.3, F3.4, F3.5, F4.1, F4.2, F4.3, F4.4, F4.5, F5.1, F5.2, F5.3, F5.5, F6.1, F6.2, F7.1, F7.2, F7.3, NFR1, NFR2, NFR3, NFR4, NFR5, NFR6, NFR7, NFR8, NFR9, NFR10, NFR11 | .planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-27-EXACT-COMMIT.json | `node scripts/verifyPhase2ExactCommit.mjs --sha "$(git rev-parse HEAD)" --evidence .planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-27-EXACT-COMMIT.json` | pending |
| 02-28-T1 | 02-28 / 18 | Task 1: Start a reproducible preview from the exact verified SHA | F2.1, F2.2, F2.3, F2.4, F2.5, F3.2, F3.4, F4.2, F4.3, F4.4, F4.5, F5.2, F7.1, F7.2, F7.3, NFR3, NFR5, NFR7, NFR8, NFR11 | none | `node -e "const fs=require('node:fs');const e=JSON.parse(fs.readFileSync('.planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-27-EXACT-COMMIT.json','utf8'));if(e.status!=='PASS'\|\|!/^[0-9a-f]{40}$/.test(e.verifiedSha))process.exit(1);"` | pending |
| 02-28-T2 | 02-28 / 18 | Task 2: Complete the fixed Phase 2 acceptance matrix | F2.1, F2.2, F2.3, F2.4, F2.5, F3.2, F3.4, F4.2, F4.3, F4.4, F4.5, F5.2, F7.1, F7.2, F7.3, NFR3, NFR5, NFR7, NFR8, NFR11 | none | `node -e "const fs=require('node:fs');const e=JSON.parse(fs.readFileSync('.planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-27-EXACT-COMMIT.json','utf8'));if(e.status!=='PASS')process.exit(1);"` | pending |
| 02-29-T1 | 02-29 / 5 | Task 1: Implement atomic composition load transaction | F1.5, F2.2, F4.3, F4.4, F4.5, F6.1, F6.2, NFR11 | src/hooks/useCompositionLoadTransaction.ts, src/hooks/useCompositionLoadTransaction.test.tsx | `npm test -- src/hooks/useCompositionLoadTransaction.test.tsx src/utils/storage.test.ts src/hooks/useSnapshotData.test.tsx` | pending |
| 02-29-T2 | 02-29 / 5 | Task 2: Implement live-camera save transaction | F1.5, F2.2, F4.3, F4.4, F4.5, F6.1, F6.2, NFR11 | src/hooks/useCompositionSaveTransaction.ts, src/hooks/useCompositionSaveTransaction.test.tsx | `npm test -- src/hooks/useCompositionSaveTransaction.test.tsx src/utils/storage.test.ts && npm run lint && npm exec tsc -- -p tsconfig.app.json --noEmit` | pending |
| 02-30-T1 | 02-30 / 12 | Task 1: Implement and prove the complete export lease transaction | F5.1, F5.2, F5.3, F5.5, NFR4, NFR11 | src/hooks/useCompositionExportTransaction.ts, src/hooks/useCompositionExportTransaction.test.tsx | `npm test -- src/hooks/useCompositionExportTransaction.test.tsx src/utils/export.test.ts src/hooks/useCompositionSaveTransaction.test.tsx && npm run lint && npm exec tsc -- -p tsconfig.app.json --noEmit` | pending |
| 02-31-T1 | 02-31 / 4 | Task 1: Assemble and validate the 1492 source/license bundle | F2.1, F2.3, F2.4, NFR8, NFR9 | sources/historical/1492.sources.json, sources/historical/1492.evidence.zip, sources/historical/1492.input.geojson | `node scripts/prepareHistoricalSnapshot.mjs --snapshot 1492 --sources sources/historical/1492.sources.json --validate-sources` | pending |
| 02-31-T2 | 02-31 / 4 | Task 2: Assemble and validate the 1700 source/license bundle | F2.1, F2.3, F2.4, NFR8, NFR9 | sources/historical/1700.sources.json, sources/historical/1700.evidence.zip, sources/historical/1700.input.geojson | `node scripts/prepareHistoricalSnapshot.mjs --snapshot 1700 --sources sources/historical/1700.sources.json --validate-sources` | pending |
| 02-32-T1 | 02-32 / 4 | Task 1: Assemble and validate the 1815 source/license bundle | F2.1, F2.3, F2.4, NFR8, NFR9 | sources/historical/1815.sources.json, sources/historical/1815.evidence.zip, sources/historical/1815.input.geojson | `node scripts/prepareHistoricalSnapshot.mjs --snapshot 1815 --sources sources/historical/1815.sources.json --validate-sources` | pending |
| 02-32-T2 | 02-32 / 4 | Task 2: Assemble and validate the 1914 source/license bundle | F2.1, F2.3, F2.4, NFR8, NFR9 | sources/historical/1914.sources.json, sources/historical/1914.evidence.zip, sources/historical/1914.input.geojson | `node scripts/prepareHistoricalSnapshot.mjs --snapshot 1914 --sources sources/historical/1914.sources.json --validate-sources` | pending |
| 02-33-T1 | 02-33 / 5 | Task 1: Approve exact historical source and license readiness | F2.1, F2.3, F2.4, NFR8 | none | `for id in 1492 1700 1815 1914; do node scripts/prepareHistoricalSnapshot.mjs --snapshot "$id" --sources "sources/historical/$id.sources.json" --validate-sources \|\| exit 1; done` | pending |
| 02-34-T1 | 02-34 / 7 | Task 1: Review all exact historical candidates and provide structured approval | F2.1, F2.2, F2.3, F2.4, F2.5, NFR8, NFR9 | none | `for id in 1492 1700 1815 1914; do node scripts/prepareHistoricalSnapshot.mjs --snapshot "$id" --sources "sources/historical/$id.sources.json" --input "sources/historical/$id.input.geojson" --output "data/historical-reviewed/$id.geojson" --review-output "data/historical-reviewed/$id.review.json" --review-html "data/historical-reviewed/$id.review.html" --check \|\| exit 1; done` | pending |
| 02-35-T1 | 02-35 / 8 | Task 1: Materialize and verify all four durable approval records | F2.1, F2.2, F2.3, F2.4, F2.5, NFR8, NFR9 | data/historical-reviewed/1492.approval.json, data/historical-reviewed/1700.approval.json, data/historical-reviewed/1815.approval.json, data/historical-reviewed/1914.approval.json | `for id in 1492 1700 1815 1914; do node scripts/prepareHistoricalSnapshot.mjs --snapshot "$id" --sources "sources/historical/$id.sources.json" --input "sources/historical/$id.input.geojson" --output "data/historical-reviewed/$id.geojson" --review-output "data/historical-reviewed/$id.review.json" --review-html "data/historical-reviewed/$id.review.html" --approval "data/historical-reviewed/$id.approval.json" --check \|\| exit 1; done && npm test -- src/utils/historicalValidation.test.ts` | pending |
| 02-36-T1 | 02-36 / 16 | Task 1: Apply and prove approved authority-document Patch B exactly | F2.1, F2.2, F3.1, F3.2, F7.1, F7.2, F7.3, NFR11 | CLAUDE.md, .planning/coding-rules/general.md, .planning/REQUIREMENTS.md | `npm run lint && npm test && npm run build` | pending |

## Required Test and Evidence Ownership

- `tests/e2e/phase2-composition.spec.ts` — Plan 02-01 pre-cutover Phase 1 result, then Plan 02-07 replacement with 195 logical selectable core states and 248 visible world units plus camera lifecycle.
- `tests/e2e/navigation.spec.ts`, `locate.spec.ts`, `legend.spec.ts`, `history.spec.ts`, `persistence.spec.ts`, `export.spec.ts`, `transactions.spec.ts`, `responsive.spec.ts` — focused installed-Chrome slices in owning plans.
- `tests/e2e/final-integration.spec.ts` — cross-domain assertions only; Plan 02-27 aggregates all specs in Chrome and Edge.
- `src/utils/historicalValidation.test.ts` and `historicalPreparationCli.test.ts` — source readiness, vector/manual modes, six regions, self-approval rejection, five exact hashes, stale-byte invalidation, and offline checks.
- `data/historical-reviewed/{id}.approval.json` — durable reviewer name/role/date, six decisions/uncertainties, and source/input/output/review JSON/review HTML hashes.
- `src/utils/storage.test.ts` — raw serialized limit before parse, iterative depth/node budget, V1/V2, historical IDs, partial recovery, quota/unavailable, one writer.
- `src/hooks/useCompositionSaveTransaction.test.tsx`, `useCompositionLoadTransaction.test.tsx`, `useCompositionExportTransaction.test.tsx` — live camera save, atomic load, freeze settlement, outermost-finally release, success/failure/remount/post-release input.
- `.planning/phases/02-region-variants-advanced-features-1-5-2-weeks/02-27-EXACT-COMMIT.json` — exact verified SHA, fresh-install gate results, browser versions, data/approval/PNG hashes, and worktree cleanup status.

## Manual-Only Acceptance

| Behavior | Requirements / decisions | Blocking evidence |
|---|---|---|
| Source/license readiness | F2.1, F2.3, NFR8 | Named reviewer/role/date and PASS for all 24 snapshot-region source records; manual tracing requires evidence/procedure/operator/input hashes |
| Historical factual accuracy | F2.3, NFR8, D-20–D-22 | Named qualified non-executor reviewer, six decisions per snapshot, uncertainties, and exact five-hash approval artifact |
| Physical multitouch | D-03, D-06, NFR11 | Real device one-finger pan/pinch/date-line/pole/no-selection; UNAVAILABLE is not PASS |
| Screen reader/focus | D-06, NFR11 | Named screen reader/version/browser route through map, camera, period, legend, Save/Load, export |
| Visual/responsive/preferences | NFR5, NFR7, NFR11 | Exact SHA at 1440/1024/768/360, 200%, light/dark/reduced motion/transparency/contrast/forced colors |
| Exact downloaded PNG | D-07–D-11, F5.2 | Chrome and Edge normal/Pacific/during-Locate/during-crossfade files with names, 1080×1080 dimensions, SHA-256, visible wrapped geometry, no editor semantics |

## Dependency and Supply-Chain Gates

- Only audited exact `mapshaper@0.7.48` and `@playwright/test@1.61.1`; no managed browser download.
- Plans 02-31/32 assemble source bundles; Plan 02-33 approves rights/readiness; Plans 02-13–16 generate unapproved candidates; Plan 02-34 obtains qualified factual review; Plan 02-35 seals durable approvals; Plan 02-17 promotes catalog last.
- A blocked source or failed factual cell stops the dependency chain. It is excluded from delivery claims rather than silently omitted or reduced.
- Plans 02-25/26/36 use two complete hash-approved mechanical documentation patches; no target document changes before approval.
- Plan 02-27 verifies only the exact final E2E commit in a detached worktree with fresh `npm ci`; current/untracked workspace files cannot influence PASS.
- Plan 02-28 previews and accepts the same verified SHA and requires the fixed matrix; generic approval is invalid.

## Multi-Source Coverage Audit

### Goal

| Source | ID | Item | Plan coverage | Status |
|---|---|---|---|---|
| GOAL | — | One local wrapped-world composer with pan/zoom/Locate, approved history, editable export-safe legend, complete live-camera saves, and exact visible PNG | 02-02 through 02-30; evidence gates 02-31 through 02-36 | COVERED |

### Requirements

| Source | ID | Plan coverage | Status |
|---|---|---|---|
| REQ | F1.1 | 02-07, 02-23, 02-27 | COVERED |
| REQ | F1.2 | 02-07, 02-09, 02-10, 02-18, 02-23, 02-27 | COVERED |
| REQ | F1.3 | 02-10, 02-18, 02-23, 02-27 | COVERED |
| REQ | F1.4 | 02-09, 02-23, 02-27 | COVERED |
| REQ | F1.5 | 02-10, 02-18, 02-22, 02-23, 02-27, 02-29 | COVERED |
| REQ | F1.6 | 02-22, 02-23, 02-27 | COVERED |
| REQ | F2.1 | 02-02, 02-12, 02-13, 02-14, 02-15, 02-16, 02-17, 02-18, 02-23, 02-25, 02-26, 02-27, 02-28, 02-31, 02-32, 02-33, 02-34, 02-35, 02-36 | COVERED |
| REQ | F2.2 | 02-02, 02-10, 02-12, 02-13, 02-14, 02-15, 02-16, 02-17, 02-18, 02-23, 02-25, 02-26, 02-27, 02-28, 02-29, 02-34, 02-35, 02-36 | COVERED |
| REQ | F2.3 | 02-13, 02-14, 02-15, 02-16, 02-17, 02-18, 02-27, 02-28, 02-31, 02-32, 02-33, 02-34, 02-35 | COVERED |
| REQ | F2.4 | 02-02, 02-10, 02-12, 02-13, 02-14, 02-15, 02-16, 02-17, 02-18, 02-23, 02-27, 02-28, 02-31, 02-32, 02-33, 02-34, 02-35 | COVERED |
| REQ | F2.5 | 02-12, 02-13, 02-14, 02-15, 02-16, 02-17, 02-18, 02-27, 02-28, 02-34, 02-35 | COVERED |
| REQ | F3.1 | 02-02, 02-06, 02-09, 02-23, 02-25, 02-27, 02-36 | COVERED |
| REQ | F3.2 | 02-02, 02-06, 02-07, 02-08, 02-09, 02-23, 02-25, 02-27, 02-28, 02-36 | COVERED |
| REQ | F3.3 | 02-02, 02-06, 02-08, 02-23, 02-27 | COVERED |
| REQ | F3.4 | 02-02, 02-06, 02-07, 02-08, 02-23, 02-24, 02-27, 02-28 | COVERED |
| REQ | F3.5 | 02-02, 02-06, 02-07, 02-08, 02-09, 02-23, 02-27 | COVERED |
| REQ | F4.1 | 02-02, 02-10, 02-11, 02-23, 02-27 | COVERED |
| REQ | F4.2 | 02-02, 02-10, 02-11, 02-23, 02-24, 02-25, 02-26, 02-27, 02-28 | COVERED |
| REQ | F4.3 | 02-02, 02-03, 02-10, 02-11, 02-19, 02-20, 02-23, 02-27, 02-28, 02-29 | COVERED |
| REQ | F4.4 | 02-02, 02-03, 02-10, 02-11, 02-19, 02-20, 02-23, 02-24, 02-27, 02-28, 02-29 | COVERED |
| REQ | F4.5 | 02-02, 02-03, 02-10, 02-11, 02-19, 02-20, 02-23, 02-24, 02-27, 02-28, 02-29 | COVERED |
| REQ | F5.1 | 02-21, 02-22, 02-23, 02-27, 02-30 | COVERED |
| REQ | F5.2 | 02-11, 02-18, 02-21, 02-22, 02-23, 02-24, 02-25, 02-26, 02-27, 02-28, 02-30 | COVERED |
| REQ | F5.3 | 02-21, 02-23, 02-27, 02-30 | COVERED |
| REQ | F5.5 | 02-21, 02-23, 02-27, 02-30 | COVERED |
| REQ | F6.1 | 02-02, 02-03, 02-19, 02-20, 02-22, 02-23, 02-25, 02-26, 02-27, 02-29 | COVERED |
| REQ | F6.2 | 02-02, 02-03, 02-19, 02-20, 02-22, 02-23, 02-26, 02-27, 02-29 | COVERED |
| REQ | F7.1 | 02-01, 02-02, 02-04, 02-05, 02-06, 02-07, 02-23, 02-25, 02-27, 02-28, 02-36 | COVERED |
| REQ | F7.2 | 02-01, 02-02, 02-04, 02-05, 02-06, 02-07, 02-23, 02-25, 02-27, 02-28, 02-36 | COVERED |
| REQ | F7.3 | 02-01, 02-02, 02-04, 02-05, 02-06, 02-07, 02-23, 02-25, 02-27, 02-28, 02-36 | COVERED |
| REQ | NFR1 | 02-05, 02-07, 02-27 | COVERED |
| REQ | NFR2 | 02-07, 02-27 | COVERED |
| REQ | NFR3 | 02-12, 02-17, 02-18, 02-27, 02-28 | COVERED |
| REQ | NFR4 | 02-21, 02-27, 02-30 | COVERED |
| REQ | NFR5 | 02-09, 02-20, 02-22, 02-23, 02-24, 02-27, 02-28 | COVERED |
| REQ | NFR6 | 02-22, 02-23, 02-27 | COVERED |
| REQ | NFR7 | 02-20, 02-22, 02-23, 02-24, 02-27, 02-28 | COVERED |
| REQ | NFR8 | 02-12, 02-13, 02-14, 02-15, 02-16, 02-17, 02-18, 02-27, 02-28, 02-31, 02-32, 02-33, 02-34, 02-35 | COVERED |
| REQ | NFR9 | 02-02, 02-04, 02-05, 02-09, 02-10, 02-12, 02-13, 02-14, 02-15, 02-16, 02-17, 02-18, 02-23, 02-27, 02-31, 02-32, 02-34, 02-35 | COVERED |
| REQ | NFR10 | 02-23, 02-27 | COVERED |
| REQ | NFR11 | 02-01, 02-02, 02-03, 02-06, 02-07, 02-08, 02-09, 02-11, 02-18, 02-19, 02-20, 02-22, 02-23, 02-24, 02-25, 02-26, 02-27, 02-28, 02-29, 02-30, 02-36 | COVERED |

### Context Decisions

| Source | ID | Plan coverage | Status |
|---|---|---|---|
| CONTEXT | D-01 | 02-01, 02-02, 02-04, 02-05, 02-06, 02-23, 02-25, 02-36 | COVERED |
| CONTEXT | D-02 | 02-06 | COVERED |
| CONTEXT | D-03 | 02-07 | COVERED |
| CONTEXT | D-04 | 02-06, 02-07 | COVERED |
| CONTEXT | D-05 | 02-06 | COVERED |
| CONTEXT | D-06 | 02-02, 02-07, 02-08 | COVERED |
| CONTEXT | D-07 | 02-02, 02-21, 02-22 | COVERED |
| CONTEXT | D-08 | 02-21, 02-24 | COVERED |
| CONTEXT | D-09 | 02-02, 02-07 | COVERED |
| CONTEXT | D-10 | 02-11, 02-21, 02-24 | COVERED |
| CONTEXT | D-11 | 02-21, 02-22 | COVERED |
| CONTEXT | D-12 | 02-02, 02-04, 02-05, 02-07, 02-09 | COVERED |
| CONTEXT | D-13 | 02-04, 02-05, 02-10 | COVERED |
| CONTEXT | D-14 | 02-04 | COVERED |
| CONTEXT | D-15 | 02-04, 02-05, 02-06, 02-07, 02-09 | COVERED |
| CONTEXT | D-16 | 02-02, 02-09 | COVERED |
| CONTEXT | D-17 | 02-03, 02-06, 02-08, 02-22 | COVERED |
| CONTEXT | D-18 | 02-02, 02-03, 02-22, 02-23 | COVERED |
| CONTEXT | D-19 | 02-02, 02-03, 02-07, 02-19, 02-20, 02-23, 02-29 | COVERED |
| CONTEXT | D-20 | 02-12, 02-13, 02-17, 02-18, 02-25, 02-36 | COVERED |
| CONTEXT | D-21 | 02-10, 02-13, 02-14, 02-15, 02-16, 02-18 | COVERED |
| CONTEXT | D-22 | 02-02, 02-09, 02-10, 02-13, 02-14, 02-15, 02-16, 02-18, 02-19 | COVERED |
| CONTEXT | D-23 | 02-18 | COVERED |
| CONTEXT | D-24 | 02-10, 02-11 | COVERED |
| CONTEXT | D-25 | 02-11 | COVERED |
| CONTEXT | D-26 | 02-11 | COVERED |
| CONTEXT | D-27 | 02-10, 02-11 | COVERED |
| CONTEXT | D-28 | 02-01, 02-05, 02-22 | COVERED |
| CONTEXT | D-29 | 02-02, 02-03, 02-06, 02-22, 02-23 | COVERED |

### Research and Review Constraints

| Source | Item | Plan coverage | Status |
|---|---|---|---|
| RESEARCH/REVIEWS | Fixed Mercator transform-only wrapped camera | 02-02, 02-06–02-08 | COVERED |
| RESEARCH/REVIEWS | 195 core / 248 unit reviewed modern asset | 02-04, 02-05, 02-07 | COVERED |
| RESEARCH/REVIEWS | Live camera read/freeze/settle/release transaction | 02-02, 02-07, 02-29, 02-30, 02-23 | COVERED |
| RESEARCH/REVIEWS | Historical source/license readiness and honest manual tracing | 02-12, 02-31–02-33 | COVERED |
| RESEARCH/REVIEWS | Durable five-hash qualified factual approval | 02-12, 02-13–02-17, 02-34, 02-35 | COVERED |
| RESEARCH/REVIEWS | Approved historical entity interaction policy | 02-02, 02-07, 02-09, 02-10, 02-18–02-23 | COVERED |
| RESEARCH/REVIEWS | SVG legend outside camera with bounded complete entries | 02-10, 02-11, 02-18, 02-21 | COVERED |
| RESEARCH/REVIEWS | V2 local persistence with pre-parse/depth/node bounds | 02-19, 02-20, 02-29 | COVERED |
| RESEARCH/REVIEWS | Exact wrapped viewport export preserving visible repeat geometry | 02-21, 02-30, 02-23 | COVERED |
| RESEARCH/REVIEWS | Focused Playwright slices and isolated artifacts | 02-01, 02-07–02-11, 02-18, 02-20, 02-21, 02-23, 02-24 | COVERED |
| RESEARCH/REVIEWS | Exact UI-SPEC responsive/accessibility/export styling | 02-18, 02-22–02-24, 02-28 | COVERED |
| RESEARCH/REVIEWS | Detached clean exact-commit final gate | 02-27, 02-28 | COVERED |
| RESEARCH/REVIEWS | Exact proposal/approval documentation flow | 02-25, 02-26, 02-36 | COVERED |
| RESEARCH/REVIEWS | Browser-only localhost-only boundary | all implementation plans; explicitly D-28 | COVERED |

### Exclusions

| Source | Item | Status |
|---|---|---|
| CONTEXT deferred | Animation/video/batch, geometry morphing, textures/overlays, POV switching, markers/insets, cloud/auth/backend/deployment | EXCLUDED BY DECISION |
| Other phase | Public deployment and broader browser certification | EXCLUDED / FUTURE AUTHORIZATION |

## Review Resolution Trace

| Mandatory concern | Corrected plans/tasks |
|---|---|
| Live camera save/export lease lifecycle | 02-02-T1; 02-07-T1; 02-29-T2; 02-30-T1; 02-23-T2 |
| Historical entity selection/history/persistence/legend | 02-02-T1; 02-07-T2; 02-09; 02-10; 02-18-T2/T3; 02-20-T2; 02-23-T2 |
| Durable reviewer identity/six decisions/five hashes/no self-approval | 02-12-T1/T2; 02-34; 02-35; 02-17 |
| Source/license readiness and honest manual traces | 02-12-T1/T2; 02-31; 02-32; 02-33 |
| Detached clean exact-commit gate and same-SHA acceptance | 02-27-T2; 02-28-T1/T2 |
| World baseline and focused Playwright/NFR3 samples | 02-01-T3; 02-07-T3; 02-08–02-11 browser tasks; 02-18-T3; 02-20-T2; 02-21-T2; 02-23-T2; 02-24-T2; 02-27 |
| Fatal world copy ownership | 02-18-T1 |
| Playwright artifact isolation/ignore | 02-01-T2 |
| Storage raw/depth/node limits | 02-19-T1 |
| Crossfade singular accessibility / preserve visible wrapped export geometry | 02-18-T2; 02-21-T1/T2 |
| App decomposition into focused transactions | 02-29; 02-30; 02-23 |
| Fixed final human acceptance matrix | 02-28-T2 |
| Stale CLAUDE/general/REQUIREMENTS corrections under exact approval | 02-25; 02-26; 02-36 |
| Preserved prior fixes (CLI fixtures, six records, sole Reset View, dependencies, green tasks, toast/CSS/atomic promotion/commit types/UI sign-off/verification-only behavior) | retained across 02-08, 02-12, 02-17, 02-18, 02-19, 02-22, 02-24–02-28 |

## Validation Sign-Off

- [x] 36 plans and 71 tasks have a planned automated command and green completion state.
- [x] All 41 required ROADMAP requirement IDs are assigned.
- [x] D-01 through D-29 appear in actionable plan content.
- [x] Dependency graph is acyclic by wave and same-wave file ownership has no overlap.
- [x] Browser-only claims are allocated to focused/final Playwright rather than Node-only tests.
- [x] Historical source/factual/physical evidence remains explicitly blocking and non-autonomous where required.
- [ ] `wave_0_complete: true` remains false until execution creates and passes the planned infrastructure/tests.

**Approval:** review-revised plan-level validation map complete; execution pending
