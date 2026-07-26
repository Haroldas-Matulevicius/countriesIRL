# Plan 02-28 — Human Acceptance Matrix (PREPARED, NOT COMPLETE)

> **STATUS: awaiting the owner. This plan is NOT complete and must not be marked complete.**
>
> The owner gave a blanket "I approve both" for `02-25` and `02-28` during the session.
> **That approval cannot satisfy this plan**, and it was deliberately not applied. This
> plan's own resume-signal says a generic `approved Phase 2` **is insufficient**, and its
> action forbids *"No emulation/automation substitution"* for physical and historical claims.
>
> `02-28` is not a sign-off. It is a **record of tests a human physically performs**. Writing
> PASS into cells nobody executed would be fabricating evidence, not accepting authority.
>
> Every cell below that automation can establish objectively is **pre-filled and verified**.
> What remains is only what genuinely requires a person.

---

## Bound revision

| Field | Value |
|---|---|
| Verified SHA | `6297ecbeee19abe9355e38624d756ced9d56917e` |
| Evidence | [`02-27-EXACT-COMMIT.json`](02-27-EXACT-COMMIT.json) — status **PASS** |
| Gate method | detached clean worktree outside the repo, fresh `npm ci` |

**Acceptance must run against a detached preview of exactly this SHA**, not the working
tree. If any commit lands after it, re-run `02-27` and re-bind this matrix to the new SHA.

```bash
git worktree add --detach <path-outside-repo> 6297ecbeee19abe9355e38624d756ced9d56917e
cd <path-outside-repo> && npm ci && npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
# When finished: terminate the preview, then
git worktree remove --force <path-outside-repo> && git worktree prune
```

> ⚠️ `02-27` is **PARTIAL** — `tests/e2e/final-integration.spec.ts` is not written. Decide
> whether to accept on the current evidence or require that spec first.

---

## Section A — Automated, objectively established ✅

These are machine-verified at the bound SHA. No human re-check needed.

| # | Item | Result |
|---:|---|---|
| A1 | Unit/integration suite | **PASS** — 34 files, 404 tests |
| A2 | ESLint | **PASS** — zero findings |
| A3 | Strict TypeScript (`tsc -b`) | **PASS** — zero diagnostics |
| A4 | World data integrity | **PASS** — 248 units, 195 selectable core states |
| A5 | Production build | **PASS** |
| A6 | Chrome E2E | **PASS** — 34/34 · Chrome **150.0.7871.182** |
| A7 | Edge E2E | **PASS** — 34/34 · Edge **150.0.4078.83** |
| A8 | PNG dimensions | **PASS** — exactly **1080 × 1080** (read from PNG IHDR, not asserted by the app) |
| A9 | PNG byte-identical across browsers | **PASS** — Chrome and Edge both `2deacff0397848b8040a0a307e05d7829464ee6d01edf44f687fd895ad4b6476`, 337,646 bytes |
| A10 | Catalog integrity | **PASS** — exactly 1 entry (`modern`), recorded hash == actual asset SHA-256 `45ccfed198f2d3ba4cbeb1d1b06889b0ba6869ee944feff32a5355b94cf0827a` |
| A11 | Zero historical promotion | **PASS** — no historical asset, source approval, factual approval, or catalog entry exists |
| A12 | Blocked packets fail closed | **PASS** — 1492 and 1700 `--validate-sources` both exit nonzero. A blocked packet exiting 0 fails the gate. |
| A13 | Single camera owner across 1200px | **PASS** — `data-camera-owner-sentinel` survives; exactly one `svg.map-canvas` |
| A14 | Cross-scene selection containment | **PASS** — eleven routes enumerated and gated by independent review |
| A15 | Legend cannot exit the canvas | **PASS** — resolve chokepoint; independently confirmed unrepresentable |

**Exported PNG artifact:** `.artifacts/phase2-acceptance/phase2-export-evidence.png`
(filename `CountriesIRL_2026-07-25.png`).

---

## Section B — Requires a human 🔲

Automation cannot substitute for any of these. Mark **PASS**, **FAIL**, or **UNAVAILABLE**,
and add an observation for anything not PASS.

### B1 — Physical touch (mandatory; UNAVAILABLE blocks completion)

Use a real touch device. Emulation does not count.

| # | Check | Result | Observation |
|---:|---|:--:|---|
| B1.1 | One-finger pan moves the map smoothly | ⬜ | |
| B1.2 | Pinch zoom anchors under the fingers | ⬜ | |
| B1.3 | Panning across the date line wraps continuously | ⬜ | |
| B1.4 | Poles clamp without the map detaching | ⬜ | |
| B1.5 | Panning does **not** accidentally select a country | ⬜ | |
| B1.6 | Accessible alternatives (Move Map / Zoom) reach the same views | ⬜ | |
| B1.7 | Pinching over the square zooms the **map camera**, not the page — and the creator can still magnify the page by pinching outside it | ⬜ | |

**B1.7 is a deliberate tradeoff, recorded rather than assumed benign.**
`.map-canvas` carries `touch-action: none` (`MapCanvas.css`), which is required for d3-zoom to
own the gesture but also removes the user agent's own pinch-to-zoom **inside** the square. A
low-vision creator who pinches over the map gets camera zoom instead of page magnification. It is
not a scroll trap — the square is `aspect-ratio: 1`, so it occupies roughly 375px of a ~667px
mobile viewport and the inspector remains a scroll and pinch origin — but whether that is
acceptable in the hand is a human judgement, not a Playwright one. Confirm both halves.

**Device / OS:** ____________________

### B2 — Screen reader (mandatory; UNAVAILABLE blocks completion)

| # | Check | Result | Observation |
|---:|---|:--:|---|
| B2.1 | Country selection and color announce correctly | ⬜ | |
| B2.2 | Locate flow announces commit and no-match | ⬜ | |
| B2.3 | Camera controls announce truthful limits | ⬜ | |
| B2.4 | Period selector announces the active period | ⬜ | |
| B2.5 | Legend edit / move / reorder announce meaningfully | ⬜ | |
| B2.6 | Save / Load announce success, warnings, and errors | ⬜ | |
| B2.7 | Export announces success and failure | ⬜ | |
| B2.8 | `Map inspector` complementary landmark is reachable | ⬜ | |

**Screen reader / version:** ____________________

### B3 — Viewports and preferences (visual judgment)

| # | Check | Result | Observation |
|---:|---|:--:|---|
| B3.1 | 1440 px | ⬜ | |
| B3.2 | 1024 px | ⬜ | |
| B3.3 | 768 px | ⬜ | |
| B3.4 | 360 px — no horizontal overflow | ⬜ | |
| B3.5 | 200% browser zoom | ⬜ | |
| B3.6 | Light theme | ⬜ | |
| B3.7 | Dark theme — map square stays white | ⬜ | |
| B3.8 | Reduced motion | ⬜ | |
| B3.9 | Reduced transparency | ⬜ | |
| B3.10 | Increased contrast | ⬜ | |
| B3.11 | Forced colors | ⬜ | |
| B3.12 | Inspector scrolls independently; map stays visible | ⬜ | |

### B4 — Visual and export judgment

| # | Check | Result | Observation |
|---:|---|:--:|---|
| B4.1 | Visual hierarchy — white map square dominates | ⬜ | |
| B4.2 | Copy reads correctly for a non-technical creator | ⬜ | |
| B4.3 | Exported PNG **looks** right — centered, opaque, map-only | ⬜ | |
| B4.4 | Legend renders correctly in the export | ⬜ | |
| B4.5 | Pacific / date-line composition export | ⬜ | |
| B4.6 | Export during an animated Locate | ⬜ | |
| B4.7 | No console errors, runtime errors, or crashes in normal use | ⬜ | |

### B5 — Historical atlases

| # | Check | Result | Observation |
|---:|---|:--:|---|
| B5.1 | Only `Modern` appears in the period selector | ⬜ | |
| B5.2 | No 1492 / 1700 / 1815 / 1914 teaser or placeholder appears | ⬜ | |

> The original matrix required reopening all four atlases and comparing exact hashes.
> **Not applicable** under the descope — zero historical snapshots are delivered. B5 verifies
> their correct *absence* instead. Do not record a PASS for any delivered historical snapshot.

---

## Completion rule

Every mandatory cell in **B1**, **B2**, **B3**, **B4**, and **B5** must be **PASS**.
An `UNAVAILABLE` in B1 (physical touch) or B2 (screen reader) **blocks completion** — it is
not a pass.

When complete, transcribe this file into `02-28-SUMMARY.md` with the bound SHA, device/OS,
browser and screen-reader versions, and all observations.

---

## Open decision to settle at the same time

**NFR3 warm-switch timing threshold.** D-63 retired timing gates for **Phase 1 only** and
does not carry into Phase 2. No threshold is asserted today; warm period-switch samples and
their median are recorded as advisory annotations in `tests/e2e/history.spec.ts`. Either set
a threshold from those numbers, or explicitly extend D-63 to Phase 2.
