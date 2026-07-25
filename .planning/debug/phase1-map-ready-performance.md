---
status: diagnosed
trigger: "Investigate the Phase 1 Plan 01-15 map-ready performance failure in C:\\Users\\matul\\ClaudeProjects\\CountriesIRL using scientific GSD debugging, diagnosis-only first. Current Chrome 150 samples: 1113–1688ms; Edge 150: 1047–1573ms; locked threshold every sample <500ms. Earlier builds measured ~200ms, so identify regression/root cause rather than weakening the requirement. Read current MapCanvas, mapProjection, useGeoData, App, performance-mark instrumentation, CSS/loading skeleton, recent commits, and UAT evidence. Reproduce with controlled cold/warm runs, break down data fetch/JSON parse/normalization/projection/path generation/React effects/D3 join/double-rAF paint and browser launch/cache overhead. Verify metric start/end semantics and whether the harness measures product work correctly. Profile main-thread costs and bundle/data transfer. Do not modify code unless needed for temporary local instrumentation, which must be removed. Return ranked root causes with measurements, exact recommended fix plan, expected gain, files affected, and any risk to rendering/export. If the metric itself is invalid, prove it and propose corrected semantics consistent with the user-visible <500ms goal; do not simply relax the threshold."
created: 2026-07-22T08:36:22-05:00
updated: 2026-07-22T08:52:15-05:00
---

## Current Focus

hypothesis: CONFIRMED — commit e2f9190 multiplied detailed-geometry traversal from approximately two passes to five by validating bounds and generating path data during projection filtering, computing collection bounds again, then repeating bounds and path generation for final SVG attributes; Plan 01-15 further inflates this product regression by benchmarking the Vite development build where React StrictMode executes the expensive mount layout effect twice.
test: Compared controlled development and production cold/warm runs, instrumented every pipeline stage, and applied a temporary one-bounds-plus-one-path counterfactual that preserved exact SVG path output.
expecting: Diagnosis-only return with ranked causes, exact corrective plan, expected gains, affected files, metric semantics, and rendering/export risks.
next_action: Return the confirmed diagnosis; do not modify product code in diagnosis-only mode.

## Symptoms

expected: Every controlled map-ready sample is under 500ms while preserving the user-visible goal and rendering/export correctness; earlier builds reportedly measured approximately 200ms.
actual: Chrome 150 samples measure 1113–1688ms; Edge 150 samples measure 1047–1573ms.
errors: Phase 1 Plan 01-15 locked map-ready performance threshold failure; no runtime exception reported.
reproduction: Run the existing Phase 1 Plan 01-15 map-ready performance measurement in Chrome and Edge for 150 samples; controlled cold/warm details still to be reconstructed from UAT evidence and harness.
started: Regression occurred after earlier builds that reportedly measured approximately 200ms; exact commit boundary unknown.

## Eliminated

- hypothesis: Browser process launch or CDP connection time is included in `countriesirl-map-ready` and causes the failure.
  evidence: Fresh-profile browser launch was measured separately at 300.8–326.5ms for Chrome and 429.4–450.1ms for Edge, while the in-page start mark is created later inside the mounted `useGeoData` effect. The harness launches once before all five samples.
  timestamp: 2026-07-22T08:52:15-05:00

- hypothesis: GeoJSON network fetch is the primary bottleneck.
  evidence: In production-preview runs the fetch promise resolved in 3.9–13.3ms on normal/forced reloads; the single truly cold Chrome resource transfer of the 2.85MB file took 69ms. Geometry layout remained 472–570ms.
  timestamp: 2026-07-22T08:52:15-05:00

- hypothesis: CSS loading skeleton, D3 join/event wiring, React style effects, or double-rAF alone explains the regression.
  evidence: Style effects measured 0.5–1.2ms; D3 join/event remainder was generally under about 12ms after subtracting projection and path callbacks from total layout; double-rAF was 6.5–65.9ms. Projection plus path traversal consumed approximately 465–565ms per production mount and executes twice in development StrictMode.
  timestamp: 2026-07-22T08:52:15-05:00

- hypothesis: Weakening the threshold is necessary because the approved rendering cannot complete under 500ms.
  evidence: A temporary traversal-deduplication counterfactual preserved all 57 exact SVG `d` strings and projection translation, yet produced seven of seven production samples below 500ms in both Chrome (257.1–371.8ms) and Edge (262.5–388.2ms).
  timestamp: 2026-07-22T08:52:15-05:00

## Evidence

- timestamp: 2026-07-22T08:48:00-05:00
  checked: Metric implementation and Plan 01-15 harness semantics
  found: `countriesirl-map-load-start` is created inside `useGeoData`'s mount effect immediately before `fetch`, and `countriesirl-map-ready` ends after MapCanvas's D3 geometry/layout effect plus a double requestAnimationFrame. The harness launches one fresh-profile browser per browser, performs one preflight navigation, then collects all five samples with `Page.reload({ignoreCache:true})` in that already-running browser.
  implication: Browser process launch and initial JS/module navigation are not inside the product metric, but every acceptance sample intentionally forces a cold HTTP cache for the GeoJSON and includes fetch, parse, normalization, React update, geometry, DOM attributes, and two-frame visible-completion latency.

- timestamp: 2026-07-22T08:49:00-05:00
  checked: Current projection/path implementation versus pre-centering commit
  found: Current `createFixedEuropeProjection` validates every feature with `createSafeMapPath` (both `pathGenerator.bounds(feature)` and `pathGenerator(feature)`), then computes collection bounds, and MapCanvas calls `createSafeMapPath` again for every final `d` attribute. This is approximately five full geometry traversals per coordinate versus approximately two before commit `c7597d2` added data-driven centering; later guard commit retained the repeated validation.
  implication: The centering/safety path is a concrete regression candidate likely to dominate main-thread work on detailed Natural Earth geometry; it must be measured separately from fetch and paint.

- timestamp: 2026-07-22T09:02:00-05:00
  checked: Production bundle, GeoJSON transfer size, coordinate volume, and isolated Node geometry benchmark
  found: The GeoJSON is 2,850,798 bytes raw / 1,035,279 bytes gzip with 129,974 coordinate positions. The production JS is 446,537 bytes raw / 126,972 bytes gzip and CSS is 21,845 bytes raw / 4,470 bytes gzip. Across 12 isolated Node runs, median JSON.parse was 22.87ms, normalization 2.86ms, one path traversal 160.08ms, one bounds traversal 74.62ms, pre-centering safe final geometry 224.80ms, and current centering validation plus final safe path generation 508.76ms (469.60–542.74ms).
  implication: Current geometry work alone consumes or exceeds the entire 500ms budget before React effects and paint. The current product asset also contradicts the coding-rule expectation of roughly 50KB gzip for Europe-only data; it is about 20.7x larger.

- timestamp: 2026-07-22T08:36:22-05:00
  checked: User-provided benchmark evidence
  found: Chrome range is 1113–1688ms and Edge range is 1047–1573ms across 150 samples, versus a locked per-sample threshold below 500ms and earlier measurements near 200ms.
  implication: The issue is repeatable across two Chromium-family browsers and must be decomposed into product work, metric semantics, cache state, and harness/browser startup effects before recommending a fix.

- timestamp: 2026-07-22T08:52:15-05:00
  checked: Controlled Chrome 150 development-build cold/warm runs with stage instrumentation
  found: Map-ready was 1001.9–1410.5ms. Each sample had two separate mount layout long tasks because React StrictMode double-invoked the MapCanvas layout effect. Per invocation, projection was 250.6–357.2ms, final path callbacks 166.8–216.5ms, total layout 423.2–558.9ms, style effect 0.4–1.2ms, and double-rAF 8.2–50.5ms. JSON body consumption was bimodal at 26.9–321.7ms in the dev environment.
  implication: The Plan 01-15 `npm run dev` harness is not a valid release-performance environment; it deterministically measures the expensive product geometry twice and adds dev-server/HMR variability.

- timestamp: 2026-07-22T08:52:15-05:00
  checked: Controlled Edge 150 development-build cold/warm runs with stage instrumentation
  found: Map-ready was 1015.8–1657.0ms with the same two layout invocations. Projection was 271.9–369.8ms per invocation, final paths 176.5–220.3ms, total layout 450.8–602.2ms, JSON 27.1–440.5ms, and double-rAF 6.5–12.5ms.
  implication: The dev/StrictMode inflation independently reproduces across both required browsers and matches the UAT failure range.

- timestamp: 2026-07-22T08:52:15-05:00
  checked: Controlled production-preview Chrome 150 and Edge 150 runs using current product code
  found: Production executes one layout effect, not two, but still fails. Chrome map-ready was 569.9–653.5ms instrumented (533.1–713.4ms uninstrumented); Edge was 544.4–663.6ms. Chrome median projection was about 280ms and final path generation about 207ms; Edge was about 305ms and 212ms. Total geometry layout was roughly 472–570ms, fetch 4–13ms, JSON 27–51ms, normalization 3–13ms, style under 1.2ms, and paint wait 9–66ms.
  implication: Harness invalidity amplifies but does not create the defect. Current production product work exceeds the locked threshold because geometry traversal alone consumes the budget.

- timestamp: 2026-07-22T08:52:15-05:00
  checked: Git regression boundary
  found: Commit c7597d2 added centered projection with one collection-bounds pass while final path generation remained one pass. Commit e2f9190 then changed projection filtering to call `createSafeMapPath` (bounds plus path) for every feature and changed final rendering to call the same bounds-plus-path helper, retaining collection bounds between them. This raised the initial pipeline from about two geometry traversals to about five.
  implication: e2f9190 is the primary product regression commit; the safety intent is valid, but safety was implemented with redundant full-coordinate traversals.

- timestamp: 2026-07-22T08:52:15-05:00
  checked: Temporary optimized traversal counterfactual in production Chrome 150 and Edge 150
  found: Aggregating finite per-feature bounds directly for centering and generating each final path once reduced Chrome projection to 84.1–121.3ms, paths to 110.8–143.6ms, layout to 196.4–263.4ms, and map-ready to 257.1–371.8ms. Edge projection was 90.8–130.2ms, paths 105.8–142.8ms, layout 198.7–284.2ms, and map-ready 262.5–388.2ms. All 14 production samples were under 500ms.
  implication: The threshold is achievable with a targeted algorithm correction; expected current-code gain is approximately 280–350ms per production load and approximately 500–700ms in the dev harness.

- timestamp: 2026-07-22T08:52:15-05:00
  checked: Rendering and export equivalence of optimized counterfactual
  found: Current and optimized projections both translated to [540, 653.9967569717239]; all 57 generated SVG path strings were byte-identical with the same SHA-256 `52feb9b9031ede523bbec6f032dc4ae84e4b54ccaa99b50c512135633e274506` and all 57 remained non-empty.
  implication: The recommended traversal deduplication has no expected visual or PNG-export geometry change for the approved dataset. Existing malformed-geometry tests must remain as regression protection.

- timestamp: 2026-07-22T08:52:15-05:00
  checked: Metric start/end semantics and cache/browser overhead
  found: Start occurs immediately before GeoJSON fetch in a mount effect; end occurs after D3 rendering and double-rAF. It excludes browser launch, navigation response, startup bundle transfer/evaluation, and initial React shell/skeleton commit. The existing harness uses `Page.reload({ignoreCache:true})`, but Vite dev serves `Cache-Control: no-cache`, uses React development StrictMode, and is not representative of release work.
  implication: Keep the post-paint end and the <500ms requirement, but benchmark a production build. For a fully user-visible load metric, add a separate bootstrap-to-painted measure beginning in `main.tsx` before `createRoot().render`; report navigation-to-painted and browser launch separately rather than folding environment startup into the product measure.

- timestamp: 2026-07-22T08:52:15-05:00
  checked: Asset and eager bundle contribution
  found: GeoJSON is 2,850,798 bytes raw / 1,035,279 bytes gzip with 129,974 positions, versus the project rule's approximately 50KB-gzip expectation. Production startup JS is 446,537 bytes raw / 128,480 bytes gzip; `html2canvas` is eagerly imported and its ESM source alone is about 72.9KB gzip. These costs are mostly outside the current map-ready start mark, although GeoJSON parse and geometry are inside it.
  implication: Geometry deduplication is the blocking fix. A follow-up topology-preserving data simplification and lazy export import would add margin for a true navigation-to-painted target without affecting interaction timing; both require visual/export regression checks.

## Resolution

root_cause: Primary product regression is redundant full traversal of 129,974 GeoJSON positions introduced by e2f9190: `createSafeMapPath` performs bounds plus path during projection filtering, collection bounds traverses again, and final SVG rendering repeats bounds plus path. Plan 01-15 additionally measures the Vite development build, where React StrictMode runs this expensive mount layout effect twice, inflating production's approximately 544–713ms to the observed approximately 1.0–1.7s.
fix: Diagnosis only. Recommended implementation is to retain finite-coordinate validation at normalization, aggregate finite per-feature projected bounds once for centering, generate each final SVG path once with null/NaN/Infinity/catch protection, benchmark `vite build` plus `vite preview` or deployed production, and add separate bootstrap-to-painted semantics if the requirement is intended to cover the complete user-visible app startup.
verification: Temporary counterfactual produced 14/14 production Chrome/Edge samples under 500ms (257.1–388.2ms), with byte-identical 57 path strings and unchanged projection translation. All temporary product instrumentation and counterfactual code were removed; tracked product files have no diff.
files_changed: []
