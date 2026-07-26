---
phase: 02-region-variants-advanced-features-1-5-2-weeks
review: wave789
reviewed: 2026-07-25T00:00:00Z
depth: deep
range: d31d3ee..f33c6ea -- . ':(exclude).planning'
reviewer: non-author (gsd-code-reviewer)
files_reviewed: 30
findings:
  critical: 0
  high: 2
  medium: 4
  low: 7
  total: 13
status: issues_found
verdict: APPROVE-WITH-FIXES
---

# Phase 2 Waves 7-9 — Independent Non-Author Review

Range reviewed: `git diff d31d3ee..f33c6ea -- . ':(exclude).planning'`
(30 source files, +4831 / -429). Working tree was never touched; everything read via
`git show` / `git diff` on the pinned range.

Commits in range, mapped to plans:

| Plan | Commits | Touches `src/App.tsx`? |
|---|---|---|
| `02-30` | `9476064`, `618be42`, `f32b42d` | yes — 139 lines (export transaction extraction) |
| wave-6 fixes | `e3f1fa2`, `8641878`, `2084ee4`, `e54601a`, `8d6d898`, `6cd3298` | `e3f1fa2` only (+8, the `invalid-composition` toast branch) |
| `02-22` | `d8b1529`, `792e637`, `432b0a9` | `792e637` only (1 line: `onStartColoring` → `onStartCreating`) |
| `02-23` | `e33ce55`, `7603c33`, `256ea4c` | **no** |
| inode fix | `2f08050` | no |
| `02-24` | `5737be3`, `35b4043`, `a279146`, `f33c6ea` | no |

---

## The `02-23` byte-identical claim: **HELD.**

`e33ce55` touches `src/App.test.tsx` + `.planning/coding-rules/frontend.md`.
`7603c33` touches `tests/e2e/**` + `.planning/coding-rules/frontend.md`.
Neither touches `src/App.tsx` or `src/main.tsx`. `src/main.tsx` does not appear anywhere
in the range's file list. The three claims reconcile cleanly: `02-30` moved the export
transaction out of `App`, wave-6 added the `invalid-composition` outcome branch, `02-22`
renamed one prop, and `02-23` added guards only. Good judgment, correctly reported.

---

## Checks that came back clean (stated explicitly)

**1. The legend-sibling trap — guards intact and strengthened.**
`src/App.test.tsx:350-371` renders the *real* `App` (only `useGeoData` and the three
transaction hooks are mocked; `MapWorkspace`/`MapCanvas`/`LegendOverlay` are real), so the
string-index containment check is not fixture-based. It is also not vacuous: a legend
emitted before the SVG fails `legendIndex > cameraIndex`, and one emitted after fails
`legendIndex < svgEnd`. `tests/e2e/persistence.spec.ts:360-380` adds the real-app
`svg.map-canvas > [data-layer="legend"]` count-1 assertion plus a
`closest('[role="listbox"]') === null` check, and `tests/e2e/phase2-composition.spec.ts:934-1000`
adds a *behavioural* detach test that physically reparents the legend out of the canonical
SVG, asserts the refusal copy, asserts the retry affordance is absent, asserts the colors
survive, and then re-attaches and proves the gate is not stuck. Nothing was weakened or
relocated to a fixture. One residual hole is documented under LOW-1 below.

**2. `CameraFreezeLease` — clean.** Every exit from
`src/hooks/useCompositionExportTransaction.ts:96-186` was traced: `already-active`,
`legend-blocked`, `getLegendBlocker` throw, null handle, `freezeAndSnapshot` throw,
`commitCamera` throw, `finalizeSelectedScene` throw, `getExportSource` throw, null export
source, `exportMap` rejection, success. `isActive = true` is set only after the last
synchronous refusal and before any `await`; `lease?.release()` and `setBusy(false)` are both
in the outermost `finally`, each individually try/caught, and `isActive = false` is the first
statement in that `finally`. `report()` runs after the `finally`, and a throwing `onOutcome`
is caught. The hook creates the transaction once (`transactionRef.current ??=`) with a
`[]`-dep callback and reads every dependency through `optionsRef`, so no re-render can hand
out a fresh activation flag mid-export. `useCompositionExportTransaction.test.tsx` covers
each of those paths with `effectiveReleaseCount === 1`. No stuck-gate regression.

**3. History invariant — clean.** `compositionName` (`src/App.tsx:203`) and
`savedColorsBaseline` (`src/App.tsx:194`) are both App-local `useState`. Neither is passed to
`useMapState`/`MapStateProvider`, and neither appears in any history snapshot. `setCompositionName`
is called only from `handleSaveComposition`/`handleLoadComposition` on a committed outcome.
Selection never enters history.

**4. `id` stripping — mostly clean.** `collectReferencedIds` (`src/utils/export.ts:57-88`)
walks *every* attribute value, so `fill`/`stroke`/`clip-path`/`mask`/`filter`/`marker-*` and
the inline `style` attribute are all covered by `URL_REFERENCE_PATTERN`, and `href`/`xlink:href`
by `HASH_REFERENCE_ATTRIBUTES`. `aria-labelledby`/`aria-describedby` correctly do *not*
preserve their targets, because every `aria-*` attribute is stripped in the same pass, so the
reference cannot dangle. `matchAll` on a `/g` regex does not mutate `lastIndex`, so the
module-level pattern is re-entrant. The one gap is LOW-2.

**5. `.app { overflow-x: hidden }` removal — clean.** Nothing in `App.css`, `Controls.css`,
`MapCanvas.css`, or `theme.css` depends on `.app` being a scroll container. `body` retains
horizontal containment, and `phase2CssContract.test.ts:490-495` pins the absence. The sticky
`.app > header` (`App.css:37-49`) only works because of this removal.

**6. PNG contract — clean.** `EXPORT_SIZE` dimension check retained
(`src/utils/export.ts`, `canvas.width !== EXPORT_SIZE` → `invalid-dimensions`), opaque white
frame + `colorScheme: 'light'` retained, geometry-preserving sanitizer unchanged apart from the
id fix, `SCENE_PATH_SELECTOR` still `path.scene-path,path.country-path` (wrapped date-line
repeats still normalized). `responsive.spec.ts:642-673` exports in three real browser contexts
and asserts 1080x1080 in all three (see MEDIUM-2 for the limit of its *content* claim).

**7. Coverage deletion — clean.** The 429 deletions decompose as: 117 lines moved verbatim into
`tests/e2e/support/appHarness.ts`, 126 into `tests/e2e/support/historicalFixture.ts`, ~63 toast
copy-string updates, and the `App.tsx` export-transaction extraction. `phase2-composition.spec.ts`
lost zero `test(...)` blocks and gained two. No assertion class was dropped.

**8. Inode precision fix — clean.** `stat(absolutePath, { bigint: true })` at
`scripts/prepareHistoricalSnapshot.mjs:2346`; the only consumer immediately stringifies both
fields (`identityKey` at :2352-2354), so there is no BigInt/Number mixed comparison that would
throw `TypeError`.

**9. Toast allowlist tightening — clean.** The new
`CENTERED_MESSAGE_PATTERN = /^Centered on \p{Lu}[\p{L}\p{N} .,'’()&/-]{0,59}\.$/u`
was run against all 195 names in `public/data/world-modern.geojson`. Zero rejections; longest
name is 36 chars (`United States Minor Outlying Islands`). The `getPeriodFailureMessage`
addition to `APPROVED_PERIOD_ANNOUNCEMENTS` does not widen reachability — `resolvePeriodOptions`
still gates the selector.

---

## HIGH

### HIGH-1: dark mode + `prefers-reduced-transparency` (or `prefers-contrast: more`) makes the app bar, desktop inspector, and map-navigation cluster unreadable

**Files:** `src/styles/theme.css:106-131` (dark `:root`), `:153-162`
(`@media (prefers-reduced-transparency: reduce)`), `:164-178` (`@media (prefers-contrast: more)`)

`--glass-app-bar`, `--glass-inspector`, and `--glass-navigation` are given *dark* values inside
`@media (prefers-color-scheme: dark)` (theme.css:123-125). The two accessibility-preference
blocks that follow reset the same three tokens to hard-coded **light** hexes
(`#f8fafc` / `#ffffff` / `#ffffff`, theme.css:155-157 and :171-173) with no dark variant. They
appear later in source order at equal specificity, so they win in dark mode.

**Failure scenario.** OS is in dark mode and the user has "Reduce transparency" on (macOS
Accessibility → Display, Windows Settings → Personalisation → "Transparency effects" off), or
"Increase contrast" on. Load the app at ≥768px:

- `.app > header` (`App.css:44`, `background: var(--glass-app-bar)`) paints `#f8fafc`.
  `--text-primary` is still `#f8fafc` from the dark block. Contrast **≈ 1.0:1** — the `<h1>`,
  the tagline, and the Show Help button label are invisible.
- `.workspace--desktop .workspace__control-column` (`App.css:188`,
  `background: var(--glass-inspector)`) paints `#ffffff` with the same `#f8fafc` text — the
  entire desktop inspector column becomes unreadable.
- `.map-navigation__cluster` (`MapCanvas.css:177`) paints `#ffffff`; the three
  `currentColor` zoom/pan icons are `#f8fafc`.

The user who explicitly asked for **more** contrast gets ~1:1.
(`@media (max-width: 767px)` escapes this for the header only, because `App.css:276-279`
overrides `background: var(--surface-card)`. Nothing rescues the inspector or the navigation
cluster, and 768-1199px is fully affected.)

`phase2CssContract.test.ts:340-353` actively pins this: it asserts only that the tokens are
non-`rgba` and that the blur is `0`, which the light hexes satisfy. The gate is green while the
defect ships — the same "contract that proves the wrong thing" class this phase has already
been burned by twice.

**Fix:** give each preference block a dark counterpart, or (preferred) stop hard-coding the
opaque value and derive it from the scheme-neutral surface tokens:

```css
@media (prefers-reduced-transparency: reduce) {
  :root {
    --glass-app-bar: var(--surface-card);
    --glass-inspector: var(--surface-card);
    --glass-navigation: var(--surface-card);
    --glass-blur-app-bar: 0;
    --glass-blur-inspector: 0;
    --glass-blur-navigation: 0;
  }
}
/* same substitution in @media (prefers-contrast: more) */
```

and extend the contract test to assert the resolved value is scheme-derived, not a literal
light hex:

```ts
[REDUCED_TRANSPARENCY_CONDITION, CONTRAST_CONDITION].forEach((condition) => {
  const tokens = tokensOf(findRule(THEME_RULES, ':root', [condition]));
  OPAQUE_GLASS_SURFACE_TOKENS.forEach((token) => {
    expect(tokens.get(token)).toMatch(/^var\(--surface-/u);
  });
});
```

### HIGH-2: `prefers-contrast: more` sets near-black text tokens that land on dark surfaces

**File:** `src/styles/theme.css:167-170`

The same block sets `--text-secondary: #1f2937`, `--text-muted: #1f2937`, and
`--border-default: #1f2937` unconditionally. In dark mode `--surface-card` remains `#151b20`
and `--surface-page` remains `#0b0f12`.

**Failure scenario.** Dark mode + "Increase contrast": every element painted with
`var(--text-secondary)` — `.legend-editor__empty p` (`Controls.css`), the country-list
metadata, the saved-map metadata line in `SaveLoad`, the `.app > header p` tagline — renders
`#1f2937` on `#151b20`. Contrast ≈ **1.1:1**. `--border-default: #1f2937` also makes every
hairline on `#0b0f12` effectively invisible, at the exact moment the same block widened it to
`2px` "for contrast".

**Fix:** scope the contrast overrides per scheme:

```css
@media (prefers-contrast: more) {
  :root { --border-width: 2px; --focus-width: 3px; --text-secondary: #1f2937; /* … */ }
}
@media (prefers-contrast: more) and (prefers-color-scheme: dark) {
  :root { --text-secondary: #f8fafc; --text-muted: #e2e8f0; --border-default: #e2e8f0; }
}
```

---

## MEDIUM

### MEDIUM-1: focus can escape the load-confirmation into the non-inert page behind the modal

**File:** `src/components/SaveLoad.tsx:626-660` (the `.save-load-confirm` dialog),
`:487-497` (`onKeyDown` moved to `.save-load-overlay`)

`.save-load-dialog` carries `tabIndex={-1}` (`SaveLoad.tsx:504`). The new sibling
`.save-load-confirm` does **not**. Because the confirmation is now a *sibling* of the dialog
rather than a descendant, it has no focusable ancestor at all — `.save-load-confirm-overlay`
and `.save-load-overlay` are both plain untabbable `div`s.

**Failure scenario.** Colors are dirty → click "Load This Map" → the confirmation opens, the
outer dialog is `inert`, focus is on "Load Saved Map". The user clicks on the confirmation's
body text ("Loading "X" will replace unsaved colors…") to read it. Mouse-down focus targeting
walks up from the `<p>`, finds no focusable ancestor, and focus falls to `document.body`.
From there:

- **Escape does nothing.** The React `onKeyDown` is bound to `.save-load-overlay`
  (`SaveLoad.tsx:487`) and relies on bubbling; a keydown whose target is `document.body` never
  reaches it. The user cannot dismiss the confirmation with the keyboard.
- **Tab escapes the modal entirely.** The trap in `handleDialogKeyDown` is also never invoked,
  and only `.save-load-dialog` is `inert` — the app bar, the map, and the whole inspector
  behind the overlay are not. The next Tab lands on "Show Help" in the app bar, and the user
  can operate the underlying app while a modal claims `aria-modal="true"`.

**Fix:** make the confirmation itself a focus host so mouse-down focus stays inside it, which
restores both the Escape handler and the trap:

```tsx
<div
  ref={confirmDialogRef}
  className="save-load-confirm"
  role="dialog"
  aria-modal="true"
  tabIndex={-1}
  aria-labelledby={confirmHeadingId}
  aria-describedby={confirmBodyId}
>
```

Belt-and-braces: also guard the trap against a lost target —
`if (!trapRoot.contains(document.activeElement)) { event.preventDefault(); firstElement.focus(); }`
already exists but is unreachable when the handler itself never fires, so the `tabIndex` is the
load-bearing part.

### MEDIUM-2: the theme-independence PNG gate passes on a blank white export

**File:** `tests/e2e/responsive.spec.ts:571-640` (`probeExportedPng`), `:642-673`

The gate is `expect(dark.samples).toStrictEqual(baseline.samples)` plus 1080x1080 dimension
checks. It samples an 8x8 grid at `x, y ∈ {0, 135, 270, …, 945}` and asserts only that the
three contexts agree. It never asserts that any sample is non-white, that the red France fill
reached the PNG, or that the legend panel is present.

**Failure scenario.** A regression makes `html2canvas` rasterise the SVG clone as empty (a
`foreignObject`/CORS/`isolation: isolate` interaction is the usual cause) in all three
contexts. All 64 samples are `[255,255,255,255]` in baseline, dark, and forced. The dimension
checks pass (the frame is still 1080x1080 white). The test is green, and every creator ships a
blank white square. This is the same shape as the tautological NFR3 gate this phase already
caught once.

**Fix:** add a content assertion before the cross-context comparison:

```ts
const NON_WHITE = (rgba: ReadonlyArray<number>): boolean =>
  rgba[0] !== 255 || rgba[1] !== 255 || rgba[2] !== 255;
expect(baseline.samples.some(NON_WHITE)).toBe(true);
// and pin the applied color, which is the whole point of the export:
expect(baseline.samples.some((s) => s[0] === 0xdc && s[1] === 0x26 && s[2] === 0x26)).toBe(true);
```
(If no grid point reliably lands on France, probe the known legend-swatch coordinates instead.)

### MEDIUM-3: `--motion-scene` / `--motion-camera` / `--easing-camera` are gated by the contract test but consumed by nothing

**Files:** `src/styles/theme.css:35-38`, `:148-151` (reduced-motion block),
`src/styles/phase2CssContract.test.ts:189-191`, `:364-370`;
`src/components/MapCanvas.tsx:54`

A `var(--…)` census across all four stylesheets shows these three tokens are declared and never
referenced. The crossfade duration is a separate literal, `CROSSFADE_DURATION_MS = 160` at
`MapCanvas.tsx:54`, and reduced motion is honoured by a JS branch at `MapCanvas.tsx:162`
(`prefersReducedMotion ? 0 : CROSSFADE_DURATION_MS`).

**Failure scenario.** `phase2CssContract.test.ts:366-369` asserts
`--motion-scene: 0ms` and `--motion-camera: 0ms` under `prefers-reduced-motion` and reads as
proof that scene and camera motion are suppressed. It proves nothing: delete the JS branch at
`MapCanvas.tsx:162` and the crossfade animates at full 160ms under reduced motion while that
test stays green. Two sources of truth for the same duration, one of them inert.

**Fix:** either consume the tokens (read them via `getComputedStyle` in `MapCanvas`, or move
the crossfade to a CSS transition keyed on `--motion-scene`), or delete the three tokens and
their assertions and let `MapCanvas.test.tsx` own the reduced-motion contract.

### MEDIUM-4: the export-isolation contract does not cover `.map-unit-path`, and `.scene-path` has no rules at all

**File:** `src/styles/phase2CssContract.test.ts:540-546`
(`EXPORT_CONTENT_PATTERN = /\.map-canvas|\.country-path|\.scene-path|\[data-layer=|\.map-export-source/u`)

Every rendered path gets `scene-path` plus one of `country-path` / a decorative class /
`map-unit-path` (`MapCanvas.tsx:518-524`). A grep of all four stylesheets finds **zero** rules
for `.scene-path` and **zero** for `.map-unit-path` — `.country-path` is the only styled path
class. `.map-unit-path` is not in `EXPORT_CONTENT_PATTERN`.

**Failure scenario.** A future styling pass adds
`.map-unit-path { filter: brightness(0.98); box-shadow: 0 0 2px rgba(0,0,0,.2) }` to dim
non-selectable units. Those paths *are* in the export clone (the sanitizer's inline overrides
cover `stroke`/`stroke-width` only, not `filter` or `box-shadow`). `html2canvas` approximates
the filter differently from the browser, so the exported PNG's non-selectable landmass differs
from what the creator sees — and the export-isolation gate never fires, because the selector
matches none of its five patterns.

**Fix:** add the class to the pattern and assert the class list is exhaustive against
`MapCanvas.tsx`:

```ts
const EXPORT_CONTENT_PATTERN =
  /\.map-canvas|\.country-path|\.scene-path|\.map-unit-path|\[data-layer=|\.map-export-source/u;
```

---

## LOW

### LOW-1: a legend rendered outside `getExportSource()` still passes `isSingleCanonicalComposition`

**File:** `src/utils/export.ts:110-132`

The guard compares `source.querySelectorAll(LEGEND_LAYER_SELECTOR).length` against
`svg.querySelectorAll(...)`. A legend reparented out of `svg.map-canvas` but still inside the
export source is caught (1 vs 0). A legend rendered as a sibling of the export source *wrapper*
— e.g. a refactor that hoists `<LegendOverlay/>` up to `App`'s `workspace__map` div — yields
`0 === 0`, the function returns `true` (theered "never had a legend" branch), and the PNG ships
legend-less with a success toast. This is a documented tradeoff (an uncolored map legitimately
has no legend), and the only guards are the containment assertions in `App.test.tsx:356-357`
and `persistence.spec.ts:373-375`. Worth recording in `.continue-here.md` invariant 6 so the
next author knows the structural gate alone does not cover it.

### LOW-2: `collectReferencedIds` misses id references in `<style>` CSS text

**File:** `src/utils/export.ts:63-88`

The walk reads `element.getAttribute(name)` only. A `<style>` element inside the SVG carrying
`.swatch { fill: url(#legend-gradient) }` is text content, not an attribute, so
`legend-gradient` is not collected, the `id` is stripped, and the gradient disappears from the
PNG while the on-screen map is unaffected. No `<style>` element currently exists inside
`MapCanvas`'s SVG, so this is latent — but the JSDoc at `export.ts:59-62` claims coverage it
does not have. Add `element.tagName.toLowerCase() === 'style' ? element.textContent : ''` to the
scanned strings, or narrow the comment.

### LOW-3: `.app` / `.app > header` duplicate-rule blind spot in `findRule`

**Files:** `src/styles/App.css:258-266` and `:276-279`;
`src/styles/phase2CssContract.test.ts:117-135`, `:490-495`

`@media (max-width: 767px)` declares `.app > header` twice, separated by `.app > header button`.
`findRule` returns the *first* match for a `(selector, conditions)` pair, so any future
assertion on the mobile header would silently read only half the declarations. The same shape
means the `.app` overflow guard (`:490-495`) is defeated by appending a second top-level
`.app { overflow-x: hidden }` rule later in `App.css` — exactly the regression that guard
exists to prevent. Merge the two `.app > header` blocks and make `findRule` throw on a
duplicate `(selector, conditions)` pair rather than returning the first.

### LOW-4: `--map-fill-non-selectable` and `--map-border-historical` are declared, gated, and unused

**File:** `src/styles/theme.css:80`, `:82`

Both are in `FIXED_EXPORT_TOKENS` and covered by the "declared exactly once" and "never
redefined outside the unconditioned root" tests, which reads as proof that the non-selectable
fill and the historical border treatment are locked to the export. No CSS rule and no TS module
references either token. Non-selectable units (`.map-unit-path`) and historical boundaries carry
whatever the JS attribute writes, not the UI-SPEC value. Either wire them up or drop them.

### LOW-5: `Controls`' `exportActivationLocked` releases on the next microtask

**File:** `src/components/Controls.tsx:46-59`, `src/App.tsx:783-785`

`App`'s `handleExport` is `(): void => { void exportPng(); }` — it discards the promise. So
`await onExport()` in `Controls` resolves immediately and the `finally` clears the ref one
microtask after the click, not when the export finishes. The comment at `Controls.tsx:43-45`
("a second activation in the same tick would otherwise start a second export while the first
still holds the camera lease") describes a guarantee this code no longer provides. In practice
the export is still protected — React flushes the discrete click synchronously so
`isExporting` is `true` (and the button `disabled`) before the microtask runs, and
`createCompositionExportTransaction` refuses re-entry with `already-active` regardless. Fix the
comment, or have `App.handleExport` return the promise so the local lock means what it says.

### LOW-6: `compositionName` is never cleared, so an export can be named after a map that no longer exists

**File:** `src/App.tsx:203`, `:759-781`

`setCompositionName` is only ever called with a name on a committed save or load. Deleting that
saved map from `SaveLoad` (`handleDelete`) does not clear it, and neither does "Reset All
Colors". Save "Baltic Tour" → delete it from Saved Maps → Reset All Colors → Export PNG
downloads `Baltic_Tour_2026-07-25.png` for a blank map with no stored counterpart. Low impact,
but it contradicts the "composition identity" framing in the comment at `App.tsx:197-202`.
Clear it in the delete path and on reset, or state the intent.

### LOW-7: `touch-action: none` on `.map-canvas` disables browser pinch-zoom over the square

**File:** `src/styles/MapCanvas.css:119-122`

The change from `manipulation` to `none` is correct for d3-zoom gesture ownership, but it also
removes the user agent's own pinch-to-zoom inside the square. A low-vision creator on a phone
who pinches over the map zooms the *map camera* rather than magnifying the page. Page scroll is
still reachable (the square is `aspect-ratio: 1` so it occupies ~375px of a ~667px mobile
viewport, leaving the inspector as a scroll origin), so this is not a scroll trap. It is a
`02-28` physical-matrix cell that should be recorded explicitly rather than assumed benign, and
it does not conflict with the 44/48px target rules — `MapNavigation`'s buttons carry inline
`inline-size:44px; block-size:44px` (asserted at `MapNavigation.test.tsx:29-30, 50-51`).

### LOW-8: the CSS contract parser is naive about `;` and `{}` inside values

**File:** `src/styles/phase2CssContract.test.ts:40-115`

`declarationsOf` splits on `;` and `parseRules` counts braces without string/`url()` awareness.
A `background: url("data:image/svg+xml;base64,…")` or a `content: "}"` would silently corrupt
every downstream assertion in the file rather than failing loudly. No such value exists today.
Consider asserting the round trip (`rules.length > 0` and the re-serialised body length matches)
or noting the constraint in the file header.

---

## Verdict

**APPROVE-WITH-FIXES** — critical: 0, high: 2.

The load-bearing engineering in this range is sound. The export transaction extraction is the
strongest piece of work in the diff: every lease path is traced, tested, and released, and the
legend tripwire is now backed by a real behavioural E2E test rather than a fixture. The `02-23`
byte-identical claim is accurate, and the coverage extraction dropped nothing.

The two HIGH findings are both in `02-24`'s new preference layer and both share one root cause:
accessibility-preference blocks that hard-code light values without a dark counterpart, gated by
a contract test that asserts only "not `rgba`" and therefore pins the defect. HIGH-1 and HIGH-2
should be fixed before `02-28` is handed to the owner — the physical acceptance matrix includes
dark-mode and high-contrast cells that will fail, and the automated cells would be pre-filled as
green.

MEDIUM-1 (focus escape from the load confirmation) should be fixed in the same pass; it is a
one-line `tabIndex={-1}` and it undoes the `inert` work `2084ee4` just landed.

MEDIUM-2 and MEDIUM-3 are the recurring "gate that proves the wrong thing" pattern this phase
has already been burned by twice. Neither is a shipping defect today, but leaving them means the
next regression in exactly those areas ships green.

---

_Reviewed: 2026-07-25_
_Reviewer: independent non-author (gsd-code-reviewer)_
_Depth: deep (cross-file, pinned range only, working tree untouched)_
