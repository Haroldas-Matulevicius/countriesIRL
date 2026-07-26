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

**D3 projections for flexibility.** `geoMercator` for Phase 1 (standard map). Phase 2 will add `geoAzimuthalEquidistant` for centered maps.

**Performance: memoize projections.** `d3.geoMercator().fitExtent()` is expensive. Do it once per data shape, not per render.

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
  the handler runs.

**Escape dismisses the innermost open confirmation, never a layer above it.** Branch over every
open layer in order (`pendingLoad` → `pendingDeleteKey` → close), and add the new branch in the
same change that adds a new confirmation. A handler that knows about only one of two sibling
confirmations discards the other one's prompt and dumps the user back at the opener.

---

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

*Last updated: 2026-07-25 — inert-behind-confirmation and Escape-layering rules (wave 6 review MEDIUM-4/MEDIUM-5).*
*Last updated: 2026-07-25 — transaction-hook rules from the export transaction extraction (plan 02-30).*

*Full edit history: `git log -p -- .planning/coding-rules/frontend.md`.*
