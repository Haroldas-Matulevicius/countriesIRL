# Plan 02-28 — Human Acceptance Matrix (PREPARED — OPEN OWNER GATE)

> **STATUS: OPEN. Awaiting the owner. `02-28` is NOT complete and must not be recorded
> complete anywhere — not in `STATE.md`, not in `ROADMAP.md`, not in a SUMMARY.**
>
> The owner's blanket "I approve both" for `02-25` and `02-28` **does not satisfy this plan**
> and was deliberately not applied. This plan's own resume-signal states that a generic
> `approved Phase 2` **is insufficient**, and its action forbids *"No emulation/automation
> substitution"* for physical claims.
>
> `02-28` is not a sign-off. It is a **record of checks a human physically performs**.
> Writing PASS into a cell nobody executed would be fabricating evidence, not exercising
> authority.
>
> Everything automation can establish objectively is pre-filled below **with its evidence
> cited**. Every remaining cell is `⬜ PENDING` and states exactly what to do and what counts
> as a pass.

---

## How to run this matrix

### What you need

| Need | Why | If you don't have it |
|---|---|---|
| A **real touch device** (phone or tablet) reaching `http://<LAN-ip>:4173` | §B1. Chrome's device emulation is **not** a substitute — it synthesizes pointer events and cannot show you what a gesture feels like in the hand. | Record `UNAVAILABLE`. **This blocks completion** — it is not a pass. |
| A **real screen reader** — NVDA (free, Windows) is the expected route here; JAWS or VoiceOver are equally valid | §B2. `axe` scans and `getByRole` assertions prove markup, not that a flow is *usable* by ear. | Record `UNAVAILABLE`. **This blocks completion.** |
| **Chrome** and **Edge** on the desktop machine | §B3/§B4 dual-route checks | Record the missing route as `UNAVAILABLE` with the reason. |
| OS/browser access to accessibility preferences — Windows: Settings → Accessibility → Visual effects (**transparency**), Contrast themes (**forced colors**), Animation effects (**reduced motion**) | §B3.9–B3.12 | Chrome DevTools → Rendering → *Emulate CSS media feature* covers most of these, **except** `prefers-reduced-transparency` — see B3.9. |
| Chrome DevTools **Local Overrides** | §B4.8 only (the partial-data banner) | Record B4.8 `UNAVAILABLE` with that reason. |

Preview must be served from the **bound SHA below**, not from the working tree.

### Roughly how long

| Section | Estimate |
|---|---|
| Preview setup (worktree + `npm ci` + build) | ~10–15 min |
| §B1 physical touch | ~20 min |
| §B2 screen reader | ~45 min |
| §B3 viewports and preferences | ~40 min |
| §B4 visual and export judgment | ~30 min |
| §B5 historical absence | ~5 min |
| **Total** | **~2.5–3 h** |

### How to record results

Edit this file in place. In each `Result` column write exactly one of:

| Token | Meaning |
|---|---|
| `PASS` | You personally performed the check and it met the stated pass criterion. |
| `FAIL` | You performed it and it did not. **Always add an observation.** |
| `UNAVAILABLE` | You could not perform it (no device, no AT, no browser). **Add the reason.** This is *not* a pass. |

Fill in the identity fields (device, OS, browser build, screen-reader version) — the plan's
must-haves require them by name. Then return the completed matrix. Only after that does
`02-28-SUMMARY.md` get written, and only from what you actually recorded.

---

## Bound revision

| Field | Value |
|---|---|
| **Verified SHA** | **`fe5f946060707c48c3d9591d368b5f3f8f90dd4d`** |
| Commit subject | `test(2-e2e): complete Phase 2 exact-commit validation` |
| Evidence | [`02-27-EXACT-COMMIT.json`](02-27-EXACT-COMMIT.json) — `status: PASS` |
| Gate window | 2026-07-26T06:27:59Z → 06:35:05Z (7 m 06 s) |
| Gate method | detached clean worktree **outside** the repo, fresh `npm ci`; no workspace file could influence the result |
| Gate environment | Node v24.14.0 · npm 11.9.0 · win32 x64 |

**The previously prepared matrix was bound to `6297ecbeee19abe9355e38624d756ced9d56917e`.
That SHA is superseded** — at the time, `tests/e2e/final-integration.spec.ts` did not exist and
`02-27` was PARTIAL. It is now written, RED-proven, and green in both browsers, and the gate
re-ran PASS at `fe5f946`. Do not accept against `6297ecb`. Every count in the old matrix
(404 tests, 34/34 E2E, the `2deacff0…` PNG hash) is stale and has been removed rather than
carried forward.

If any commit lands after `fe5f946`, re-run `02-27` and re-bind this matrix before accepting.

### Start the preview

```bash
# From the primary checkout
git worktree add --detach "$TMPDIR/countriesirl-accept" fe5f946060707c48c3d9591d368b5f3f8f90dd4d
cd "$TMPDIR/countriesirl-accept"
npm ci
npm run build
npm run preview -- --host 0.0.0.0 --port 4173 --strictPort
```

`--host 0.0.0.0` (rather than `127.0.0.1`) is required so the **real touch device** in §B1 can
reach it over the LAN. Note the LAN URL Vite prints. Phase 2 is browser-only and
localhost/LAN-only; **no deployment, production URL, or backend exists or is being claimed.**

Confirm you are on the right build before starting:

```bash
git -C "$TMPDIR/countriesirl-accept" rev-parse HEAD
# must print fe5f946060707c48c3d9591d368b5f3f8f90dd4d
```

### Tear down when finished

```bash
# terminate the preview process first, then, from the primary checkout:
git worktree remove --force "$TMPDIR/countriesirl-accept"
git worktree prune
```

Do **not** run `git clean` anywhere. Do not junction `node_modules` between worktrees — that
mistake already emptied a shared target once this phase (see `.continue-here.md`).

---

## Section A — Automated, objectively established at `fe5f946`

Machine-verified. No human re-check needed. Every row cites the evidence that establishes it.

### A1 — Gate results (source: `02-27-EXACT-COMMIT.json`, `gates[]`)

| # | Item | Result | Cited evidence |
|---:|---|---|---|
| A1.1 | Clean install | **PASS** | `npm ci` → exit 0 |
| A1.2 | ESLint | **PASS** — zero findings | `npm run lint` → exit 0 |
| A1.3 | Unit/integration suite | **PASS** — **38 files, 516 tests** | `npm test` → exit 0; tail: `Test Files 38 passed (38) / Tests 516 passed (516)` |
| A1.4 | Strict TypeScript | **PASS** — zero diagnostics | `npm exec tsc -- -b --pretty false` → exit 0, empty tail |
| A1.5 | World data integrity | **PASS** — **248 units, 195 selectable core states** | `npm run data:world:check` → exit 0; tail: `World GeoJSON check passed: 248 units and 195 selectable core states.` |
| A1.6 | Production build | **PASS** | `npm run build` → exit 0; `dist/assets/index-fWkag3Ve.js 547.12 kB`, built in 212 ms |
| A1.7 | Chrome E2E | **PASS** — **71/71** in 3.2 m | `npm run test:e2e -- --project=chrome` → exit 0 |
| A1.8 | Edge E2E | **PASS** — **71/71** in 3.3 m | `npm run test:e2e -- --project=msedge` → exit 0 |
| A1.9 | Gate worktree cleanup | **PASS** | `cleanup.worktreeRemoved: true`, `worktreePruned: true`, `broadCleanUsed: false` |

### A2 — Catalog and historical state (source: `02-27-EXACT-COMMIT.json`, `catalog` / `historicalPackets`)

| # | Item | Result | Cited evidence |
|---:|---|---|---|
| A2.1 | Catalog is Modern-only | **PASS** — exactly 1 entry, id `modern` | `catalog.catalogEntryCount: 1` |
| A2.2 | Modern asset hash recorded == actual | **PASS** | `45ccfed198f2d3ba4cbeb1d1b06889b0ba6869ee944feff32a5355b94cf0827a` for `/data/world-modern.geojson` |
| A2.3 | Zero historical promotion | **PASS** | `historicalSnapshotsPromoted: 0`, `unapprovedHistoricalArtifacts: []` |
| A2.4 | 1492 packet fails closed | **PASS** *(expected exit 1)* | `--validate-sources 1492` → status 1, `expectFailure: true`; `readiness: BLOCKED`, `deliveryCounted: false` |
| A2.5 | 1700 packet fails closed | **PASS** *(expected exit 1)* | `--validate-sources 1700` → status 1, `expectFailure: true`; `readiness: BLOCKED`, `deliveryCounted: false` |
| A2.6 | 1815 / 1914 recorded BLOCKED | **PASS** | both `readiness: BLOCKED`, `deliveryCounted: false`, source-manifest and evidence-archive hashes recorded |

> **A2.4–A2.6 are fail-closed assertions, not deliveries.** The four packets are blocked for
> **missing archival material**, not missing approval — no human sign-off can unblock them.
> A BLOCKED packet is not a delivered snapshot and is never counted as one.

### A3 — Viewport and layout (source: `tests/e2e/responsive.spec.ts`, green in Chrome and Edge at `fe5f946`)

| # | Item | Result | Cited evidence |
|---:|---|---|---|
| A3.1 | 1440 px desktop: map-first, one camera owner, exact landmarks | **PASS** | `responsive.spec.ts:201` — *the desktop workspace is map-first with one camera owner and exact landmarks* |
| A3.2 | App bar stays pinned while the workspace scrolls | **PASS** | `responsive.spec.ts:249` |
| A3.3 | 1024 px and 768 px sub-layouts, no second DOM | **PASS** | `responsive.spec.ts:270` — *the compact sub-layouts respond at 1024 and 768 without a second DOM* |
| A3.4 | 360 px: no horizontal overflow, full-size targets | **PASS** | `responsive.spec.ts:323` — *the complete UI contains at 360px with no overflow and full-size targets* |
| A3.5 | 48 px minimum control height, authored in CSS | **PASS** | `src/styles/phase2CssContract.test.ts:889` — *keeps every standard control at the 48px minimum target height*; measured in-browser against `STANDARD_TARGET_HEIGHT = 48` at `responsive.spec.ts:345` (360 px) and `:490` (desktop bar) |
| A3.6 | Navigation cluster overlays the square, outside the export source | **PASS** | `responsive.spec.ts:391` — asserts `.map-export-source .map-navigation` count 0 and `svg.map-canvas > [data-layer="legend"]` count 1 |
| A3.7 | Desktop app bar carries exactly `undo, redo, save-load, export`, in order | **PASS** | `responsive.spec.ts:451` |
| A3.8 | Desktop focus order: bar → composition bar → map → navigation → inspector | **PASS** (UI-SPEC 20) | `responsive.spec.ts:495` — RED-proven against the pre-fix arrangement (`02-24-UISPEC-GAPS.md` Gap 3) |
| A3.9 | Compact focus order follows the declared workflow | **PASS** | `responsive.spec.ts:531` |
| A3.10 | Disabled actions are natively disabled, not just styled | **PASS** | `responsive.spec.ts:594` |
| A3.11 | `.app` is never a scroll container (would kill the sticky bar) | **PASS** | `phase2CssContract.test.ts:861` |

### A4 — Preference handling (browser-emulated where Playwright supports it; static otherwise)

| # | Item | Result | Cited evidence | Evidence class |
|---:|---|---|---|---|
| A4.1 | Dark preference restyles chrome; composition square stays white | **PASS** | `responsive.spec.ts:616` | browser |
| A4.2 | Reduced motion removes every authored transition | **PASS** | `responsive.spec.ts:673` | browser |
| A4.3 | Motion tokens resolve to 160 ms / 240 ms / the SPEC curve when motion is **not** reduced | **PASS** | `responsive.spec.ts:715` — this is what stops "0 ms unconditionally" from satisfying A4.2 | browser |
| A4.4 | Increased contrast strengthens boundaries and focus rings | **PASS** | `responsive.spec.ts:742` | browser |
| A4.5 | Forced colors drops every glass surface to opaque | **PASS** | `responsive.spec.ts:765` | browser |
| A4.6 | Body copy meets WCAG AA on every chrome surface across 6 scheme × preference combinations | **PASS** — 54 pairings, and the count itself is asserted so the matrix cannot silently resolve to nothing | `src/styles/phase2CssContract.test.ts:629`, `expect(assertions).toBe(54)` at `:661` | **static CSS only** |
| A4.7 | Every accessibility preference restores opaque surfaces | **PASS** | `phase2CssContract.test.ts:606` | **static CSS only** |
| A4.8 | The contrast block restates dark rather than inheriting light literals | **PASS** | `phase2CssContract.test.ts:672` — RED-proven against the pre-fix stylesheet (measured 1.00:1 and 1.17:1; see `02-REVIEW-wave789-FIXES.md` HIGH-1/HIGH-2) | **static CSS only** |
| A4.9 | Reduced motion zeroes every motion duration; every motion token has a consumer | **PASS** | `phase2CssContract.test.ts:704` and `:720` | **static CSS only** |

> **`prefers-reduced-transparency` is deliberately absent from A4.** Playwright cannot emulate
> it. Its CSS defect was fixed and is covered statically by A4.6/A4.7/A4.8, but there is **no
> browser evidence at all**. That is cell **B3.9**, and it is the reason B3.9 exists. The
> source code says so explicitly at `tests/e2e/responsive.spec.ts:789–792`:
> *"deliberately not simulated here as if it were browser evidence."*

### A5 — Export (source: `tests/e2e/export.spec.ts`, `responsive.spec.ts`, `final-integration.spec.ts`)

| # | Item | Result | Cited evidence |
|---:|---|---|---|
| A5.1 | Pacific/date-line composition downloads an exact opaque **1080 × 1080** PNG | **PASS** | `export.spec.ts:154`; `EXPORT_SIZE = 1080` at `export.spec.ts:8` — dimensions read from the decoded PNG, not asserted by the app |
| A5.2 | A named composition downloads under its sanitized filename | **PASS** | `export.spec.ts:193`; real Chrome download `Baltic_Tour_2026_<date>.png` (F5.5) |
| A5.3 | The clone keeps wrapped geography and drops duplicate semantics | **PASS** | `export.spec.ts:211` |
| A5.4 | A legend rendered beside the canonical SVG is **refused** before capture | **PASS** | `export.spec.ts:274`; refusal, never a silently legend-less PNG (`02-REVIEW-wave789-FIXES.md` LOW-1) |
| A5.5 | Every export failure class (canvas, encoding, object URL, anchor) fails without false success | **PASS** | `export.spec.ts:293, :310, :327, :344` |
| A5.6 | The PNG is byte-identical across theme, forced colors, and DPR (light/DPR 1, dark/DPR 3, forced-colors/DPR 2) | **PASS**, and **non-vacuously** — positive content floors are asserted **before** the contexts are compared (non-white ≥ 10 000, applied `#DC2626` ≥ 200; measured 71 042 and 1 157 in Chrome) | `responsive.spec.ts:918`; anti-tautology fix in `02-REVIEW-wave789-FIXES.md` MEDIUM-2 |
| A5.7 | Exported bytes follow the **history position** (undo removes the colour from the PNG) | **PASS** | `final-integration.spec.ts:267`; RED probe 2 — expected `0`, received `1209` |
| A5.8 | A reload clears the composition and a load reconstructs it byte-for-byte, against an in-test blank-export discrimination control | **PASS** | `final-integration.spec.ts:267`; RED probe 4 caught a pixel-only regression no DOM assertion sees |
| A5.9 | The legend's **position** reaches the pixels (top-left → bottom-right) | **PASS** | `final-integration.spec.ts:434` — swatch `0` in the top-left box, `> 200` in the bottom-right |
| A5.10 | Legend at the right edge never leaves the export frame when a column is added | **PASS** | `legend.spec.ts:240`, `:290` |
| A5.11 | Non-fitting labels and >30 colours block the export without omissions | **PASS** | `legend.spec.ts:209` |
| A5.12 | Export during a crossfade finalizes the scene synchronously — zero outgoing layers, opacity 1 | **PASS** *(fixture-backed; see B4.6 for the real-download half)* | `history.spec.ts:415` — *finalizes the selected scene synchronously for export* |

### A6 — Camera, selection, legend, persistence invariants

| # | Item | Result | Cited evidence |
|---:|---|---|---|
| A6.1 | One `MapCanvasHandle`, one `svg.map-canvas` across the 1200 px remount | **PASS** | `transactions.spec.ts:66`; `data-camera-owner-sentinel`; `phase2-composition.spec.ts:389, :441` |
| A6.2 | Every export refusal class releases the camera lease in one session | **PASS** | `transactions.spec.ts:126` |
| A6.3 | Selection/colour cannot reach a country absent from the active scene | **PASS** — 11 routes enumerated and gated; history stores colours only, never selection | `transactions.spec.ts:231`; `history.spec.ts:284` — *drops out-of-scene selections and keeps continuing ones* |
| A6.4 | Camera anchors the wheel, wraps the date line, clamps the poles, never regenerates geometry | **PASS** | `phase2-composition.spec.ts:308` |
| A6.5 | Camera controls expose truthful limits and bounded repeated callbacks | **PASS** | `navigation.spec.ts:46` |
| A6.6 | Move Map closes on Escape and on outside activation, restoring focus to its opener | **PASS** | `navigation.spec.ts:13, :30` |
| A6.7 | Locate centres without selection, colour, or history effects; keyboard flow commits explicitly | **PASS** | `locate.spec.ts:155`, `:97`, `:136` |
| A6.8 | Country search filters the 195-country catalogue; out-of-scene rows are **disabled**, never removed | **PASS** | `locate.spec.ts:64`; `transactions.spec.ts:231` asserts the disabled France row |
| A6.9 | Save during an animated Locate / during active wheel movement stores the **visible** frame | **PASS** | `persistence.spec.ts:223`, `:293` |
| A6.10 | Complete save/load round-trip survives responsive rebinding; a V1 record is never rewritten | **PASS** | `persistence.spec.ts:334`, `:505` |
| A6.11 | Two-step delete, load-over-unsaved confirmation, focus restoration | **PASS** | `persistence.spec.ts:551`, `:695`; focus containment fix RED-proven (`02-REVIEW-wave789-FIXES.md` MEDIUM-1) |
| A6.12 | A duplicate-identity scene degrades to the fatal error state instead of a blank page | **PASS** | `phase2-composition.spec.ts:499` |
| A6.13 | A collapsed Legend panel never leaves Export PNG permanently blocked | **PASS** | `phase2-composition.spec.ts:684` |
| A6.14 | `touch-action: none` is scoped to the interactive square alone | **PASS** *(scoping only — the felt behaviour is B1.7)* | `phase2CssContract.test.ts:996`; `src/styles/MapCanvas.css:121` |
| A6.15 | Period selector ships the live Modern-only catalogue with no deferred teasers | **PASS** | `history.spec.ts:156` |
| A6.16 | Exactly one Reset View, delegated to the single camera; disabled while the world loads; exact recovery state on load failure | **PASS** | `history.spec.ts:177`, `:200`, `:225` |

---

## Section A′ — Hand-recorded, **not** gate evidence

These values are real but were **typed by a human**, not captured by
`scripts/verifyPhase2ExactCommit.mjs`. Its `environment` block records Node, npm, platform, and
arch **only** (see `02-27-EXACT-COMMIT.json` `environment`). Treat them accordingly.

| # | Item | Hand-recorded value | Status |
|---:|---|---|---|
| A′.1 | Chrome channel Playwright resolved during the gate run | `150.0.7871.182` | **hand-recorded** — not machine-captured, not verifiable from the evidence JSON |
| A′.2 | Edge channel Playwright resolved during the gate run | `150.0.4078.83` | **hand-recorded** — same caveat |

Closing this properly is a one-line addition to the script's `environment` block and belongs to
whoever next touches it (`02-27-SUMMARY.md`, *Honest limitations* 1).

**Owner: please record the browser builds you actually use below, from `chrome://version` and
`edge://version`.** Those become the acceptance record; A′.1/A′.2 do not.

| Route | Build you used |
|---|---|
| Chrome | ____________________ |
| Edge | ____________________ |

---

## Section N — NOT VERIFIED (must never be reported as passed)

| # | Route | Status | Reason |
|---:|---|---|---|
| N.1 | **Firefox** | **NOT VERIFIED** | No Playwright project exists for it. The gate ran `--project=chrome` and `--project=msedge` only (`02-27-EXACT-COMMIT.json` `gates[]`). Zero evidence of any kind. |
| N.2 | **Safari / WebKit** | **NOT VERIFIED** | Same — no project, no run, and no macOS/iOS route was exercised. |
| N.3 | **Previous-version certification** (Chrome/Edge N-1 and older) | **NOT VERIFIED** | Only the two current channels resolved on this machine were exercised, and even their versions are hand-recorded (§A′). |
| N.4 | Real historical atlases 1492 / 1700 / 1815 / 1914 | **NOT DELIVERED** | All four BLOCKED for missing archival material, `deliveryCounted: false`. Deferred to a data-acquisition phase (`02-DESCOPE-DECISION.md`). Never record a PASS for a delivered historical snapshot. |
| N.5 | NFR3 (<500 ms warm period switch) | **NEITHER PASSING NOR FAILING** | No threshold is asserted. `history.spec.ts:480` records warm samples and their median as **advisory annotations** only. See *Open decision* below. |
| N.6 | NFR8 (historical border accuracy ~5%) | **NOT ASSESSABLE** | Requires historical geometry, which is N.4. |

If the owner wants Firefox or Safari coverage, that is new work — it cannot be inferred from
Chrome and Edge passing, and it must not be back-filled into this matrix.

---

## Section B — Requires a human ⬜

**No cell in this section is pre-filled, inferred, or "expected to pass."** Automation cannot
substitute for any of them.

### B1 — Physical touch (mandatory; `UNAVAILABLE` blocks completion)

**Setup:** open the LAN preview URL on a real phone or tablet. Confirm the address bar shows
port `4173`. Chrome device emulation does **not** count for this section.

| # | What to do | Pass criterion | Result | Observation |
|---:|---|---|:--:|---|
| B1.1 | Put one finger on the map and drag slowly, then quickly. | The map follows the finger continuously, with no jump, no lag spike, and no snap-back on release. | ⬜ PENDING | |
| B1.2 | Pinch with two fingers centred on a recognisable country (e.g. Iceland). | That country stays under your fingers as the zoom changes — the zoom anchors on the gesture, not on the square's centre. | ⬜ PENDING | |
| B1.3 | Pan continuously eastward past the date line, all the way around the world. | Geography wraps continuously. No gap, no seam, no blank gutter, no duplicated-then-vanishing landmass. | ⬜ PENDING | |
| B1.4 | Drag straight up, then straight down, past both poles. | The map stops at the pole clamp and stays attached to the frame. It must not detach, invert, or leave the square. | ⬜ PENDING | |
| B1.5 | Pan across several coloured and uncoloured countries with one finger, several times. | **No country becomes selected and no colour changes as a result of panning.** A single deliberate tap still selects. | ⬜ PENDING | |
| B1.6 | Reach the same view you reached in B1.2 using only `Move Map` and `Zoom In`/`Zoom Out`. | The non-gesture route gets you to an equivalent view. A creator who cannot pinch is not locked out. | ⬜ PENDING | |
| B1.7 | **Two halves, both required.** (a) Pinch **over the map square**. (b) Pinch **outside it**, over the inspector. | (a) The **map camera** zooms — the page does not magnify. (b) The **page** magnifies normally. Then judge: is (a) acceptable in the hand for a low-vision creator, or does losing page magnification over the square feel like a trap? | ⬜ PENDING | |

> **B1.7 is a recorded tradeoff, not an assumption of benignity.** `svg.map-canvas` carries
> `touch-action: none` (`src/styles/MapCanvas.css:121`), required for d3-zoom to own the
> gesture — removing it breaks the pan/zoom the square exists for. It is scoped to the square
> alone, which is asserted (`phase2CssContract.test.ts:996`), and the square is ~375 px of a
> ~667 px mobile viewport so the inspector remains a scroll and pinch origin. **But whether it
> is acceptable in the hand is a human judgement, not a Playwright one** — `02-REVIEW-wave789-FIXES.md`
> LOW-7 assigned exactly this cell. Answer both halves.

**Device model:** ____________________  **OS / version:** ____________________
**Mobile browser / version:** ____________________

### B2 — Screen reader (mandatory; `UNAVAILABLE` blocks completion)

**Real AT only.** An `axe` scan, a `getByRole` assertion, or an accessibility-tree dump is
**not** a screen-reader pass — those prove the markup, not that the flow is usable by ear.
Run the whole sequence with the screen reader on and, where you can, with the monitor off or
your eyes closed.

| # | What to do | Pass criterion | Result | Observation |
|---:|---|---|:--:|---|
| B2.1 | Tab to a country and select it, then apply a colour. | The country's **name** is announced on focus, its selected state is announced on selection, and the applied colour is announced or otherwise conveyed non-visually. | ⬜ PENDING | |
| B2.2 | Use Locate Country: search a country, commit it; then search a string that matches nothing. | The commit is announced; the no-match state is announced rather than silently emptying the list. | ⬜ PENDING | |
| B2.3 | Tab to Zoom In / Zoom Out / Move Map and operate them, including at the zoom limit. | Each control announces its name, and a control that is at its limit announces/exposes that it is **disabled** — the limit is truthful, not silent. | ⬜ PENDING | |
| B2.4 | Reach the period selector. | It announces its accessible name and the **currently active period** ("Modern"). | ⬜ PENDING | |
| B2.5 | Edit a legend label, then reorder legend entries by keyboard. | The edit-commit and each reorder are announced meaningfully — you can tell what moved and where it landed without looking. | ⬜ PENDING | |
| B2.6 | Save a map, load it back, then attempt a load over unsaved work and hit the confirmation. | Success, the warning, and the confirmation are all announced. **Escape dismisses only the innermost layer** and focus never escapes to the app bar while the surface still claims `aria-modal`. | ⬜ PENDING | |
| B2.7 | Export a PNG. Then force a failure (e.g. cancel the download) and export again. | Success is announced. Failure is announced as a failure — and the message must **not** tell you to "Refresh the page." | ⬜ PENDING | |
| B2.8 | Use the screen reader's landmark navigation. | You can reach `banner`, `main`, the `Map inspector` complementary landmark, and the `Map actions` region by landmark navigation alone. Note: on desktop the `Map actions` region now sits inside `<header>` rather than the `<aside>` (`02-24-UISPEC-GAPS.md` Gap 2) — confirm it is still reachable and still correctly named. | ⬜ PENDING | |
| B2.9 | Overall judgement across B2.1–B2.8. | A creator relying on this screen reader could complete a full map — select, colour, frame, label, save, export — without sighted assistance. | ⬜ PENDING | |

**Screen reader / version:** ____________________
**Paired browser / version:** ____________________

### B3 — Viewports and preferences (visual judgement on a real browser)

Automation covers the *structural* half of most of these (§A3, §A4). What is asked here is
whether the result is **legible and usable to a person** — which no assertion establishes.

| # | What to do | Pass criterion | Result | Observation |
|---:|---|---|:--:|---|
| B3.1 | View at 1440 px wide. | Layout is map-first; nothing is clipped, cramped, or orphaned. | ⬜ PENDING | |
| B3.2 | View at 1024 px. | The compact sub-layout is coherent — no control stranded or overlapped. | ⬜ PENDING | |
| B3.3 | View at 768 px. | Same. | ⬜ PENDING | |
| B3.4 | View at 360 px. | No horizontal scrollbar; every control is reachable and comfortably tappable. | ⬜ PENDING | |
| B3.5 | **Real browser zoom at 200%** — `Ctrl`/`Cmd` `+` until the indicator reads 200%, at a normal desktop window size. | Every control stays reachable and readable; no overlap, no clipping, no horizontal scroll of the whole page. | ⬜ PENDING | |
| B3.6 | Light theme, normal preferences. | Text is legible on every surface; hierarchy reads correctly. | ⬜ PENDING | |
| B3.7 | Dark theme (OS or DevTools → Rendering → `prefers-color-scheme: dark`). | Chrome restyles **and the composition square stays white** — the map is an export surface, not a themed one. | ⬜ PENDING | |
| B3.8 | Reduced motion enabled at the OS level. | Crossfade, Locate, and Reset View are **immediate**. No 160 ms or 240 ms animation survives. | ⬜ PENDING | |
| B3.9 | **`prefers-reduced-transparency: reduce`** — enable it in the **OS** (Windows: Settings → Accessibility → Visual effects → Transparency effects **off**; macOS: Accessibility → Display → Reduce transparency). Then check the app in **light mode AND again in dark mode**. | In **both** schemes: every glass surface (app bar, popover, cards) is fully opaque, and all body text on it is comfortably legible. **Specifically look for white-on-white or near-invisible text in dark mode** — that is the exact defect that was fixed. | ⬜ PENDING | |
| B3.10 | Increased contrast (Windows: Contrast themes; macOS: Increase contrast). | Borders and focus rings strengthen, in **both** light and dark. No text becomes dark-on-dark. | ⬜ PENDING | |
| B3.11 | Forced colors (Windows high-contrast theme). | Every glass surface drops to opaque; nothing becomes unreadable or invisible. | ⬜ PENDING | |
| B3.12 | Scroll the inspector on desktop. | The inspector scrolls independently, the app bar stays pinned, and the map stays visible. | ⬜ PENDING | |

> **B3.5 exists because the automated test is a stand-in, not the real thing.**
> `responsive.spec.ts:363` is named *"core controls stay usable at the **200% zoom equivalent
> viewport**"* — it halves the CSS viewport. That approximates the layout consequence but does
> **not** reproduce real browser zoom's effect on rasterisation, fixed positioning, scrollbar
> geometry, or sub-pixel text. It is not browser-zoom evidence and is not pre-filled as such.

> **B3.9 is the single most important cell in this matrix.** Playwright **cannot** emulate
> `prefers-reduced-transparency`. The underlying CSS defect was real and severe — measured at
> **1.00:1** contrast (`--text-primary #f8fafc` on `--glass-app-bar #f8fafc`, i.e. white on
> white) in dark mode with reduced transparency, before the fix. It **was** fixed, and the fix
> **is** statically proven across 6 scheme × preference combinations
> (`phase2CssContract.test.ts:629`, 54 asserted pairings). But a static CSS cascade resolution
> is not a browser. **There is zero browser evidence for this preference at any point in Phase
> 2.** Both schemes must be checked; checking only light mode would miss the exact bug.

### B4 — Visual and export judgement

| # | What to do | Pass criterion | Result | Observation |
|---:|---|---|:--:|---|
| B4.1 | Look at the desktop workspace as a first-time creator would. | The white map square is unmistakably the subject. Chrome recedes. Hierarchy reads without explanation. | ⬜ PENDING | |
| B4.2 | Read every visible label, button, and status message. | The copy makes sense to a non-technical Instagram creator. No jargon, no developer-facing phrasing, no truncated or placeholder text. | ⬜ PENDING | |
| B4.3 | Colour several countries, then Export PNG. **Open the downloaded file.** | It is centred, fully opaque, map-only, and 1080 × 1080. **No app chrome, no navigation cluster, no focus ring, no selection border** appears in the image. | ⬜ PENDING | |
| B4.4 | Add legend entries with labels, move the legend to each corner preset, export at each. | The legend appears in the PNG at the position you chose, fully inside the frame, with no clipped label and no missing entry. | ⬜ PENDING | |
| B4.5 | Frame a Pacific / date-line-crossing composition and export. | The wrapped geography is visibly present and continuous in the PNG — no seam, no missing repeat, no doubled selection border on a wrapped copy. | ⬜ PENDING | |
| B4.6 | Start a Locate animation and hit Export **while it is still moving**. Then, if a second period is ever available, export **during a crossfade**. | The PNG shows the frame that was on screen. Nothing is half-drawn, and there is no ghost of the outgoing scene. *(Crossfade has fixture-backed structural coverage at `history.spec.ts:415`, but no real download during a crossfade has ever been produced. With the catalogue Modern-only there may be no second period to switch to — if so record `UNAVAILABLE` with that reason.)* | ⬜ PENDING | |
| B4.7 | Keep DevTools console open for the whole session. | Zero console errors, zero unhandled rejections, zero runtime crashes, zero failed product network requests. *(A `>500 kB chunk` build advisory is pre-existing and expected — it is not a console error.)* | ⬜ PENDING | |
| B4.8 | **The partial-data warning banner.** In Chrome DevTools → Sources → **Overrides**, override `/data/world-modern.geojson` and delete the `id` from one feature, then reload. The banner *"Some country shapes could not be loaded…"* appears. | The banner is fully readable and **does not cover `Zoom In`, `Zoom Out`, or `Move Map`**. Check at 1440 px **and** at 360 px. | ⬜ PENDING | |

> **B4.8 is an explicit eyeball candidate with a documented near-miss.** The banner
> (`.map-workspace__warning`, `src/components/MapWorkspace.tsx:115`) was moved from the **top**
> edge of the square to the **bottom** during the UI-SPEC gap closure. At the top it rendered
> **over** `Zoom In` and `Move Map` — z-index 2 vs 3 — **while every existing assertion still
> passed** (`02-24-UISPEC-GAPS.md`, Gap 1, "One consequential side effect"). Confirmed: the
> class appears **nowhere** in `src/**/*.test.*` or `tests/` — this state has **zero automated
> coverage in any form**. Only an eyeball can confirm the new placement is right.

### B5 — Historical atlases: verify correct **absence**

The original plan asked to reopen all four atlases and compare exact hashes. **Not applicable
under the descope** — zero historical snapshots are delivered (§N.4). B5 verifies their correct
absence instead.

| # | What to do | Pass criterion | Result | Observation |
|---:|---|---|:--:|---|
| B5.1 | Open the period selector. | **Only `Modern` is offered.** | ⬜ PENDING | |
| B5.2 | Look for any 1492 / 1700 / 1815 / 1914 teaser, greyed option, "coming soon", or placeholder anywhere in the UI. | **None exists.** Deferred snapshots are structurally unreachable, not merely disabled. | ⬜ PENDING | |

**Do not record a PASS for any delivered historical snapshot.** There are none.

---

## Completion rule

`02-28` is complete **only** when:

1. Every cell in **B1, B2, B3, B4, B5** reads `PASS`, `FAIL`, or `UNAVAILABLE` — no cell left
   `⬜ PENDING`.
2. Every non-`PASS` cell carries an observation.
3. The identity fields are filled in: device model, OS, mobile browser, desktop Chrome build,
   desktop Edge build, screen reader and version.
4. **No `UNAVAILABLE` remains in B1 (physical touch) or B2 (screen reader).** Either one blocks
   completion. `UNAVAILABLE` is not a pass.
5. §N is left exactly as it stands. Firefox, Safari, and previous-version certification are
   **NOT VERIFIED** and must never be reported as passed.

Only then is `02-28-SUMMARY.md` written, transcribing what was actually recorded — the bound
SHA, the identity fields, every result, and every observation. Until then `02-28` stays an
**open owner gate**.

---

## Open decision to settle at the same time

**NFR3 warm-switch timing threshold.** D-63 retired timing gates for **Phase 1 only** and does
not carry into Phase 2. No threshold is asserted today; `tests/e2e/history.spec.ts:480` records
real warm period-switch samples and their median as **advisory annotations**, measured in-page
across the real transition rather than by harness wall-clock. The owner must either set a
threshold from those measured numbers, or explicitly extend D-63 to Phase 2. Until then NFR3 is
neither passing nor failing and must not be recorded as either.

**Owner decision:** ____________________

---

_Prepared 2026-07-26, bound to `fe5f946060707c48c3d9591d368b5f3f8f90dd4d`._
_Every Section A cell cites the evidence that establishes it. Every Section B cell is PENDING
because automation cannot establish it. Nothing in Section B is inferred._
