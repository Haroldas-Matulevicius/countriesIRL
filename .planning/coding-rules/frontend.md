# Coding Rules: Frontend

**Read alongside general.md.** Covers React components, hooks, D3 integration, SVG rendering, styling, performance.

---

## React & Hooks

**Functional components always.** No class components.

**Never import React on every file.** Only import it in files that use JSX.

```typescript
// ✅ Good — file has JSX
import React from 'react';
export function ColorPicker() { return <div>...</div>; }

// ✅ Good — pure utility, no JSX
function isValidHex(hex: string): boolean { ... }

// ✅ Good — TypeScript + JSX, no React import needed (Vite auto-transpiles)
export function MapCanvas() { return <svg>...</svg>; }
```

**Custom hooks own their side effects.** Logic lives in the hook, not the component.

```typescript
// ✅ Good — hook owns the fetch + state
function useGeoData() {
  const [features, setFeatures] = useState<GeoFeature[]>([]);
  useEffect(() => {
    fetch('/data/europe-modern.geojson')
      .then(r => r.json())
      .then(setFeatures);
  }, []);
  return features;
}

function MapCanvas() {
  const features = useGeoData();
  // component only renders
}

// ❌ Bad — logic split across hook and component
function useGeoData() {
  const [features, setFeatures] = useState<GeoFeature[]>([]);
  return { features, setFeatures };
}

function MapCanvas() {
  const { features, setFeatures } = useGeoData();
  useEffect(() => {
    fetch('/data/europe-modern.geojson')
      .then(r => r.json())
      .then(setFeatures);
  }, []);
  // ...
}
```

**useCallback for event handlers.** Prevents unnecessary re-renders of children.

```typescript
// ✅ Good
const handleCountryClick = useCallback((countryId: string) => {
  dispatch({ type: 'SET_COLOR', payload: { countryId, color: '#FF0000' } });
}, [dispatch]);

return <MapCanvas onCountryClick={handleCountryClick} />;

// ❌ Bad — new function on every render
return (
  <MapCanvas
    onCountryClick={(id) => dispatch({ type: 'SET_COLOR', payload: { id } })}
  />
);
```

**useReducer for complex state.** MapState is perfect for it — color history, undo/redo, selection.

**useRef for uncontrolled values.** SVG DOM refs (MapCanvas, export target).

**useEffect cleanup.** If loading async data, abort on unmount.

```typescript
// ✅ Good
useEffect(() => {
  const controller = new AbortController();
  fetch('/data/...', { signal: controller.signal })
    .then(r => r.json())
    .catch(e => !controller.signal.aborted && setError(e));
  return () => controller.abort();
}, []);
```

---

## D3 Integration

**D3 lives in useEffect / useLayoutEffect, not render.** D3 mutates DOM; React renders JSX. They don't mix in the function body.

**Pattern:** useRef for SVG container, useEffect for D3 setup/updates.

```typescript
// ✅ Good
function MapCanvas({ features, colors }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!features.length || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const projection = d3.geoMercator().fitExtent(/* ... */);
    const pathGenerator = d3.geoPath().projection(projection);

    svg.selectAll('path')
      .data(features, d => d.id)
      .join('path')
      .attr('d', d => pathGenerator(d.geometry));
  }, [features, colors]);

  return <svg ref={svgRef} />;
}

// ❌ Bad — D3 in render
function MapCanvas() {
  const svg = d3.select('svg'); // Wrong! This mutates on every render
  // ...
}
```

**Stable keys in D3 data joins.** Use `.data(features, d => d.id)` so D3 doesn't recreate every path on rerender.

**Only update what changed.** Separate enter/update/exit:

```typescript
svg.selectAll('path')
  .data(features, d => d.id)
  .join(
    enter => enter.append('path'),
    update => update,  // Often identity, update in a separate .attr() chain
    exit => exit.remove()
  )
  .attr('fill', d => colors[d.id] || '#FFF');
```

**No D3 event handlers mixed with React event handlers on same element.** Pick one:

```typescript
// ✅ Good — D3 handlers
svg.selectAll('path')
  .on('click', (event, d) => handleClick(d.id));

// ✅ Good — React handlers
return <g onClick={() => handleClick(id)} />;

// ❌ Bad — mixing them
svg.selectAll('path')
  .on('click', handleD3Click)
  .on('mouseover', handleMouseOver);
// ...then also:
<g onClick={handleReactClick} />  // Unpredictable precedence
```

**Performance: memoize projections.** `d3.geoMercator().fitExtent()` is expensive. Do it once per data shape, not per render.

**The projection is fixed; the camera moves (Phase 2).** `createWorldProjection()` in
`src/utils/mapProjection.ts` builds one whole-world `geoMercator` and that is the only
projection the app ever constructs. Centering, framing, and zoom are a **transform on
`g[data-layer="camera"]`**, never a re-projection.

This replaces the Phase 1 note that Phase 2 would add `geoAzimuthalEquidistant` for centered
maps. D-01 chose one full-world canvas over per-region modes, and re-projecting per centre
country would break three things at once: path `d` strings would change on every pan, so the D3
join could no longer key on `id`; the export clone's geometry would depend on camera state; and
`isWholeWorldCamera`'s tolerance check would have nothing stable to compare against. Reproject
only if the projection *itself* is being changed for every scene simultaneously — not to centre
on a country.

---

## SVG & Rendering

**SVG over Canvas for interactivity.** Each country is a clickable path element — native browser hit detection, hover states, selection visual feedback.

**Declarative class names over inline styles.** Use CSS for hover/active states.

```typescript
// ✅ Good
svg.selectAll('path')
  .attr('class', d => `country-path ${d.id === selectedCountry ? 'selected' : ''}`)
  .attr('fill', d => colors[d.id] || '#FFF');

// With in MapCanvas.css:
// .country-path { cursor: pointer; transition: stroke 150ms; }
// .country-path.selected { stroke: black; stroke-width: 2px; }

// ❌ Bad — inline styles fight CSS
.style('cursor', 'pointer')
.style('stroke', d => d.id === selectedCountry ? 'black' : 'gray')
// Hard to override, no hover states
```

**Namespace SVG elements correctly.** Use D3's `.append('svg:path')` if appending to non-SVG parent (rare in Phase 1).

**Viewbox over fixed width/height** for responsive SVGs (Phase 3; Phase 1 can be fixed 1080×1080).

---

## Styling & Tailwind

**Phase 1 uses plain CSS, not Tailwind.** (Tailwind can be added in Phase 2 if desired.)

**Organize styles by component.** `MapCanvas.css` for MapCanvas, `Controls.css` for Controls.

**CSS variables for theming.** `--primary`, `--success`, `--danger`, etc. (defined in `theme.css`).

```css
/* theme.css */
:root {
  --primary: #667eea;
  --success: #48bb78;
  --danger: #f56565;
}

/* App.css */
.btn-primary { background: var(--primary); }
.btn-success { background: var(--success); }
```

**Use CSS custom properties for dynamic theming.** Phase 3 can add dark mode by flipping `:root` variables.

**BEM naming optional** (Block–Element–Modifier). For Phase 1, keep it simple.

**No CSS-in-JS.** Stick to `.css` files.

---

## Component Structure

**One component per file.** `MapCanvas.tsx` exports `MapCanvas`, not `MapCanvas` + `MapCanvasInner` + helper.

**Props interfaces at top.** Explicit, typed, documented.

```typescript
interface MapCanvasProps {
  features: GeoFeature[];
  colors: Record<string, string>;
  selectedCountry: string | null;
  onCountryClick: (countryId: string) => void;
  onCountryHover: (countryName: string | null) => void;
}

export function MapCanvas({ features, colors, ... }: MapCanvasProps) {
  // ...
}
```

**Small components.** If a component is >300 lines, break it into smaller pieces.

**No prop drilling.** Pass context down (App → MapCanvas), not through 5 intermediate components.

---

## Performance

**React.memo for pure components.** ColorPicker, CountryList are pure (no internal state).

```typescript
export const ColorPicker = React.memo(function ColorPicker({ currentColor, onColorChange }: Props) {
  return (/* ... */);
});
```

**Stable keys in lists.** `<CountryList countries={countries} />` → `.map((country, idx) => <button key={country.id} ...>)`.

**Defer large renders.** If MapCanvas is slow, render it in a Suspense boundary (Phase 2+).

**No array/object creation in render.** Use useMemo if you need to derive data.

```typescript
// ❌ Bad — new array on every render
const sortedCountries = [...countries].sort();

// ✅ Good — memoized
const sortedCountries = useMemo(() => [...countries].sort(), [countries]);
```

---

## Accessibility

**Buttons must be `<button>`, not `<div onClick>`.** Keyboard focus, screen readers.

**SVG paths need labels.** Use `<title>` or `aria-label`.

```typescript
// ✅ Good
svg.selectAll('path')
  .append('title')
  .text(d => d.properties.name);

// ✅ Also good
svg.selectAll('path')
  .attr('aria-label', d => `${d.properties.name}, color ${colors[d.id] || 'white'}`);
```

**Color-blind users:** Don't rely on color alone for information. Add a label or pattern.

**Keyboard navigation.** Arrow keys to move between countries, Enter to toggle selection.

---

## Testing

**Manual testing checklist for Phase 1:**
- [ ] Click a country; it highlights and color picker appears
- [ ] Select color from palette or enter custom hex
- [ ] Undo/redo works (click country, change color 5 times, undo 3 times)
- [ ] Reset clears all colors
- [ ] Save a map, reload the page, load it back
- [ ] Export PNG is exactly 1080×1080
- [ ] No console errors

**Storybook stories (optional, Phase 2+):** ColorPicker, CountryList with sample data.

**Browser fixtures shared by two specs live in `tests/e2e/support/`, never copied.** A
hand-maintained second copy of a snapshot asset or saved record drifts, and then two specs
assert against two different scenes while both stay green. Support modules are not matched by
Playwright's `testMatch`, so they carry helpers safely. A support fixture is still a fixture: it
is served by a route and never promotes geometry into `public/data`.

---

## The Phase 3 Token System (D-03 → D-10, D-26, D-30)

**Read this before §Visual Tokens and Preference Fallbacks below, which it supersedes on every
point the two disagree.** The Phase 2 section is retained because Phase 1 and Phase 2 evidence
cites it; where it says `prefers-color-scheme`, `--glass-*`, `--accent`, or
`phase2CssContract.test.ts`, this section is what actually ships.

**Colour tokens are Themely's `--themely-*` names, vendored verbatim. No value may be adjusted.**
Type roles are `--text-*`, motion is `--motion-*`; spacing, focus, radii, and the CountriesIRL-only
`--map-*` / `--tooltip-*` export set keep their local names. The namespace is not cosmetic — it is
the transition-readiness requirement in its smallest form: a host's `globals.css` can become the
token source and our declarations act as fallbacks, with no rename and no shim.
`themeTokens.test.ts` holds an **explicit namespace allowlist**, so a retired un-namespaced name
cannot quietly reappear beside the token that replaced it.

**Where a surface needs a value the Themely palette does not give it, the surface gets its own
token — the palette value is never edited.** This is the owner's own move, made twice:

| Surface | Its own token | The measurement that forced it |
|---|---|---|
| `Export PNG` fill | `--accent-fill` / `--accent-fill-hover`, mode-invariant | white on `--themely-apple-blue` dark `#2997ff` is **3.02:1**, and its hover `#1a7fd4` is **4.18:1**. `#0071e3` is **4.70:1** in both modes |
| Destructive text and fills | `--destructive`, light `#b42318`, dark `var(--themely-red)` | `--themely-red` light `#ff5252` is **3.05:1** on Porcelain and white on it is **3.19:1** |

**`--themely-ghost-gray` carries no text in this app.** Measured against this palette it is
**3.88:1** on Porcelain and **3.60:1** on Powder in dark mode. It stays declared, unadjusted, for
palette parity; tertiary meta uses `--themely-slate-blue`. That restriction is a **gate**, not a
paragraph — `uiContract.test.ts` fails any rule that sets `color` from it. A token excluded from a
contrast matrix with only a comment to explain it is an exception wearing a different hat.

**The dark flip is a class on the editor mount root, and NO stylesheet reads an operating-system
colour preference** (D-30). `prefers-reduced-motion`, `prefers-reduced-transparency`,
`prefers-contrast`, and `forced-colors` remain legitimate and are all still in use; D-30 forbids the
colour-scheme query only. The Phase 2 rule *"a preference media query must define BOTH schemes"*
survives, restated in class terms: **any preference override of a colour must be declared for both
`:root` and `.dark` inside the same at-rule**, because the preference block is authored after the
palette at equal specificity — `.dark` and `:root` are both 0-1-0, so source order decides, and a
`:root` literal inside `prefers-contrast` wins in dark mode unless the same at-rule answers it.

**Live Invariant 9 now covers `.dark` as well.** The mode-invariant set — `--map-*`, `--tooltip-*`,
`--swatch-border`, plus `--accent-fill*` — is declared **exactly once, in the unconditioned
`:root`**, and appears in no `.dark` block, no media query, and no `@supports` block. `.dark` is the
likeliest hiding place precisely because it is where every other colour legitimately gets a second
value.

**Delete, never alias.** Every retired token is gone rather than pointed at its replacement:
`--accent*`, `--surface-*`, `--text-primary/secondary/muted`, `--border-default/strong`, the whole
`--glass-*` family, `--shadow-inspector/navigation`, `--modal-shadow`, `--toast-shadow`,
`--font-label/body/heading/display`, `--weight-regular/semibold`, `--radius-large`, `--map-shadow`,
`--mixed-color-*`, `--active-check-*`, and the absorbed motion names `--motion-fast`,
`--motion-camera`, `--easing-camera`, `--easing-control`. An alias would let 64 stale `--glass-*`
references keep working while looking migrated; a deletion makes each one fail at the contract test.

**`backdrop-filter` is banned outright.** Not an approved-surface allowlist — a blanket ban, because
an allowlist has to be maintained and a rotted allowlist reads exactly like an enforced one. The ban
covers at-rule conditions too: a `@supports (backdrop-filter: …)` wrapper with an emptied body is
scaffolding waiting to be refilled.

**Elevation is flat with hairlines.** `--hairline` (a `box-shadow`) for cards, inputs, list rows,
and panel sections; `--hairline-color` where a boundary must still occupy layout;
`--popover-shadow` for floating chrome; `--dialog-shadow` for the one dialog surface. **A hairline
is still a `box-shadow`**, so the export-unsafe guard is *more* load-bearing after this phase than
before it, not less.

**Every declared token needs a consumer, and the TS mirror does not count.** `03-02` widened the
motion-consumer check to accept a named read in `src/lib/motion/tokens.ts`, which for
`--motion-ease-snappy`, `--motion-ease-in`, and `--motion-duration-slow` meant the only "consumer"
was the file being compared. `03-04` gave all three a rendering consumer — the snappy curve on
control micro-feedback, the slow duration on the theme crossfade, the exit curve on the panel's
*close* — and the gate is back to Phase 2 strength: a CSS `var()` in a rule that paints, or a named
read in `utils/motion.ts`. Nothing else.

**The type scale is ten `--text-*` roles, each bundling size, line-height, weight, and tracking.**
`theme.css` ships a `.text-<role>` class for **eight** of them and deliberately not for
`--text-display` and `--text-stat`: a class for all ten would make every role trivially "consumed"
and the closed consumer exemption would pass no matter what.

**A contract matrix asserts its own row count from a LITERAL, never from the tables it iterates.**
`cases.length * pairs.length` reads like the same claim and is not one — emptying either table moves
the expectation with the matrix and leaves the count "correct" at zero. This was measured, not
reasoned: the first RED probe against the Phase 3 contrast matrix emptied its case table and the row
count stayed green.

**`uiContract.test.ts` is the only CSS contract test.** `phase2CssContract.test.ts` was deleted by
`03-04` after every one of its 29 assertions was either carried forward or retired against a named
decision, with the per-assertion mapping and the count delta recorded in `03-04-SUMMARY.md`. A
skipped contract test is a gate that cannot fail wearing a different hat, so it was deleted rather
than skipped.

---

## Visual Tokens and Preference Fallbacks (Phase 2)

> **Superseded in Phase 3 on tokens, glass, and the colour-scheme query — see §The Phase 3 Token
> System above.** Retained because Phase 1 and Phase 2 release evidence cites it.

**`--map-*` are export tokens: declared once in `:root`, never inside a media or supports
block.** The PNG must be theme- and device-pixel-ratio independent. Redefining
`--map-border-default` under `prefers-color-scheme: dark` would not fail any test that renders
the map — it would just ship a differently-bordered PNG to dark-mode users.
`uiContract.test.ts` walks nested at-rules (a flat regex cannot see the nesting an
accidental override hides in) and asserts each export token is declared exactly once.

**A focus or selection stroke on map geometry uses a `--map-*` token, not `--accent`.** The
chrome accent flips with the OS theme; the square does not.

**Country border state is carried by stroke-*width*, not stroke colour.** Every boundary is
black (`--map-border-default` / `-hover` / `-selected` are all `#000000`), so hover and
selection have nowhere darker to go: 0.75px resting → 1.5px hover → 2px selected, with focus
the one exception (teal `--map-border-focus`, dashed, 3px, because it must read against a
selected country). Do not "fix" the identical colour tokens by lightening the resting border —
the three names stay separate so a future re-tint has a seam to open at, and the export reads
`DEFAULT_BORDER_COLOR` from `src/constants/colors.ts`, which must stay in sync with the token.
Adding a fourth state means adding a weight, not a colour.

**Non-colorable units are visibly different from uncolored countries.** A unit whose
`colorOwnerId` is `null` (disputed/neutral territories - Kosovo, Western Sahara, Antarctica -
12 units in the modern world) fills with `NEUTRAL_UNIT_COLOR`, a solid light grey, in **both**
color resolvers - `getEffectiveFeatureColor` in `utils/scene` and `getSceneFeatureColor` in
`MapCanvas`; fixing only one lets the render-side copy silently win. White made Kosovo read as
a broken colorable country. The neutral fill is a solid color, never a CSS `filter` (export-unsafe),
and it can never reach the legend or the export gate because `getEffectiveSceneColors` excludes
null-owner features. `.map-unit-path` carries `cursor: default` and a lighter stroke; the tooltip
says "Not colorable in this map" instead of announcing a current color. The browser/Locate catalog
stays exactly the 195 core states - neutral units are map-visible, not searchable.

**Widths on map geometry are screen pixels only because the path carries
`vector-effect="non-scaling-stroke"`** (set on `enter` in `MapCanvas`, re-asserted by
`sanitizeExportClone`). Inside the camera's `scale(zoom)` group a bare `stroke-width` is
multiplied by the zoom — see `coding-rules/export.md` for the PNG this shipped.

**Glass is progressive enhancement over an opaque `:root` value.** The translucent value lives
only under `@supports (backdrop-filter: blur(1px))`, and `prefers-reduced-transparency`,
`prefers-contrast: more`, and `forced-colors: active` each restore the opaque baseline and zero
the blur. Readability never depends on what is behind a surface. Glass is permitted on exactly
three surfaces — app bar, inspector shell, map-navigation cluster — and never on the map square,
legend, modal body, toast, or an overlay.

**A preference media query must define BOTH schemes.** `prefers-reduced-transparency`,
`prefers-contrast`, and `forced-colors` are orthogonal to `prefers-color-scheme`, and they are
authored *after* the dark block at equal specificity — so a literal written for one scheme wins
in the other. Restoring `--glass-app-bar: #f8fafc` inside `prefers-contrast: more` painted a
light bar under `--text-primary: #f8fafc` at **1.0:1** in dark mode: the user who asked for more
contrast got the worst contrast in the app.

| Token kind | How the preference block restores it |
|---|---|
| Surface (`--glass-*`) | `var(--surface-card)` — derive; the scheme token already tracks the scheme |
| Text / border literal | pair with an explicit `@media (…) and (prefers-color-scheme: dark)` block |

Derivation is preferred because it makes the defect unrepresentable. Where a literal is
unavoidable (contrast deliberately *darkens* text, which no surface token expresses), the paired
dark block is mandatory and `uiContract.test.ts` enforces the pairing structurally.

**A token contract asserts a relationship, not a shape.** `expect(token).not.toContain('rgba')`
plus `blur === 0` was green through the whole 1.0:1 defect — both are true of a light hex. The
contract now resolves `:root` through the real cascade for each (scheme × preference)
combination, follows `var()` aliases, and asserts a WCAG ratio between the resolved text and the
resolved surface. Before landing a contract assertion, break the thing it covers and watch it go
red; a test that cannot fail on its own subject is worse than no test, because it reads as proof.

**One CSS rule per `(selector, conditions)` pair, and `findRule` throws on a second.** The mobile
block declared `.app > header` twice with an unrelated rule between them; `findRule` returned the
first, so any assertion on the mobile header would have read half its declarations. The same
shape defeats the `.app { overflow-x }` guard outright — append a second top-level `.app` rule and
the guard reads the first and passes, which is exactly the regression it exists to prevent. A
lookup helper that silently picks one of several matches is a false negative generator; make it
throw.

**A declared token needs a consumer, or its contract assertion is theatre.** `--motion-scene`,
`--motion-camera`, and `--easing-camera` were declared, asserted to fall to `0ms` under
`prefers-reduced-motion`, and referenced by nothing. The real durations were the TS literals
`CROSSFADE_DURATION_MS` and `CAMERA_MOTION_DURATION_MS`, and the real easing was d3's default —
so the camera animated for 240ms on the SPEC'd curve's behalf, for a user who asked for no
motion, while the test read as proof that it did not.

- **d3 transitions read tokens too.** `getComputedStyle(element).getPropertyValue('--motion-…')`
  in `utils/motion.ts`, parsed to ms; a `cubic-bezier()` token is solved into an easing function
  for `.ease()`. The TS constant survives only as the unstyled-environment fallback, and that
  fallback still checks `prefers-reduced-motion` itself.
- **`uiContract.test.ts` asserts every `--motion-*` / `--easing-*` / `--map-*` token has a
  consumer** (a CSS `var()` or a named read in `motion.ts`). Deleting an unused token is the other
  valid answer, and the right one when UI-SPEC does *not* name it: `--map-fill-non-selectable` and
  `--map-border-historical` were listed in `FIXED_EXPORT_TOKENS` and covered by the "declared
  exactly once" and "never redefined" tests, which read as proof that the non-selectable fill and
  the historical border were locked to the export. Nothing referenced either, neither appears in
  UI-SPEC, and the historical chain is deferred — so both were dropped rather than invented into
  the render path.

**A local lock is only as good as the promise it awaits.** `Controls` holds a synchronous
export-activation ref released in a `finally` after `await onExport()`. An owner that discards the
promise (`(): void => { void exportPng(); }`) makes that await resolve on the next microtask, so
the lock releases one tick after the click rather than when the export finishes — while its
comment still claims it covers the camera lease. Return the promise from the owner, or delete the
comment; do not leave a lock whose documentation is false.

**Composition identity must be cleared when the thing it names stops existing.** `compositionName`
is set only by a committed save or load and read by the export filename. It also has to be cleared
by `Reset All Colors` and by deleting the saved map it points at, or `Baltic_Tour_<date>.png`
downloads for a blank composition with no stored counterpart. Deleting is the child's event, so
`SaveLoad` reports it upward (`onDeleted`) rather than reaching for App state.

**`filter` is banned on anything that can reach the export clone, and avoided on chrome.**
`filter: brightness()` for a hover tint is one copy-paste from a filter on a `.country-path`,
which html2canvas rasterizes differently than the browser paints it. Author an explicit
`--accent-hover` token instead.

**Border and focus weights are tokens (`--border-width`, `--focus-width`), not literals.** They
are the only reason `prefers-contrast: more` can strengthen every boundary to 2px and every focus
ring to 3px in one place. `1px solid var(--border-default)` opts that rule out silently.

**Positional CSS selectors on interactive controls are banned.** Not just on the action strip —
on any `button`, `input`, `select`, `a`, or `summary`. `:nth-child`, `:first-child`, and
`:last-child` bind a role to an ordinal, and order is copy: the onboarding banner styled its
accent CTA with `button:first-child`, so reordering it would have moved the accent onto
`Dismiss Help` with nothing failing. Key on a role class (`--primary`, `--destructive`,
`--accent`). The ban is enforced by `uiContract.test.ts`, not by review.

---

## The Motion Token Mirror (Phase 3, D-26)

**CSS is the runtime source of truth; `src/lib/motion/tokens.ts` is a TS mirror, never a second
source.** `theme.css` declares the `--motion-*` custom properties, and the mirror exists only so
`motion/react` call sites and d3 transitions can read the same numbers without a second copy of
them. `src/lib/motion/tokens.test.ts` reads `theme.css` as text and fails when either layer moves
alone — that lockstep is the only thing keeping the two honest, because nothing renders differently
when they disagree by 10ms.

**The lockstep test asserts its own row count, three independent ways, and both set memberships
two-way.** A gate that iterates only what it happens to find proves nothing when a row disappears;
that is precisely how three motion tokens were once declared, reduced-motion-gated, and read by
nothing while a test read as proof. Concretely the gate pins: the mirror's row count against a
literal written beside it, every export of `tokens.ts` classified as either mirrored or explicitly
derived (a closed list), and the declared `--motion-*` / `--easing-*` set equal to the accounted-for
set in **both** directions.

**A rename and a retime look identical in a diff, so each reconciliation is a checked claim, not a
comment.** `--motion-fast` / `--motion-camera` / `--easing-camera` are **absorbed byte-identically**
by `--motion-duration-fast` / `--motion-duration-base` / `--motion-ease-out`, and the test asserts
the pairs are *equal*. `--easing-control: ease-out` maps onto `--motion-ease-snappy` and is a
**deliberate retime** (research assumption A8) — the test asserts those two are *different*, so
"simplifying" them into one cannot ship a visible timing change disguised as a cleanup.

**A duration that is close to a token but is not that token stays local, with its reason in the
file.** `--motion-scene` / `SCENE_CROSSFADE_DURATION_MS` is 160ms and is never retimed onto the
150ms token — Themely's do-not-snap idiom. The test asserts both the value and the presence of the
recorded reason, because the value alone invites the next reader to tidy it.

**Derive a duplicate, never restate it.** `CAMERA_MOTION_DURATION_MS` is `DURATION_BASE * 1000`,
not a literal `240`. A `240` sitting beside a `0.24` gives a later reader no way to tell a mirror
from a coincidence, and the gate rejects the literal form outright.

**Known interim weakness, recorded rather than hidden.** `--motion-ease-snappy`,
`--motion-ease-in`, and `--motion-duration-slow` currently have **no `var()` consumer** — the TS
mirror is their only reader until `03-04` lands the stylesheet rewrite. The consumer assertion in
`uiContract.test.ts` was widened to accept a named read in `src/lib/motion/tokens.ts`
*in addition to* `utils/motion.ts`, never instead of it. That is genuinely weaker for those three
tokens than Phase 2's rule was, and `03-04` closes it.

---

## Vendored Animated Icons (Phase 3, D-28)

**Authored in-repo, never installed and never copied byte-for-byte.** `src/components/icons/`
holds 14 glyphs written from lucide path data in the shape of
`themely/src/components/ui/search.tsx`. There is no registry install and **no network at build or
run time** — the forbidden-pattern assertion in `iconContract.test.ts` is what keeps that true
rather than merely intended.

**Translate the recipe; never copy the `className`.** This repo has no Tailwind, so a copied
`className` string produces an element that *looks* wired up and renders unstyled (P-5). The
contract test rejects any Tailwind-shaped sizing token (`h-4`, `w-5`, `size-5`, `min-w-[…]`) in an
icon file for exactly that reason. Sizing is the **`size` prop**, which feeds the svg's own
`width`/`height`; colour is `currentColor`; everything else is a CSS custom property.

**Every icon exports a `forwardRef` component AND a structurally identical `*IconHandle`** with
exactly `{ startAnimation, stopAnimation }` via `useImperativeHandle`. Attaching a ref flips the
internal `isControlledRef`, so the icon's own self-hover defers to the parent — ref-driven and
hover-driven modes never fight. The **row** owns the ref and triggers from ROW hover, not icon
hover (hooks cannot live in a `.map` loop, which is why the row component exists).
`startAnimation()` is gated on reduced motion; `stopAnimation()` is unconditional.

**`strokeWidth={1.5}` is a LOCAL PATCH — upstream ships `2`** — and every file carries the marker
comment saying so. A registry re-add silently overwrites the patch, and a 2px glyph beside a 1.5px
one is a difference nobody reads as a regression.

**`PROVENANCE.md` is an input to a gate, not documentation beside one.** Every file in the
directory carries a dated `read in full — {flags} — YYYY-MM-DD` line, and the test asserts the
recorded set and the directory listing are equal in **both** directions — a file with no line
fails, and a line with no file fails. A one-way subset check would let either side grow silently,
which is the whole failure mode the evidence exists to prevent. **A file with no provenance line
may not be vendored.**

**Record what was scanned for, not just the verdict, and record a flag you decided was benign.**
Every glyph file trips the `http://` scan on `xmlns="http://www.w3.org/2000/svg"`. Writing
"no flags" there would have been false; the line names the hit and why it is inert. A blanket
"no flags" is indistinguishable from a scan nobody ran.

---

## Responsive Composition (Phase 2)

**`overflow-x: hidden` belongs on `body`, never on `.app` or any other element.** On a
non-viewport element it computes `overflow-y: auto`, which makes that element its own scroll
container and silently kills `position: sticky` inside it — the app bar simply never moves and
nothing fails. On `body` the value propagates to the viewport and leaves stickiness intact.

**Never assert "no horizontal page scroll" with `scrollWidth <= clientWidth`.** `body` clips
horizontally, so that comparison is vacuously true no matter how far a control overflows.
Measure the elements: collect the bounding rect of every landmark, workspace section, square, and
action, and assert each fits the viewport. That version can fail.

**A tab-order test must move the sequential navigation starting point, not just blur.** Blurring
leaves the starting point where focus was, so `Tab` resumes from the middle of the document and
"proves" an order that begins wherever focus happened to land. Click a non-focusable element at
the top of the document (the product title) first.

**A focus-order test asserts the SPEC'd order. A test that documents a deviation is a comment,
not a test.** If the composition does not match UI-SPEC 20 yet, the honest move is a failing
test or an open gap — not a green assertion of the wrong order, which converts a temporary
deviation into a pinned requirement that a later fix has to "break". Assert the relative
position of every anchor the spec names, including the ones a control's disabled state removes:
`Zoom Out` is absent at the whole-world fit, and asserting its absence is the difference between
knowing why and not noticing.

**Every focus-order claim needs a RED probe against the arrangement it replaced.** Move the
component back where it was, watch the assertion fail, and put it back. The compact order test
in this phase passed unchanged while `MapNavigation` sat in the action strip *and* after it
became an overlay — it named the deviation in a comment and asserted nothing about it.

**Read a computed style only after its transition settles.** Country paths carry a 150ms stroke
transition, so an immediate read after `emulateMedia` samples a colour in flight. Poll to two
equal consecutive reads.

**Emulation that a browser does not support is not evidence.** Playwright can emulate
`prefers-color-scheme`, `prefers-reduced-motion`, `prefers-contrast`, and `forced-colors`, but
not `prefers-reduced-transparency`. Assert the last one statically and leave it to the physical
acceptance matrix; do not simulate it and label the result browser proof.

**The desktop inspector is one shell.** The `aside` owns the only border, radius, and shadow in
the column; its sections are transparent panes separated by hairlines. Compact and mobile keep
per-section cards because the sections are top-level workspace children there, not shell contents.

**Every block in the inspector column obeys the shell rule, including the ones that are not
`<section>`s.** `.locate-country` is a `div` inside the country-list wrapper, so it inherited
neither the compact card nor the desktop flattening and rendered directly on the page background
at compact — the only block in the column that did. When a new block joins the column, add it to
both the card rule and the `.workspace--desktop .workspace__control-column …` flattening rule in
the same change.

**A row of full-phrase controls has no width at which it fits a 376px column.** `Countries |
Search countries [input] | Select Visible | Clear Selection` as one flex row needed ~412px inside
374px: both actions were clipped to their first letter and the column grew its own horizontal
scrollbar. Stack labelled controls; reserve rows for icon-only or single-word controls.

**`width: max-content` inside an `overflow: hidden` box converts "too narrow" into "silently
clipped".** The preset tiles paired both, so `Magenta` was cut at the tile edge with nothing
failing. Derive a grid's column count from a minimum track wide enough for the longest label
(`repeat(auto-fit, minmax(76px, 1fr))`) instead of fixing the count and hoping the labels fit, and
let overflow be visible so the next one is caught by eye.

**A CSS contract test must assert the property that makes the defect impossible, not the
declarations that happen to be there.** `themeTokens.test.ts` asserted
`grid-template-columns: repeat(5, minmax(0, 1fr))` and `width: max-content` under the name "keeps
preset labels complete" — it pinned the exact pair that clipped them. Before writing a contract
assertion, name the failure it prevents and check the assertion would go red on it.

**An "empty" value that the model normalizes away must read as empty.** `canonicalizeColorMap`
deletes any entry equal to `DEFAULT_COLOR`, so white and uncoloured are one state; painting a
filled chip on all 195 rows made an untouched map read as fully coloured, worst in dark mode where
every row was a bright white square. Unset rows get an outline, coloured rows get a fill — and the
accessible name stays `Current color #FFFFFF`, because the country really is white on the map and
every row locator is keyed on that string.

**Two search surfaces in one column each need a heading and a line saying what they do.** The list
filter and Locate were an input each, stacked, with no headings; they read as the same control
twice. Locate moves the camera and never touches the selection, and that sentence is the whole
differentiator.

**A `max-height` in `vh` on a panel that does not start at the viewport top overflows by exactly
its own offset.** The inspector was capped at `100dvh - 64px` while starting ~105px down, so it ran
past the fold *and* scrolled away with the taller map column — the independent scroll it promised
held only until the creator scrolled. It is `position: sticky` with `top` and the cap both summed
from tokens that clear the app bar. Sticky is only safe because `.app` declares no `overflow`.

---

## Map Chrome and Export Isolation (Phase 2)

**`touch-action: none` belongs on `svg.map-canvas` and nowhere else.** On the page, workspace, or
any ancestor panel it swallows the creator's normal vertical scroll on touch, which is the only
way a mobile user reaches the inspector. Assert the ownership set, not just the value.

**No `filter`, `box-shadow`, `text-shadow`, `mix-blend-mode`, `mask`, or `clip-path` on anything
the export clone carries** — `.map-canvas`, `.country-path`, `.scene-path`, `[data-layer=…]`,
`.map-export-source`. `sanitizeExportClone` hard-sets stroke and stroke-width inline, so those are
safe; it does not neutralize an inherited effect, and html2canvas approximates effects differently
than the browser paints them. Hover is a darker boundary, never `filter: brightness()`.

**A compact control cluster is one surface.** The map navigation is a single bordered, shadowed
group holding three 44×44 icon buttons — not three floating pills. Pan directions are placed by
`--up`/`--right`/`--down`/`--left` role classes, never by child index.

**Screen-sized chrome may not overlay canvas-positioned content.** The map navigation cluster
overlaid the square's top-left corner and the legend's default preset is `top-left`, so the two
collided for every creator who added a colour — and nothing failed, because both elements were
present, visible, and correctly placed by their own rules. The collision has no fix on the legend
side: the cluster is measured in **screen pixels** while the legend is positioned in **1080-unit
canvas space**, so the cluster's canvas-space footprint changes with the square's width (~173
units at a 934px square, ~270 at 600px). No fixed rectangle in the export's coordinate system can
reserve room for it, and reserving room would let editor chrome shape the exported PNG. The chrome
moves off the square instead; the legend keeps the whole safe area.

- **Below the square, never above it.** UI-SPEC 20 orders the compact focus sequence composition
  bar → map → map navigation → inspector, so rendering the cluster ahead of the square puts the
  camera controls before the map they control. Below preserves the order with no test churn.
- **Assert non-intersection, not placement.** "The cluster is in the square's top-left quarter"
  and "the legend is at its preset" were both true throughout the defect. Measure the two rects
  against each other at *every* legend preset.
- The wrapper's `pointer-events: none` / children `auto` split existed only because the wrapper
  was a positioning box over the map. Off the square it is dead weight — remove it with the
  overlay rather than leaving a rule whose stated reason is gone.

**An overlay on the square is a sibling of the export source, never a descendant of it.** The
export clones `svg.map-canvas`, so `MapWorkspace`'s `navigationSlot` renders after `MapCanvas`
inside `.map-workspace__square`: placement decides export membership, and `data-editor-only`
is a second line of defence, not the first. Moving the cluster under `MapCanvas` would bake
chrome into every PNG, and only the three-context pixel probe would notice. This is the mirror
image of the legend rule — the legend must be *inside* the canonical SVG, the overlay must be
*outside* it, and both are placement facts no attribute can repair.

**An overlay wrapper sets `pointer-events: none` and restores `auto` on the surfaces that hold
controls.** The positioning box spans more than the buttons it carries, and a transparent box
over the square silently steals hit area from the map paths and from a top-left legend, which is
draggable. Nothing fails; the creator just cannot grab what is underneath.

**An absolutely positioned banner inside the square may not share a corner with the overlay.**
The partial-data warning moved from the top edge to the bottom when the cluster took the
top-left: a full-width banner at the top renders *over* `Zoom In` and `Move Map`, and both
elements still pass every test that only checks they exist.

---

## Nested Confirmation Dialogs (Phase 2)

**A nested confirmation owns dismissal and the focus trap while it is open.** When
`SaveLoad` shows the dirty-load confirmation, the trap root switches from the outer dialog
to the confirmation element and `Escape` cancels the confirmation only. If the outer dialog
keeps the trap, `Escape` closes the whole surface and the destructive action is skipped
rather than declined.

**Confirmations return focus to the control that opened them.** `Keep Editing` refocuses the
row's `Load This Map`; `Keep Map` refocuses that row's `Delete Saved Map`. Keep a ref map
keyed by a stable row key — index keys break as soon as a row is deleted.

**Scrim dismissal must compare `event.target === event.currentTarget`.** A nested overlay
rendered inside the dialog then cannot be mistaken for the outer scrim.

**`aria-modal` does not hide the dialog behind the confirmation — `inert` does.** `aria-modal`
on the *parent* restricts assistive technology to the parent subtree, which still contains Save,
Delete, Close, and the name input. A CSS scrim blocks the mouse and a `Tab` trap blocks the
keyboard, but a browse/virtual-cursor user reads straight past the confirmation and activates
the destructive control a sighted user cannot reach. So, while a nested confirmation is open:

- render it as a **sibling** of the dialog, under the same overlay — an inert ancestor would
  take the confirmation itself out of the tree;
- set `inert` **and** `aria-hidden="true"` on the dialog element (imperatively; React 18 does
  not serialize the `inert` prop);
- bind the key handler to the **overlay**, not the dialog: an inert dialog can hold no focus, so
  a handler bound there never fires;
- restore focus from an **effect**, not from the click handler — the target is still inert when
  the handler runs;
- give the confirmation **`tabIndex={-1}`**. As a sibling it has no focusable ancestor, so a
  mouse-down on its body text — the ordinary act of reading it — walks up, finds nothing, and
  drops focus to `document.body`. Every guarantee above is then void at once: the overlay's
  `onKeyDown` relies on bubbling and never fires, so Escape is dead and the Tab trap is
  unreachable, and since only the dialog is `inert`, the next Tab lands in the app bar behind a
  surface still claiming `aria-modal="true"`. The `!trapRoot.contains(activeElement)` recovery
  branch cannot help — it lives inside the handler that no longer runs.

Every focus host in a layered modal needs its own `tabIndex={-1}`; "the parent has one" stops
being true the moment a layer becomes a sibling instead of a descendant.

**Escape dismisses the innermost open confirmation, never a layer above it.** Branch over every
open layer in order (`pendingLoad` → `pendingDeleteKey` → close), and add the new branch in the
same change that adds a new confirmation. A handler that knows about only one of two sibling
confirmations discards the other one's prompt and dumps the user back at the opener.

---

## Global Action Strip (Phase 2)

**Action order is copy, so never style an action by its position.** `:nth-child(3)` and
`:last-child` repaint a *different* button the moment the strip is reordered, and nothing fails
— the destructive tint and the filled CTA just move. Give every action a stable
`data-action` and a role class (`controls__action--destructive`, `controls__action--primary`)
and key the CSS on that.

**`Export PNG` is the only filled action.** Exactly one `controls__action--primary` may exist in
the composed DOM; everything else is a neutral outline button.

**The strip is one component with a declared `variant`, never two copies.** `app-bar` composes
Undo / Redo / Save or Load Maps / Export PNG into the desktop app bar; `strip` composes the
compact/mobile action strip and additionally carries `Reset All Colors`. Two components would
drift in label, status copy, or disabled logic while both kept passing. Exactly one instance is
mounted at a time, which is what keeps the "one filled action" and "one Reset All Colors"
invariants true by construction rather than by review.

**`Reset All Colors` has two homes and must never have both at once.** Selection/color section
on desktop, action strip on compact/mobile (UI-SPEC 11). Assert the count in the *composed* DOM,
not the presence in one component — a second copy renders, works, and fails nothing.

**Style a strip action on its role class, not on its container.** `.workspace__actions button`
silently stops applying the moment the same component is composed somewhere else; the busy
spinner keyed that way simply disappears from the app bar with every test still green. Key on
`.controls__action`.

**Disabled and busy are native, never simulated.** `disabled` + `aria-busy` on the button
itself, driven by the parent's truth. `aria-disabled` on a still-clickable button spoofs the
state (T-02-53). Labels swap exactly: `Export PNG` ⇄ `Exporting PNG…`.

**Content reset and camera reset are different actions and never sit together.**
`Reset All Colors` is undoable color history and lives in the inspector; `Reset View` is camera
only and lives **solely** in `CompositionBar`. The composed DOM must contain exactly one visible
`Reset View` — assert its absence in every other control component's test, not just the presence
in one.

**A presentational control that starts an async owner action needs its own synchronous
activation lock.** The parent's `isExporting` is only true one render later, so two activations
in the same tick both pass the prop check. Guard with a `useRef` flag cleared in `finally`; the
control stays event-only and owns no transaction state.

---

## Creator-Safe Status Copy (Phase 2)

**`ToastRegion` is a boundary, not a renderer.** Everything it receives is untrusted until it
matches the allowlist: an exact approved string, or a bounded dynamic pattern. Anything else
degrades to the severity fallback (`Map updated.` / warning / error). Hashes, projection terms,
schema versions, file paths, stack frames, and DOM exception names therefore cannot reach a
creator even if a future call site passes one straight through.

**A dynamic message must bound its semantic parameter, not just its prefix.**
`^Centered on .{1,100}\.$` is an allowlisted *prefix* — it happily announces a 64-character
content hash. Bound the parameter to the shape the real value has (`Centered on` takes a country
name: initial uppercase letter, ≤60 characters).

**Derive the bound from the real data, never from an assumed charset.** An invented
"safe characters" list silently degraded `Falkland Islands / Malvinas` and
`Allies & "Central Powers"` to the generic fallback. Check the candidate pattern against the
whole shipped catalog before committing it; prefer a length + control-character bound over a
character allowlist, since React escapes the text anyway.

**Copy that names catalog data is generated from the catalog constants**
(`APPROVED_PERIOD_ANNOUNCEMENTS`), so a manifest-supplied label can never reach the live region.
Listing a deferred snapshot's copy in the allowlist does not make it reachable — reachability is
decided by `resolvePeriodOptions`.

**Every message a component can emit needs a positive allowlist test in the same change.** A new
`onStatusMessage(...)` string with no test is a silent downgrade to `Map updated.` — it renders,
so nothing fails.

**Onboarding and status copy never advertise a deferred feature.** No "coming soon", no keyboard
shortcut that is not bound, no control that does not exist.

---

## Transaction Hooks (Phase 2)

A *transaction hook* (`useComposition{Save,Load,Export}Transaction`) is a pure factory plus a
thin React wrapper. The factory holds the rules and is what the unit tests drive; the wrapper
holds React state only. Vitest runs on the `node` environment — a factory that needs a DOM or
a renderer to be tested is the wrong shape.

**A hook that owns a lock must create its transaction exactly once.** `useMemo`/`useState` with
a dependency array rebuilds the object when any dependency identity changes, and a rebuilt
transaction carries a **fresh, unlocked** activation flag — a second export can then start while
the first still holds the camera lease. Keep the options in a ref, update the ref in a
`useLayoutEffect`, and create the transaction lazily inside the returned callback:

```typescript
const optionsRef = useRef(options);
const transactionRef = useRef<Transaction | null>(null);
useLayoutEffect((): void => { optionsRef.current = options; });

const run = useCallback((): Promise<Outcome> => {
  // Created here, not during render: passing ref-reading closures to a factory
  // in the render body trips react-hooks/refs.
  transactionRef.current ??= createTransaction({
    getThing: () => optionsRef.current.getThing(),
    ...
  });
  return transactionRef.current.run();
}, []);
```

This also makes the returned callback **stable**, so a toast `retry` can call it directly
instead of bouncing through a handler ref.

**Resolve the live handle once per activation, then hold it.** Re-reading
`getMapCanvasHandle()` after an `await` can return a canvas that was rebound by the 1200px
transition, and releasing a lease on a handle that never issued it leaves the original frozen.

**Every lock is cleared in one outermost `finally`, in this order:** activation flag → lease
release → busy flag, each side effect after the first wrapped so a throw cannot skip the rest.
A stuck flag is not a cosmetic bug: it disables the feature for the remainder of the session.

**Owner callbacks (`onOutcome`, status, focus) must never be able to strand a lock.** Either
call them after the `finally`, or wrap them so a throw is logged (`console.error`) rather than
propagated. Report the outcome *after* the lease is released so input is live before the user
sees the toast.

**Re-entrancy is refused synchronously, before the first `await`**, and the refusal is silent —
it emits no outcome. Reporting it would show a second toast for a click that changed nothing.

**Owner state stays in the composition root.** A transaction hook takes accessors
(`getCompositionName`, `getLegendBlocker`) and never becomes the source of truth for state that
another transaction also reads.

---

## Composition Root (Phase 2)

`src/App.tsx` is wiring and creator-safe feedback. It owns durable state and hands accessors
down; it never re-implements a transaction, a validation, or a camera.

**One handle accessor, shared by identity.** App holds exactly one `MapCanvasHandle` in a ref,
binds it with a stable callback ref, and passes *the same* `getMapCanvasHandle` function to the
save, load, and export hooks. Three separate accessors would mean three private handles, and
the 1200px remount would leave some of them stale. Assert the identity, not the shape:

```typescript
expect(loadDependencies.getMapCanvasHandle).toBe(saveDependencies.getMapCanvasHandle);
```

**Never import a camera controller into App.** `useCameraController` belongs to `MapCanvas`. A
second controller paints a second camera and the visible SVG stops following the handle every
App callback is derived from. This is worth a structural test — the defect is an import.

**The legend renders through `MapWorkspace`'s typed `legendSlot`, inside the canonical SVG.**
A `<LegendOverlay/>` rendered as a *sibling* of `svg.map-canvas` is silently dropped by the
export clone, and `isSingleCanonicalComposition` still **passes**, because neither the source
nor the SVG then contains a legend. The only guards are containment assertions:

| Level | Assertion | Catches |
|---|---|---|
| Unit (`App.test.tsx`, static markup) | legend index between the camera layer and `</svg>` | the refactor, at commit time |
| Real-app E2E | `svg.map-canvas > [data-layer="legend"]` count 1 | the same, in a real browser |
| Fixture E2E | — | **nothing**: the fixture re-implements the slot wiring |

Never relocate or relax those two. See `export.md`, "A fixture cannot prove legend placement".

**Responsive sections are keyed siblings, not conditional subtrees.** The map and the inspector
carry stable `key`s so crossing 1200px *moves* the nodes instead of remounting the map; state
that any remounted section shows (`useInspectorUiState`, `compositionName`,
`savedColorsBaseline`) lives above the branch. `savedColorsBaseline` and `compositionName` stay
out of the history snapshot — history is colors-only, which is the only reason undo/redo cannot
resurrect a selection the active scene does not contain.

**Placement is App's decision, and every placement move needs a landmark census in the same
change.** Moving a section between the app bar, the workspace, and the inspector changes which
landmark contains it and whether the `ErrorBoundary` around the workspace still covers it. A
silently deleted landmark was a real defect in this phase, so `App.test.tsx` counts
`Map creator workspace` and `Map inspector`, and `responsive.spec.ts` counts banner / main /
complementary at every viewport. A visually hidden heading stays a heading: hide it with
`clip-path`, never `display: none`, or the section's `aria-labelledby` name disappears with it.

**Unit-test the root with mocked hooks, in static markup.** Vitest runs on `node`: render with
`renderToStaticMarkup`, mock `useGeoData` and the three transaction hooks, and assert what App
*hands down* plus what the composed DOM *contains*. Behavior that needs effects, refs, or input
belongs in the Chrome E2E suite.

---

## The Editor Shell (Phase 3, D-11 / D-16 / D-19 / D-32)

`.map-editor` is the **mount root**: the outermost element App returns, full-bleed, opaque, and
the only element a future host has to place. `html` and `body` are layout-only and carry **no
themed background** — everything the editor paints lives inside its own subtree. `overflow-x:
hidden` stays on `body` and nowhere else; on a non-viewport element it computes `overflow-y:
auto` and silently kills sticky positioning inside it.

**One grid, three tracks, one row.**

```css
.map-editor {
  display: grid;
  grid-template-columns: var(--rail-width) var(--panel-width) 1fr;
  block-size: 100dvh;
}
:root { --rail-width: 56px; --panel-width: 0px; }
.map-editor[data-panel-open='true'] { --panel-width: 280px; }
```

- **`[data-panel-open]` is exactly `'true' | 'false'`** — never absent, never a third value — and
  it has **exactly one writer**. Both halves are gated: `uiContract.test.ts` counts the writers
  across `src/**/*.tsx` and enumerates the values styled in CSS; `shell.spec.ts` measures the
  resolved track at 0px and 280px. A second writer is how two surfaces come to disagree about
  which panel is open.
- **The panel reserves its track; it never overlays the map.** The e2e asserts the canvas
  region's left edge *moves* by exactly 280px, because "the panel is visible" is equally true of
  an overlay.
- **Animate the registered `--panel-width` custom property, never the grid's track list.** The
  property is declared with `@property` (`<length>`, `inherits: true`, `initial-value: 0px`) —
  an unregistered custom property has no type, so it cannot interpolate and the panel snaps.
  Animating the track list instead fires many layout passes per frame across a 248 × 3-path SVG.
- **A 0px track still holds live tab stops.** Unmount the panel body (or make it `inert`) when
  the track is closed, or the creator tabs into a keyboard trap with nothing visible in it.

**No `ResizeObserver` may enter the projection, camera, or export path, and none is needed.**
`MapCanvas.tsx:839-840` fixes the `viewBox` at `0 0 1080 1080` and `useCameraController.ts:310-313`
pins d3-zoom's `extent` to `[[0,0],[1080,1080]]` rather than the element rect, so a rail or panel
reflow cannot disturb any of the three. The rule is an **ownership set**, not a ban: `Tooltip.tsx`
has observed its own element since Phase 2 and that is fine. `uiContract.test.ts` asserts the set
of files under `src/` that mention `ResizeObserver` is exactly the tooltip pair — a bare
"grep returns nothing" gate would be red on arrival and would get deleted rather than obeyed.

**The export frame is placed, not attributed.** `.map-frame` renders as a structural **sibling**
of `div.map-export-source` and never as a descendant of `svg.map-canvas`; `data-editor-only="true"`
is the second line of defence, not the first. It is deliberately **not** a slot — `legendSlot` and
`navigationSlot` are a composition contract (D-24) and stay byte-unchanged, while the frame is
structural chrome marking what the PNG will crop to. Its geometry is an **equality** with the
viewBox projection, not an approximation: `preserveAspectRatio="xMidYMid meet"` centres the square
at side `min(w, h)` of the canvas region, and `--frame-side: min(100cqw, 100cqh)` with `inset: 0;
margin: auto` centres a square of exactly that side. Assert it by projecting the viewBox corners
through `getScreenCTM()`, at more than one viewport shape — a rule that only lines up at the
default size passes a single-viewport check.

**`.map-workspace__square` is `.map-workspace__canvas`, and `aspect-ratio: 1` moved to
`.map-frame`.** A class named `__square` that is no longer square is a stale name. The Phase 2
squareness assertion was **relocated, not retired** — asserting only the renamed region would have
dropped the claim on the rename, which is how a contract test quietly gets weaker.

---

## The Tool Rail and its Panel (Phase 3, D-12 / D-13 / D-16 / D-17 / D-18 / D-29)

**Row height is 48px here, not Themely's 36px, and that is a translation rather than a copy.**
The utility table in `03-UI-SPEC.md` maps `h-9` to `block-size: 36px`; this repo's contract test
also asserts that no control declares a `min-height` below 48px, and the rail is the app's only
icon-only control strip. Honouring a desktop-sidebar utility would have meant weakening a landed
accessibility gate on the one surface where the target matters most. The rail is 56px wide with
`--space-xs` padding, so its content column is 48px and the rows are square.

**Only the row BACKGROUND carries state, and it paints instantly.** Colour is
`--themely-nav-ink` across inactive, hover, and active; there is no accent bar, no blue active
icon, and no weight bump. `transition` is declared in a rule that sets no background, and the
background rules declare no transition — separated on purpose so a gate can read one without the
other, and because Themely states an ease here is *"a regression, not polish"* (D-29).

**The glyph animation is triggered from ROW hover through the imperative handle**, never from the
icon's own hover. `startAnimation()` is reduced-motion-gated; `stopAnimation()` is
**unconditional**, because a glyph left mid-animation when the preference flips is a stuck
animation, not a respected preference.

**Rows are plain tab stops and never write a roving `tabindex`.** There is exactly one roving
writer in this app — `applyRovingTabStop` in `MapCanvas.tsx`, restored in commit `074173e` — and a
second is the regression class that commit fixed.

**Nothing in the rail is a scroll container.** Each row is icon-only and carries a tooltip that
has to escape the 48px column, and `overflow-y: auto` computes `overflow-x: auto` and clips it.
The trade is recorded rather than hidden: a viewport shorter than ~436px overflows instead of
scrolling, and `03-09` owns the short/narrow layouts.

**The HUD header and footer are SIBLINGS of the scrolling element, never children of it.** That
is what makes "identity and Export never scroll away" (D-12, D-13) structural instead of a styling
promise. Both widen over the panel track when a tool is open; `.tool-panel__body` reserves their
fixed heights at both ends, and those heights do **not** change with the panel state — a
reservation that moves is wrong for one frame of every toggle.

**Hide by truncation or by visual hiding, never by `display: none`.** The composition name and the
saved/unsaved pill go `opacity: 0` at 56px (D-12); the Export label is visually hidden there so a
transparent label does not push the glyph off centre in a 48px square. `display: none` would strip
either from the accessible name.

**The panel track IS the `main` landmark, and it stays mounted at every panel state.** The panel
BODY is what unmounts when no tool is open (a 0px track still holds live tab stops), so a landmark
placed inside the body would come and go with the open tool. Empty is fine; absent is not.

**The panel's title row sticks to the top of the ONE scroll container rather than sitting outside
it.** Hoisting it out would move the scroll container down to the content and leave the landed
`overflow-y: auto` + `overscroll-behavior: contain` pair asserted against an element that scrolls
nothing.

**`Controls` gains variants; it is never copied.** The declared set is `rail | app-bar | strip`
and **exactly one instance is mounted**. That is the mechanism behind "exactly one filled action
in the composed DOM": `controls__action--primary` exists in one component. `app-bar` and `strip`
are unmounted as of `03-06` and stay declared — deleting a rendering path is `03-09`'s call when
it rewrites the responsive layout.

**Reaching a tool control in an e2e means opening its rail row first.** `openRailTool` and
`legendDisclosure` live in `tests/e2e/support/appHarness.ts` and are imported, never re-declared.
`getByRole('button', { name: /^Legend/ })` now matches two controls — the rail row and the
disclosure — so scope, never `.first()`: an ordinal starts clicking the rail row the moment the
rail's order changes.

**Hover must be written as an EXCLUSION where a state rule follows it.** `:hover` alone outranks a
plain attribute selector, so `.tool-rail__row:hover` repainted the *open* tool from Powder back to
Porcelain under the pointer — the active row silently losing its only state signal. The landed rule
is `.tool-rail__row:not([aria-expanded="true"]):hover`. The e2e that caught it compares the three
states for **inequality** as well as asserting the ink is constant: three identical backgrounds
satisfy "the colour never changes" perfectly.

**The colour swatch grid derives its columns and clips nothing.**
`repeat(auto-fit, minmax(76px, 1fr))`, never a fixed count — a fixed count plus `width: max-content`
inside `overflow: hidden` is what once cut `Magenta` off at the tile edge with nothing failing, and
overflow stays visible so the next one is caught by eye. The selected tile carries
`--themely-powder` plus a 16px `check` glyph at its trailing-top corner **on the tile background,
never on the swatch**: the swatch holds a creator-chosen colour and a glyph drawn over it is
invisible against roughly half of them. The swatch's own `1px solid var(--swatch-border)` is
mode-invariant and is the same value the exported legend swatch uses — it is what keeps a **white**
preset visible on a Platinum tile in either theme.

**One Apple Blue per SURFACE, not per document.** The rail spends its accent on `Export PNG`; the
Colors panel spends its own on `Apply Color`. Both are filled from `--accent-fill`, never from
`--themely-apple-blue`, and both are keyed on a role class — `button:first-child` once meant
reordering would have moved an accent onto a `Dismiss` button with nothing failing. "Exactly one
filled primary action in the composed DOM" is a claim about `controls__action--primary`
specifically, which is why that class lives in one component.

## Tool-panel content styling (UI-SPEC 7/8, plan 03-07)

**Sub-section headings and `<fieldset>` legends inside the tool panel are `--text-body-sm` at
weight 500 — never `--text-subheading`.** 16px and 14px are only 2px apart, which reads as an
accident rather than a hierarchy in a 280px column; the weight bump carries the hierarchy.

**Stack labelled controls; reserve rows for icon-only or single-word controls.** A row of
full-phrase controls has no width at which it fits 280px. The legend entry's reorder actions are
icon-only ghost buttons at `--target-compact` (44px) on their own row, with inline SVG glyphs
following the `MapNavigation` precedent and **unchanged accessible names** (`Move Up`,
`Move Down`, `Drag <label> to reorder`); keyboard reorder through the two arrows is the primary
path and drag the enhancement.

**Option groups are pills, not visible radios**: Porcelain + Slate Blue unselected, Powder +
Midnight Ink selected, the radio input kept in the tree visually hidden (never `display: none`)
so every `getByLabel` and announcement keeps working, and the focus ring riding on the label via
`:has(input:focus-visible)`. The position picker is a 3×3 grid of 44px cells (four corners +
`Custom` centre); selecting `Custom` adopts the currently rendered position via
`resolveLegendPosition` and announces the existing approved string.

**No accent in the `legend` panel** (D-05: no primary action ⇒ no Apple Blue; the range slider's
`accent-color` is Slate Blue), and **no ghost-gray text** — the counter and row meta use
`--themely-slate-blue`, because painting text with `--themely-ghost-gray` is gated out. An
invalid legend row gets its red left edge from `[data-entry-invalid="true"]`, never a positional
selector. **The panel body stays the single scroll container**: the country list's inspector-era
inner scroll cap is gone (the locate combobox popup keeps its own bounded scroll — it is a
transient listbox, not panel flow). Test fixtures that size an `svg` must scope the selector —
a bare `svg` rule inflated the new 20px glyphs to 540px squares.

## The Floating Camera Cluster (Phase 3, D-21 / D-05, plan 03-08)

**The cluster is ONE bordered neutral surface with no accent, and it holds FOUR 44×44 icon-only
controls.** `Zoom In`, `Zoom Out`, `Move Map`, `Reset View`. The controls carry no border and no
fill of their own — the cluster owns both, which is the difference between one surface and four
floating pills. D-05 spends the accent on `Export PNG` in the rail, so the canvas region's entry in
the accent budget is literally `none`; the only Apple Blue that may appear is the global
`:focus-visible` ring authored in `theme.css`. No scale bar (misleading on a Mercator world map,
and cartography is Phase 4).

**`Move Map` is a DELIBERATE fourth control against D-21's three.** It is the only keyboard pan
affordance in the app, so dropping it would regress NFR11 and the keyboard-navigation acceptance
cells. `03-UI-SPEC.md` § Open Items item 2 flagged the retention for owner awareness rather than
letting it be decided silently. A three-control cluster needs a keyboard pan replacement **first**.

**`Reset View` lives here and nowhere else.** It is CAMERA reset; `Reset All Colors` is CONTENT
reset and lives in the Colors panel, and the two never sit together. It is icon-only, so it spells
its copy exactly twice (`aria-label` + `title`) — assertion 15 counts the **accessible name**,
which is what every locator and every `getByRole` keys on, and pins the raw occurrence count
beside it so a third mention fails.

**The camera cluster is gated on a READY scene, so the loading state withholds it entirely.**
`Reset View` used to be the one control the loading state *disabled*, because it lived in the
always-rendered period HUD. Absent is the stronger claim: a disabled control can be re-enabled by
a stray prop, an absent one cannot be activated at all. Both the unit and the e2e loading
assertions were rewritten to that claim rather than deleted.

**The cluster renders INSIDE `.map-workspace__canvas`, after `div.map-export-source`.** Inside,
because the region is the `container-type: size` box `.map-frame` measures itself against — so the
cluster's inset math and the frame's `--frame-side: min(100cqw, 100cqh)` resolve against one
container rather than two that happen to agree today. After the export source, because placement —
not `data-editor-only` — is what decides export membership.

**The UI-SPEC's published placement formula is WRONG and must not be restored.** As written,

```css
inset-inline-end: max(var(--space-lg), calc((100cqw - var(--frame-side)) / 2 + var(--space-sm)));
inset-block-end:  max(var(--space-lg), calc((100cqh - var(--frame-side)) / 2 + var(--space-sm)));
```

adds the gutter to the inset, which pushes the cluster *away* from the region edge and lands it
`--space-sm` **inside** the frame's bottom-inline-end corner — at every aspect ratio, which is
precisely the defect assertion 12 exists to catch. RED-proven: applied verbatim it fails all four
gate viewports. The landed rule anchors at `--space-sm` from the region's bottom-inline-end corner
and lets the letterbox do the work.

**The cluster lies ALONG the gutter it occupies, and that is a container query, not an observer.**
`@container (aspect-ratio > 1)` stacks it into a 54px-wide column for an inline gutter; the default
row is 54px tall for a block gutter. One fixed orientation fails at one of the two — a row needs
~206px of block gutter (measured red at 800×900) and a column needs ~206px of inline gutter
(measured red at 640×400).

**The exception is BOUNDED, derived, and asserted — never described.** Non-intersection needs a
gutter of at least 54 + 8 = 62px, i.e. a canvas region whose width and height differ by ~124px or
more. The UI-SPEC's "~96px" is an estimate; the real number falls out of the cluster's own short
side plus its margin, and the stylesheet states the derivation. Inside that band the cluster rests
over the frame's bottom-inline-end corner, accepted because (a) it is editor-only chrome that never
enters the PNG, (b) the wrapper is `pointer-events: none` with `auto` restored only on
`.map-navigation__control`, and (c) the legend's default preset is the opposite corner. The
exception has its own test asserting the **bound** — the overlap stays past both frame midlines —
rather than an `OR` inside assertion 12, because an assertion with an escape hatch stops being one.

**Assert NON-INTERSECTION, at every viewport × every legend preset, and enumerate the presets.**
"The cluster is bottom-right" and "the legend is at its preset" were both true throughout the
collision this project already shipped once. `navigation.spec.ts` walks `LEGEND_CORNER_OPTIONS`
(exported from `LegendEditor.tsx`) plus `Custom`, and asserts that list equals `LEGEND_CORNERS`
**in both directions** — a one-way subset check lets a new preset go uncovered. It also asserts the
cluster is still *inside* the region, because a cluster pushed off-screen satisfies
non-intersection perfectly.

**Measure layout only after `--panel-width` has settled.** The registered custom property
interpolates (D-19), so `aria-expanded="false"` is true a quarter second before the canvas region
has finished widening. At 1300×900 the mid-transition region is near-square and the assertion
failed on the animation rather than on the placement. Poll real frames to two equal consecutive
reads.

**No absolutely positioned banner may share a corner with floating chrome, and three of the four
are taken:** the period HUD owns top-inline-start, `.editor-help` owns bottom-inline-start, and the
cluster owns bottom-inline-end. `.map-workspace__warning` takes the one free corner, capped at a
measure rather than run full width — a full-width bar at either edge lands under two of them.

**The pan popover opens up and toward the inline start, and is deliberately outside assertion 12.**
The region clips its overflow, so a popover opening down or outward puts the pad off-region and
`Move Map` becomes unreachable. The pad is transient chrome that exists only while the creator
holds it open; at a narrow gutter it does overlap the frame, and moving it out would put it
off-region instead.

## The Period HUD (D-14, D-15)

`src/components/editor/PeriodHud.tsx` is the `.period-hud` surface in the **canvas region, never
the rail**: its status region is the period control's `aria-describedby` target as well as a
`role="status"` live region, and a description must sit next to the control it describes.
`CompositionBar` is deleted — its identity went to the HUD header (03-06); the period surface, the
visually hidden preview label (the workspace landmark's accessible name), `Reset View` (interim —
`03-08` moves it into the floating cluster), and the live region live here.

**The surface renders resolved manifest options only, never `SNAPSHOT_CATALOG`.** That constant is
a five-entry LABEL registry, not an approval list; rendering it names four deferred snapshots
(Immutable Safety Constraint 3, Live Invariant 6). With exactly one resolved option the surface is
a **visibly inert read-only pill** — no `<select>`, no chevron, no "coming soon", no count of
hidden periods. The interactive `<select>` path stays **reachable in code**: a second approved
manifest entry returns the surface to a select with no copy change. Both shapes carry
`aria-describedby={COMPOSITION_PERIOD_STATUS_ID}`.

**Both ids are byte-identical to their Phase 2 values** (`composition-bar-period`,
`composition-bar-period-status`) — the status id is referenced by assertion 14 and by
`aria-describedby`; the select id is queried by the e2e fixture's NFR3 diagnostics. Renaming
either to match the component orphans a reference with no visual signal. Assertion 14's
load-bearing half asserts every `aria-describedby` id in the composed DOM **resolves to an element
that exists**; assertion 13 is **scoped to `.period-hud`**, because the registry legitimately
holds five labels elsewhere in the module graph.

---

*Last updated: 2026-08-06 — §The Floating Camera Cluster (D-21/D-05): one bordered accent-free surface of four 44×44 icon-only controls with `Move Map` retained as the deliberate fourth on NFR11 grounds and `Reset View` rehomed from the period HUD; the cluster rendered inside `.map-workspace__canvas` so its inset math and `.map-frame`'s share one container query; the UI-SPEC's published placement formula recorded as WRONG (it adds the gutter to the inset and lands the cluster inside the frame at every aspect ratio, RED-proven on all four gate viewports) with the corner anchor that replaces it; orientation as a container query rather than an observer; the ~124px exception band derived from the cluster's own short side and asserted as a BOUND in its own test rather than as an `OR` inside assertion 12; presets enumerated two-way from `LEGEND_CORNER_OPTIONS`/`LEGEND_CORNERS`; measure only after `--panel-width` settles; and the warning banner moved off the cluster's corner (plan 03-08).*
*Last updated: 2026-08-06 + 2026-07-26/27 — earlier Phase 3 rules, condensed. §The Period HUD (D-14/D-15): `CompositionBar` deleted and rehomed as `.period-hud` in the canvas region (the status region is an `aria-describedby` target and must sit next to its control); resolved manifest options only, never `SNAPSHOT_CATALOG`; one option renders as a visibly inert read-only pill with the interactive `<select>` path kept reachable in code; both ids byte-identical to Phase 2; assertion 13 scoped to `.period-hud`, assertion 14's load-bearing half asserting every `aria-describedby` id resolves. §Tool-panel content styling (UI-SPEC 7/8): weight-carried hierarchy at `--text-body-sm` 500, stacked labelled controls with 44px icon-only action rows and unchanged accessible names, option pills over visually hidden radios, the 3×3 position grid with a `Custom` cell, no accent and no ghost-gray text in the legend panel, `[data-entry-invalid]` for the red row edge, and the panel body as the single scroll container (plan 03-07). §The Tool Rail and its Panel (D-12/D-13/D-16/D-17/D-18/D-29): 48px rows as a translation, not a copy, of Themely's `h-9`; background-only state with instant paint; rows as plain tab stops with no second roving-tabindex writer; no scroll container in the rail; HUD header/footer as pinned siblings whose fixed heights the panel body reserves; hide by truncation or visual hiding, never `display: none`; the panel track as the persistent `main` landmark; the title row sticky inside the one scroll container; `Controls` as one component with a three-value declared variant and exactly one mounted instance; `openRailTool`/`legendDisclosure` in the shared e2e harness (plan 03-06). §The Phase 3 Token System (D-03…D-10/D-26/D-30): verbatim `--themely-*` namespace with an allowlist gate; a surface that owes AA gets its own token (`--accent-fill`, `--destructive`, ghost-gray text ban); class-based dark flip with no OS colour query; Live Invariant 9 extended to `.dark`; delete-never-alias; `backdrop-filter` banned; flat hairline elevation; matrix row count as a literal; `uiContract.test.ts` as the only CSS contract test (plan 03-04). §The Editor Shell (D-11/D-16/D-19/D-32): `.map-editor` as the mount root over an unpainted `html`/`body`; one three-track grid; `[data-panel-open]` two-valued with exactly one writer; animate the registered `--panel-width`, never the track list; `ResizeObserver` as an ownership set; the export frame as a sibling of the export source (plan 03-03). Earlier: borders by stroke-width with `non-scaling-stroke` in the camera scale group; wave789 inspector rules (both-scheme preference queries, one rule per (selector, conditions) pair, tokens need consumers, per-layer tabIndex, awaited locks, chrome off the square, stacked 376px controls, derived grid tracks); `NEUTRAL_UNIT_COLOR` for null-owner units in both resolvers with an honest tooltip. §The Motion Token Mirror (D-26): CSS is the source of truth, `src/lib/motion/tokens.ts` a mirror pinned by a two-way lockstep gate. §Vendored Animated Icons (D-28): authored in-repo, recipes translated never copied, `size` prop, forwardRef + `*IconHandle`, and `PROVENANCE.md` as a two-way gate input (plans 03-01/03-02).*

*Full edit history: `git log -p -- .planning/coding-rules/frontend.md`.*
