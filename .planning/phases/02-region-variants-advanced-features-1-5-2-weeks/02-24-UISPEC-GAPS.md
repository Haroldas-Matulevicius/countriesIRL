# 02-24 UI-SPEC Gap Closure

Closes the three composition-root placement deviations `02-24` identified but was not permitted
to fix, because they live in `src/App.tsx` and its plan declared only `src/styles/*` and two test
files.

**Not a plan, not a SUMMARY.** Gap closure against `02-24`, on `gsd/phase-01-pattern-map`, in the
primary checkout. No worktree, no junction.

| Commit | Subject |
|---|---|
| `d23f5c8` | `feat(2-app): overlay map navigation on the composition square` |
| `7efb922` | `feat(2-app): compose the global actions into the desktop app bar` |
| `8ea9fe0` | `test(2-responsive): assert the UI-SPEC 20 focus order, not the deviation` |

---

## Gap 1 — `MapNavigation` was not an overlay on the square (UI-SPEC 10)

**Real gap. Closed.**

`MapWorkspace` gained a typed `navigationSlot`, rendered inside `.map-workspace__square`,
**after** `MapCanvas` and outside `.map-export-source`. `App` hands `MapNavigation` to that slot
instead of composing it into `workspace__actions`. CSS moved the cluster from a static block in
the inspector to `position: absolute; top: 8px; left: 8px` (UI-SPEC 7.4's declared inset), via
`var(--space-sm)` so the token-scale contract still holds.

Two things this change could have broken silently, and what was done about each:

1. **Chrome in the export.** The export clones `svg.map-canvas`. Placing the cluster after the
   canvas keeps it structurally unreachable by the clone; `data-editor-only` remains as a second
   line of defence, not the first. Guarded at three levels: `MapWorkspace.test.tsx` and
   `App.test.tsx` assert the overlay's markup index is past where the export source closes, and
   `responsive.spec.ts` asserts `.map-export-source .map-navigation` count 0 in the real browser.
   The three-context pixel probe stayed green byte-for-byte across light/DPR 1, dark/DPR 3, and
   forced-colors/DPR 2.
2. **Stolen hit area.** The wrapper is a positioning box wider than the buttons it holds. It now
   sets `pointer-events: none` with `auto` restored on the cluster and popover, so the map paths
   and a top-left-positioned legend stay grabbable. Asserted with computed style, because
   nothing else would fail.

**One consequential side effect, stated deliberately:** the partial-modern-data warning
(`.map-workspace__warning`) moved from the top edge of the square to the bottom. It is a
full-width absolutely positioned banner; left at the top it renders **over** `Zoom In` and
`Move Map` at z-index 2 vs 3, and both elements would still pass every existing assertion. This
is a behavior change to a state no automated test currently exercises — it is a candidate for
`02-28`'s eyeball pass.

**Accepted, not fixed:** with the legend at its `top-left` preset the cluster overlaps it
visually in the editor. That overlap is what UI-SPEC 10 and UI-SPEC 12 jointly specify, the
export is unaffected, and UI-SPEC 20 already requires corner presets and keyboard nudges as
non-drag alternatives, so legend positioning does not depend on dragging under the cluster.

---

## Gap 2 — `GlobalActions` was not in the app bar (UI-SPEC 8)

**Real gap. Closed.**

`Controls` now takes a declared `variant`:

| Variant | Composed into | Actions |
|---|---|---|
| `app-bar` | `AppHeader`, desktop only | Undo, Redo, Save or Load Maps, Export PNG |
| `strip` | `workspace__actions`, compact/mobile | the same four, plus `Reset All Colors` |

Exactly one instance is mounted at a time, which is what keeps "exactly one
`controls__action--primary`" and "exactly one `Reset All Colors`" true by construction.

UI-SPEC 8's second clause — `Reset All Colors` is **not** on the bar — forced the one structural
change beyond a move: the button was extracted to `ResetColorsAction`, used by the compact strip
and, on desktop, by `workspace__selection-color` (UI-SPEC 11: "selection/color section on
desktop and the action strip on compact/mobile"). One implementation, two homes, never both at
once. Composing it onto the bar would have put content reset one control away from `Reset View`,
which is exactly the pairing D-17/D-18 forbid.

The busy spinner was re-keyed from `.workspace__actions button[aria-busy]` to
`.controls__action[aria-busy]`. Keyed on the container it would simply have vanished from the
app bar with every test still green.

### Accessibility bookkeeping — invariant 10

Landmark counts are **unchanged and still asserted**: banner 1, main 1, complementary 1 desktop /
0 compact, at every viewport in `responsive.spec.ts`; `Map creator workspace` ×1 and
`Map inspector` ×1 in `App.test.tsx`. No count assertion was relaxed.

Two deliberate changes that a reviewer should see stated rather than discover:

- **The `Map actions` region moved into the banner on desktop.** `Controls` is a
  `<section aria-labelledby="map-actions-heading">`, i.e. a `region` landmark. On desktop it is
  now a descendant of `<header>` instead of the `<aside>`. Its role, accessible name, and heading
  are unchanged; the heading is hidden with `clip-path`, never `display: none`, because that
  would strip the name the section's `aria-labelledby` points at. No `aria-*` attribute anywhere
  in the app changed value.
- **The desktop action group left the workspace `ErrorBoundary`.** It is now covered by
  `main.tsx`'s outer boundary instead of the workspace fallback. `Controls` derives no data and
  owns only an activation ref, so the exposure is small, but the blast radius of a throw there is
  now the whole app rather than the workspace region.

---

## Gap 3 — the focus order

**Real gap, but the brief's description of the test was inaccurate. Evidence below.**

The claim was that `responsive.spec.ts` "asserts the order that EXISTS and names the deviation".
It named the deviation in a comment, but it **asserted nothing about the navigation cluster at
all**. Its assertions were `saveLoad < exportPng < resetView < country < countrySearch` — none of
which mention `Zoom In`, `Zoom Out`, or `Move Map`.

Proof: after gaps 1 and 2 were both landed and the cluster had moved from the action strip to an
overlay after the map, the **unmodified** test still passed — Chrome 65/65 at commit `7efb922`.
A test that passes identically on both sides of the change it exists to police is not asserting
that change.

So this was not "a test asserting a deviation" to be flipped; it was a **hole**. It is now
closed rather than merely re-pointed:

- The compact case asserts the full UI-SPEC 20 sequence — action strip → composition bar → map →
  **map navigation** → inspector — plus that `Zoom Out` is absent because it is natively disabled
  at the whole-world fit. Asserting the absence and its reason is the difference between knowing
  why a control is missing and not noticing it went missing.
- A new desktop case asserts UI-SPEC 20's desktop sequence: app bar actions → composition bar →
  map countries → map navigation → inspector controls.
- A new desktop case asserts the app bar carries exactly `['undo','redo','save-load','export']`
  in that order, that `Reset All Colors` exists exactly once and only in the selection/color
  section, that `.workspace__actions` is absent on desktop, and that the desktop bar introduces
  no horizontal overflow and no sub-48px target.
- The tab-order walker and the position lookup were extracted so both cases share one
  starting-point discipline (click the product title; blurring does not move the sequential
  navigation starting point).

### Proven RED

Passing-on-first-write assertions are worth nothing, so each new claim was forced to fail:

| Probe | Result |
|---|---|
| `navigationSlot` rendered **before** `MapCanvas` | compact and desktop focus-order cases both fail on `country < Zoom In` |
| Same, unit level | `App.test.tsx` and `MapWorkspace.test.tsx` overlay cases fail (`expected 1795 to be greater than 3623`) |
| Global actions returned to the inspector, `globalActions={null}` | `the desktop app bar carries the global actions in the declared order` fails on the `data-action` sequence; desktop focus order fails on `order[0]` |

Each probe was reverted and the suite re-run green. `git status` clean between probes.

Note that the overlay/export placement case passed under the first probe — correctly: it tests
*placement relative to the export source*, not DOM order relative to the canvas. The ordering
claim is carried by the focus-order cases and the two unit cases.

---

## Live invariants — what was verified vs. assumed

| # | Invariant | How |
|---|---|---|
| 1 | Selection/color cannot reach a country outside the scene | **Assumed unchanged.** No state was relocated; nothing entered or left the history snapshot. `savedColorsBaseline` and `compositionName` still live in App, outside history. Re-verified indirectly: the historical round-trip case in `transactions.spec.ts` still passes. |
| 2 | No raw `legend.position` read | **Assumed unchanged.** No render or export path was touched. |
| 3 | One `MapCanvasHandle`, one `svg.map-canvas` across 1200px | **Verified.** `expectOneCameraOwner` and the sentinel pass at 1440/1024/800; `transactions.spec.ts` still proves camera callbacks reach the one bound handle across the remount; the handle-accessor identity assertion in `App.test.tsx` is untouched and green. The cluster moved *into* the square without adding a canvas — `class="map-canvas"` count is still asserted as 1 at both layouts. |
| 4 | Legend inside the canonical SVG | **Verified, and reinforced.** No containment assertion was moved, relaxed, or migrated to a fixture. `responsive.spec.ts` now additionally asserts `svg.map-canvas > [data-layer="legend"]` count 1 in the same case that asserts the overlay is *outside* the export source, so the mirrored pair is visible in one place. |
| 5 | 195-core catalog, disabled not removed | **Assumed unchanged.** `CountryList`/`LocateCountry` untouched; `transactions.spec.ts` still asserts the disabled France row. |
| 6 | Catalog-driven period selector | **Assumed unchanged.** Untouched. |
| 7 | Legend opacity single 0–100 scale | **Assumed unchanged.** Untouched. |
| 8 | PNG 1080×1080, opaque, map-only, theme/DPR-independent; overlay absent | **Verified.** Three-context pixel probe green in Chrome and Edge, plus a structural browser assertion that the cluster is not inside `.map-export-source`. |
| 9 | `CameraFreezeLease` released in the outermost `finally` | **Verified.** The four-refusal-class sequence in `transactions.spec.ts` passes. |
| 10 | Landmark counts | **Verified, and consciously reasoned about** — see Gap 2. Counts unchanged; the `Map actions` region's *container* changed, deliberately. |
| 11 | Nested confirmations `inert` | **Assumed unchanged.** `SaveLoad` untouched. |
| 12 | No "Refresh the page" in export messages | **Verified.** `transactions.spec.ts` re-asserts it. |
| 13 | 48px minimum control height; overlay covers no control | **Verified.** Every visible button measured at 360px and at 1440px; the overlay's wrapper passes pointer input through. The one place the overlay *would* have covered something — the top-edge warning banner — was moved. |
| 14 | No positional selectors on interactive elements | **Verified.** `phase2CssContract.test.ts` green; every new rule keys on a role or element class. |

---

## Gates

| Gate | Result |
|---|---|
| `npx tsc -b` | clean |
| `npm run lint` | clean, zero warnings |
| `npx vitest run` | **499/499**, 37 files (was 492/492) |
| `npm run build` | clean (pre-existing >500 kB chunk advisory only) |
| `npx playwright test --project=chrome` | **68/68** (was 65/65) |
| `npx playwright test --project=msedge` | **68/68** (was 65/65) |

`historicalPreparationCli.test.ts` did not flake across the runs in this session.

---

## Out of scope, unchanged

`prefers-reduced-transparency` (no Playwright emulation) and physical 200% browser zoom remain
`02-28`'s physical acceptance matrix, exactly as `02-24` assigned them. No historical geometry
was promoted; the catalog is still Modern-only.

## Coding rules

`.planning/coding-rules/frontend.md` was updated in the same commit as each behavior change:
overlay-outside-the-export-source and its pointer-events corollary, the banner/overlay corner
collision, one `Controls` with a declared variant, two homes for `Reset All Colors`, role-class
keying so a container-scoped rule cannot silently stop applying, the landmark census obligation
for any placement move, and the rule that a focus-order test asserts the SPEC'd order and needs a
RED probe against the arrangement it replaces.
