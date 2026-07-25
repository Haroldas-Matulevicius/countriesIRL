---
status: investigating
trigger: "Diagnose the failed Plan 01-15 production-preview evidence in C:\\Users\\matul\\ClaudeProjects\\CountriesIRL using scientific GSD debugging, without weakening thresholds or editing immutable evidence. Read the frozen evidence at `.planning/ui-reviews/01-15-production-preview-rerun/acceptance-evidence.json`, clean gate, current source, Plan 01-15, debug session, and temporary harness logic if recoverable from logs/artifacts. Reproduce controlled Chrome 150 and Edge 150 runs against exact commit 0ea5967/current product as appropriate. Separate real product regressions from external CDP harness flaws for: one Chrome cold 523.9ms sample, color samples up to 298ms, redo up to 109.4ms, history stress failure, modal focus failure, colored export pixel failure, and Edge timeouts at tooltip/reload. Profile main-thread tasks, timing mark semantics, cache control, CDP overhead, sequence-state contamination, screenshot/image analysis, and harness timeouts. Determine whether additional product margin is needed (e.g. topology-preserving simplification or lazy html2canvas) and quantify safe options. Do not modify immutable evidence or product code except removable temporary instrumentation. Return ranked root causes, reproduction measurements, exact product-vs-harness fix recommendations, files affected, expected gains, and rerun strategy with a new write-once evidence path."
created: 2026-07-22T15:23:54Z
updated: 2026-07-22T16:05:00Z
---

## Current Focus

hypothesis: Non-performance failures are harness/state/assertion defects, not product regressions. Exact source enforces a 50-transition history cap and real-user focus restoration, while the frozen export deliberately colored the 3x2px Åland path whose fill has no full-coverage exact-blue pixel. Interaction timing failures may be run-load/CDP contamination because prior focused native-pointer evidence passed both browsers. The remaining product question is whether the optimized map pipeline has enough worst-case margin.
test: Run the previously passing focused harness externally against exact 0ea5967 production preview for both browsers, then run a new diagnostic harness for cold/warm map samples, long tasks, rapid-vs-stabilized history, synthetic-vs-native focus, tooltip preconditions, and large-country export controls.
expecting: Exact-commit focused timings pass under 100ms in both browsers; history stabilizes at exactly 50 state transitions; native focus restores; large-country PNG has exact colored interior pixels; robust Edge reload/tooltip waits complete.
next_action: Execute the externalized focused harness against port 4173, preserving all output only under the OS temporary directory.

## Symptoms

expected: Plan 01-15 production-preview acceptance evidence should pass unchanged thresholds in controlled Chrome 150 and Edge 150 runs against commit 0ea5967/current product, with valid performance, history, focus, export-pixel, tooltip, and reload evidence.
actual: Frozen evidence includes one Chrome cold 523.9ms sample, color samples up to 298ms, redo up to 109.4ms, history stress failure, modal focus failure, colored export pixel failure, and Edge timeouts at tooltip/reload.
errors: Acceptance failures and timeouts recorded in `.planning/ui-reviews/01-15-production-preview-rerun/acceptance-evidence.json` and associated logs/artifacts; exact messages pending inspection.
reproduction: Recover the original production-preview harness and rerun controlled Chrome 150 and Edge 150 scenarios against exact commit 0ea5967 and current product as applicable.
started: Plan 01-15 production-preview rerun; exact first-failing run and prior baseline pending artifact/history inspection.

## Eliminated

## Evidence

- timestamp: 2026-07-22T15:23:54Z
  checked: Session setup
  found: User explicitly requires diagnosis only, immutable evidence preservation, unchanged thresholds, and no product edits except removable instrumentation.
  implication: Investigation must separate product and harness causes using controlled experiments and return recommendations rather than applying product fixes.

- timestamp: 2026-07-22T15:28:00Z
  checked: Project skills and existing debug sessions
  found: No project `.claude/skills` or `.agents/skills` directories exist. The prior `phase1-map-ready-performance` diagnosis confirmed redundant geometry traversal as a product regression, development StrictMode as a harness amplifier, and a production counterfactual at 257.1–388.2ms with byte-identical SVG paths.
  implication: The current acceptance rerun must be evaluated against that known fixed/optimized baseline, but the prior diagnosis is only a hypothesis candidate for residual timing outliers; non-timing failures require independent tests.

- timestamp: 2026-07-22T15:34:00Z
  checked: Plan 01-15 and frozen clean-gate transcript
  found: The plan requires five cold plus five warm samples per browser from one exact production build, strict per-sample thresholds, map-data-start through double-rAF painted completion, explicit cache metadata, and an external disposable CDP harness. The clean gate proves detached commit `0ea596732f1072ab30c9287e6e90546f7a7810d3`, clean status, 145 tests, deterministic data, strict TypeScript, and one Vite production build all passed.
  implication: The frozen failures cannot be attributed to development StrictMode or a dirty/build-mismatch environment; experiments must use production preview and preserve exact per-sample semantics.

- timestamp: 2026-07-22T15:34:00Z
  checked: Earlier current-head acceptance artifacts
  found: A focused current-head run reported all interaction/history/export/tooltip/focus checks passing in both browsers, whereas a separate comprehensive harness failed while looking for `input[name="map-name"]` after prior steps.
  implication: Sequence-state contamination or selector/lifecycle assumptions are viable causes for the comprehensive non-performance failures and should be tested before labeling them product regressions.

- timestamp: 2026-07-22T15:45:00Z
  checked: Frozen Chrome raw record
  found: Nine of ten map-ready samples passed; only cold sample 2 failed at 523.9ms, coincident with a 135.4ms GeoJSON resource duration versus 21.7–31.5ms for the other cold samples. Warm samples were 272.6–471.5ms. Color timings were 31.9–298ms with 7/10 failures, undo was 55.5–94.5ms with 10/10 passes, and redo had only 102.5/109.4ms failures.
  implication: The map failure has only 23.9ms threshold overrun but production margin is narrow. The asymmetric color/undo/redo pattern is inconsistent with one shared rendering-cost regression and points toward sequence/CDP scheduling effects.

- timestamp: 2026-07-22T15:45:00Z
  checked: Frozen Chrome automated UAT values
  found: History reported 58 undoable transitions after 55 intended edits, while branch truncation, reset/undo-reset, 132 rapid interactions, and 57 unique paths all passed. Focus restoration across responsive remounts passed, but the mobile dialog measured x=0/y=5.37/345x800 and Escape restoration was false. Colored export completed in 1701ms, was 1080x1080 opaque centered with zero near-black pixels, but exact-preset pixel count was zero; all-white export had the identical geometric bounds and expected hash.
  implication: History failure is contaminated initial history, modal failure combines harness viewport/emulation geometry and synthetic focus activation, and export failure is an image-classifier false negative rather than missing/failed download or black editor-state leakage.

- timestamp: 2026-07-22T15:45:00Z
  checked: Frozen Edge attempts
  found: Attempts 1 and 2 completed browser sampling but timed out waiting for the top-edge keyboard tooltip before writing any browser record; attempt 3 timed out on the first counted cold map-ready sample. All raw Edge samples were discarded by the harness.
  implication: Edge evidence absence is caused by all-or-nothing harness persistence and fixed waits, not by a recorded product assertion failure. Diagnostic reruns must checkpoint samples incrementally and capture active element, DOM, performance entries, lifecycle, and CDP pending state on timeout.

- timestamp: 2026-07-22T15:45:00Z
  checked: Recovered current-head comprehensive harness
  found: The harness drives many actions with `HTMLElement.click()` inside `Runtime.evaluate`, polls every 40ms via CDP, uses fixed 15–20s waits, runs all scenarios in one page/profile, clears only timing entries before interaction sampling, expects exactly 50 undos without clearing product history, asserts bottom tooltip must flip above rather than accepting clamp, requires mobile dialog exactly 360x800, recognizes colored export only by nine exact preset RGB triplets, and writes evidence only after the entire browser sequence completes.
  implication: The harness contains multiple independently falsifiable measurement/state/assertion defects that can create the reported non-product failures and Edge data loss.

- timestamp: 2026-07-22T16:05:00Z
  checked: Exact 0ea5967 source and current product diff
  found: Current HEAD differs from 0ea5967 only in planning/evidence files; no product source changed. `commitColors` always slices history to `HISTORY_LIMIT + 1` (51 snapshots), so at most 50 successful undos are representable. Interaction start marks are created immediately before dispatch and consumed after a double-rAF in the map style effect. Save/load captures the actual active element and falls back to the currently mounted control only if the opener disconnected. Mobile CSS fills the content viewport, not the nominal CDP device width including a 15px scrollbar.
  implication: A reported 58-undo count is necessarily counting harness attempts/stale DOM, not product transitions. Focus restoration must be tested with native pointer/keyboard activation and geometry against `clientWidth`/`innerHeight` after animation settlement.

- timestamp: 2026-07-22T16:05:00Z
  checked: Colored-versus-white PNG differential from recoverable comprehensive artifacts
  found: The supposed colored Åland export differs from the all-white control by exactly 7 pixels in a 5x3 box at x=591–595/y=452–454. The nearest pixel to preset blue is RGB 155,160,174, distance 146, because the approximately 3.16x2.31px island is dominated by neutral border/antialiasing and has no full-coverage preset-blue interior pixel.
  implication: `presetPixels > 0` is an invalid generic colored-export assertion when the harness selects the smallest feature. Use a known large country and compare against a same-build all-white control, or require a minimum color-distance/differential region tied to the selected feature.

## Resolution

root_cause: 
fix: 
verification: 
files_changed: []
