# Phase 4: Visual & Cartographic System — Pattern Map

**Mapped:** 2026-08-06
**Files analyzed:** 24 create/modify targets
**Analogs found:** 21 / 24 (3 with no good in-repo analog)

Sources: `04-CONTEXT.md` (D4-01..D4-18), `04-RESEARCH.md` § Validation Architecture / Wave 0 Gaps,
`04-UI-SPEC.md` §§ 6.1–6.8, 11.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `src/utils/contrast.ts` **(new)** | utility (pure) | transform | `src/utils/legend.ts` (module shape) + `src/styles/uiContract.test.ts:236-296` (the exact functions) | exact — it is a *move* |
| `src/utils/contrast.test.ts` **(new)** | test (node) | transform | `src/utils/colors.test.ts` / `legend.test.ts` | exact |
| `src/utils/ramps.ts` **(new)** | utility (pure) + constants | transform | `src/utils/legend.ts` + `src/constants/colors.ts` (`COLOR_PRESETS`) | exact |
| `src/utils/ramps.test.ts` **(new)** | test (node) | transform | `src/utils/legend.test.ts` | exact |
| `src/utils/bands.ts` **(new)** | utility (pure) | transform | `src/utils/legend.ts` (clamping + derived-constant style) | exact |
| `src/utils/bands.test.ts` **(new)** | test (node) | transform | `src/utils/legend.test.ts` | exact |
| `src/constants/colors.ts` | config | — | itself (`NEUTRAL_UNIT_COLOR` comment style) | exact |
| `src/constants/tools.ts` | config | — | itself — add one `ToolDefinition` | exact |
| `src/components/icons/DropletIcon.tsx` **(new)** | component | event-driven | `src/components/icons/LayersIcon.tsx` | exact |
| `src/components/icons/index.ts` · `PROVENANCE.md` · `iconContract.test.ts` | config/test | — | existing entries for `LayersIcon` | exact |
| `src/components/editor/ToolRail.tsx` | component | event-driven | itself — `TOOL_ICONS` map + `TOOL_DEFINITIONS` loop | exact |
| `src/components/controls/MapStylePanel.tsx` **(new)** | component | request-response | `LegendEditor` / `ColorPicker` panel bodies | role-match |
| `src/styles/controls/mapStyle.css` **(new)** | style sheet | — | `src/styles/controls/legendEditor.css` | exact |
| `src/main.tsx` | config (import order) | — | itself — the pinned block | exact |
| `src/styles/uiContract.test.ts` | test (css contract) | — | itself — assertions 10 and 21 | exact |
| `src/styles/editor.css` | style sheet | — | itself — `--panel-width-open` token | exact |
| `src/utils/legend.ts` + `legend.test.ts` | utility | transform | itself (delete 3 fields, move default) | exact |
| `src/utils/storage.ts` + `storage.test.ts` | utility (persistence) | CRUD | itself — the V1→V2 path at `:640-700` | exact |
| `src/utils/scene.ts` + `scene.test.ts` | utility | transform | itself — `getEffectiveFeatureColor` | exact |
| `src/utils/export.ts` | utility (critical) | file-I/O | itself — `sanitizeExportClone` `:295-356` | exact |
| `src/components/MapCanvas.tsx` | component (D3) | render | itself — existing `data-layer` groups | exact |
| `scripts/prepareWorldData.mjs` | script | batch/file-I/O | itself — `--check` branch `:413-424` | exact |
| `public/data/world-manifest.json` / `world-modern.geojson` | data | — | itself (hash chain) | exact |
| `tests/e2e/export.spec.ts` | test (e2e) | file-I/O | itself — assertion 25 `:470-652` | **exact — the single most valuable analog** |
| `tests/e2e/support/appHarness.ts` | test support | — | itself — `LOGICAL_CORE_COUNT` `:5` | exact |
| `src/assets/inter-latin-ext…woff2` + `README.md` | asset | — | existing latin subset record | role-match |

---

## Pattern Assignments

### `src/utils/ramps.ts`, `src/utils/contrast.ts`, `src/utils/bands.ts` (utility, pure, node-env)

**Analog:** `src/utils/legend.ts` — the canonical pure-module shape in this repo.

**Module shape** (`src/utils/legend.ts:1-40`):

```typescript
import { DEFAULT_COLOR } from '../constants/colors';
import type { LegendPosition, LegendState, LegendTextSize } from '../types/composition';
import { normalizeColor } from './colors';

const LEGEND_CANVAS_SIZE = 1080;
const LEGEND_SAFE_INSET = 32;
const LEGEND_LABEL_MAX_LENGTH = 32;

/**
 * The single legend default. `top-left` is the only preset whose coordinates
 * are bounds-independent …
 */
export const DEFAULT_LEGEND_POSITION: LegendPosition = Object.freeze({
  x: LEGEND_SAFE_INSET,
  y: LEGEND_SAFE_INSET,
  preset: 'top-left',
});
```

Copy: module-private `SCREAMING_CASE` constants at the top; `Object.freeze` on exported defaults;
`ReadonlySet` vocabularies (`LEGEND_TEXT_SIZES`, `:47-66`) — **this is the exact precedent for
D4-08's `STROKE_WEIGHTS` (`none|hairline|thin|medium|bold`) and for the ramp id set**; and a doc
comment that states *why the value is what it is*, with the derivation written out rather than the
literal (see `LEGEND_CHARACTERS_PER_LINE`'s worst-case-advance derivation at `:68-88` — the model
for `BAND_MAX_HEIGHT = Math.floor(MAP_VIEWBOX_SIZE / 7)` per UI-SPEC § 6.6).

Differ on: no `types/composition` import for `contrast.ts` — it takes plain hex strings.

**`contrast.ts` is a MOVE, not a new authorship.** Take verbatim from
`src/styles/uiContract.test.ts:236-296`:

```typescript
/** WCAG 2.2 relative luminance. */
function relativeLuminance([red, green, blue]: readonly [number, number, number]): number {
  const channel = (raw: number): number => {
    const srgb = raw / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundRgb = parseHexColor(foreground);
  const backgroundRgb = parseHexColor(background);
  if (foregroundRgb === null || backgroundRgb === null) {
    throw new Error(`Contrast needs two hex colors, got "${foreground}" on "${background}".`);
  }
  const first = relativeLuminance(foregroundRgb);
  const second = relativeLuminance(backgroundRgb);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}
```

`uiContract.test.ts` must import these in the **same change** (RESEARCH Wave 0). `parseHexColor`
returns `null` on bad input while `contrastRatio` throws — keep that split; the throw is what makes
a typo in a ramp hex loud.

**Unit-test shape** — `src/utils/legend.test.ts:1-21`:

```typescript
import { describe, expect, it } from 'vitest';
import type { LegendEntryState, LegendState } from '../types/composition';
import { LEGEND_CHARACTERS_PER_LINE, createDefaultLegendState, resolveLegendPosition } from './legend';
```

`describe`/`it` (not `test`), named imports from the sibling module, local fixture builders at file
top. **No DOM** — Vitest runs `node`.

---

### `src/components/icons/DropletIcon.tsx` (component, event-driven)

**Analog:** `src/components/icons/LayersIcon.tsx:1-45`.

```typescript
import { motion, useAnimation } from 'motion/react';
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';

/**
 * Vendored animated icon — lucide `layers`, in the shape of
 * `themely/src/components/ui/search.tsx` … **Translated, never copied.** …
 * Sizing comes from the `size` prop, colour from `currentColor`.
 */
export interface LayersIconHandle { startAnimation: () => void; stopAnimation: () => void; }
export interface LayersIconProps extends HTMLAttributes<HTMLSpanElement> { size?: number; }
const LAYERS_VARIANTS = { normal: { y: 0 }, animate: { y: [0, -2, 0] } };
export const LayersIcon = forwardRef<LayersIconHandle, LayersIconProps>(function LayersIcon(
  { onMouseEnter, onMouseLeave, className, size = 20, ...props }, ref) {
```

Copy exactly: the `…Handle` interface pair, `isControlledRef` flip inside `useImperativeHandle`
(so self-hover defers to the rail row), `size` prop default 20, `currentColor`, and the provenance
doc comment naming the lucide glyph. Then join `index.ts`, `PROVENANCE.md`, and
`iconContract.test.ts` — all three, or the contract test fails.

---

### `src/components/editor/ToolRail.tsx` + `src/constants/tools.ts` (new "Map style" row, D4-07)

**Analog:** the files themselves. Two edits, no new component.

`src/constants/tools.ts:20-25` — insert **second**, per UI-SPEC § 6.1:

```typescript
export const TOOL_DEFINITIONS: ReadonlyArray<ToolDefinition> = [
  { id: 'colors', label: 'Colors' },
  { id: 'countries', label: 'Countries' },
  …
];
```

`src/components/editor/ToolRail.tsx:24-36` — one entry in the id-keyed map:

```typescript
const TOOL_ICONS: Readonly<Record<ToolId, IconRenderer>> = {
  colors: (iconRef): ReactNode => <PaletteIcon ref={iconRef} size={RAIL_GLYPH_SIZE} />,
  legend: (iconRef): ReactNode => <LayersIcon ref={iconRef} size={RAIL_GLYPH_SIZE} />,
};
```

The rail then renders it automatically (`TOOL_DEFINITIONS.map(...)` at `:82-90`). `ToolId` in
`src/types/ui.ts` gains `'map-style'`; `isToolId` and the stored-preference validator follow for
free because they read the same list. **Do not author a second rail row component** — `ToolRailRow`
(`:56-80`) already owns the hover/animation/tabindex contract and its doc comment forbids a second
roving-tabindex writer.

**Selector budget:** zero new selectors from the rail — rows are styled by `rowId`, not position
(assertion 16).

---

### `src/components/controls/MapStylePanel.tsx` + `src/styles/controls/mapStyle.css` (new surface)

**Analog:** `src/styles/controls/legendEditor.css:1-30` for the sheet; `ToolPanel.tsx:19-31` for the
shell contract the panel body must respect.

```css
/*
 * `LegendDisclosure` and `LegendEditor` - the `legend` panel: … The disclosure
 * and the editor share a file because the disclosure exists only to open this
 * editor; splitting them would give one surface two homes.
 */
.legend-disclosure > button { display: flex; align-items: center; … }
```

Copy: the header comment naming the components the sheet owns and *why* they share it; token-only
values (`var(--space-md)`, `var(--themely-*)`) — no literals.

Deliberately differ: UI-SPEC § 11 rule 1 — **reuse the Colors panel's section/label/divider/pill
classes; a copied pill is a defect.** `mapStyle.css` should be the smallest sheet in the directory.

Registration, `src/main.tsx:19-32`:

```tsx
import './styles/controls/controls.css';
import './styles/controls/selectionPanel.css';
import './styles/controls/colorPicker.css';
…
/* Last, so the shell's structural rules win … Assertion 20 … compares this list
   against a recursive walk of `src/styles` AS SETS */
import './styles/editor.css';
```

`mapStyle.css` goes **immediately after `colorPicker.css`**; `editor.css` stays last.

---

### `src/styles/uiContract.test.ts` (css contract)

**Analog:** its own assertions 10 and 21.

Panel width, `:583-586` — change the literal, not the mechanism:

```typescript
const CLOSED_PANEL_WIDTH = '0px';
const OPEN_PANEL_WIDTH = '280px';   // → '360px' (D4-05)
const RAIL_WIDTH = '56px';
```

Ceiling, `:474-488` — the comment *is* the contract:

```typescript
/**
 * Measured after the `03-10` sweep … The pre-sweep number was **339**; thirteen
 * distinct selectors were deleted and none was added, so the shrink is a stated
 * number rather than an impression.
 * **It is a ceiling, not an equality.** … **Maintenance rule**: lower it when
 * rules are deleted; raise it only with a stated reason in the commit.
 */
const SELECTOR_INVENTORY_CEILING = 326;
```

Every Phase 4 stylesheet change must record the measured before/after in the same commit. `04-02`
deletes more than it adds and should **lower** this number.

---

### `src/utils/storage.ts` (V2 → V3, D4-17/D4-18)

**Analog:** the V1→V2 path already in the file — this is a two-tier migration precedent, not a
guess.

- Pre-parse bound, `:736` and `:905` (**both sites**): `if (serialized.length > MAX_STORAGE_SERIALIZED_LENGTH)` before `JSON.parse`, then `hasSafeJsonBudget(parsed)` at `:755`.
- Version gate, `:651-656`:

```typescript
if (value.schemaVersion !== 2) {
  return { name: identity.name, loadOutcome: { ok: false, reason: 'unsupported-version' }, recordIndex };
}
```

- The legacy upgrade, `:563-580` — **the exact shape D4-17 needs**: a V2 record is read, defaults
  are filled in, and the outcome carries a typed warning plus `sourceVersion`:

```typescript
function createLegacyOutcome(colors: ColorMap): CompositionLoadOutcome & { ok: true } {
  return {
    ok: true,
    value: { colors, camera: INITIAL_WORLD_CAMERA, snapshotId: 'modern',
             legend: reconcileLegend(Object.values(colors), createDefaultLegendState()),
             settings: { backgroundColor: '#FFFFFF' } },
    sourceVersion: 1,
    warnings: [{ code: 'legacy-migrated' }],
  };
}
```

- Type guard, `:804-808`: `isSavedCompositionV2` → add `isSavedCompositionV3`; keep both.

Deliberately differ: D4-11's dropped fields (`theme`, `backgroundOpacity`, `borderStyle`) must load
**without** a repair warning — `hasCorruptWarning` must stay `false` for them (RESEARCH's D4-11 row
is explicit). Dropping a field is not corruption. D4-18's G-2 test builds a V2 record directly with
a 15–32 char legend label using the same literal-record construction seen at `:665-670`.

---

### `src/utils/export.ts` (the safety-critical file)

**Analog:** `sanitizeExportClone` itself, `:295-356`. **Replace the hard-set, never delete it.**

```typescript
svg.querySelectorAll<SVGPathElement>(SCENE_PATH_SELECTOR).forEach((path) => {
  path.setAttribute('stroke', DEFAULT_BORDER_COLOR);
  path.setAttribute('stroke-width', EXPORT_BORDER_WIDTH);
  // The camera layer wraps this path in `scale(zoom)`. Without
  // `non-scaling-stroke` the border width is multiplied by that zoom …
  path.setAttribute('vector-effect', 'non-scaling-stroke');
  path.style.stroke = DEFAULT_BORDER_COLOR;
  path.style.strokeWidth = EXPORT_BORDER_WIDTH;
  path.style.vectorEffect = 'non-scaling-stroke';
  path.style.strokeDasharray = 'none';
  path.style.transition = 'none';
  path.style.filter = 'none';
});
```

The **`non-scaling-stroke` pin and the `filter/transition/dasharray` neutralisation must survive**
whatever D4-08 puts in place of the two colour/width literals — they are the fix for the
"borders looked super thick in the download only" bug, and the comment records it.

Also in scope, same file: `EDITOR_ONLY_SELECTOR` (`:28`) is what removes UI-SPEC § 6.5's band drag
handles and highlight layer; `collectReferencedIds` (used at `:309`) is what keeps a
`fill="url(#band-top)"` gradient id alive — a gradient referenced only from a stylesheet loses its
`id` and silently disappears.

---

### `scripts/prepareWorldData.mjs` (mesh derivation + D4-10 recount)

**Analog:** its own `--check` branch, `:413-424`:

```javascript
if (check) {
  const committedBytes = await readFile(OUTPUT_PATH);
  if (!canonicalBytes.equals(committedBytes)) {
    throw new Error('public/data/world-modern.geojson differs from deterministic output.');
  }
  globalThis.console.info('World GeoJSON check passed: 248 units and 195 selectable core states.');
  return;
}
```

Copy: byte-equality against a **deterministically re-derived** buffer (not a hash comparison at this
layer), `createHash('sha256')` from `node:crypto` at `:82` for the manifest source records, and the
success line that *states the counts*. The mesh gets the same treatment: derive → compare bytes →
record SHA-256 in `world-manifest.json`.

D4-10 touches **three** count sites, all `throw`s: `EXPECTED_CORE_COUNT = 195` (`:23`), the
selectable tally check (`:308-310`), and the `--check` success string (`:421`). All become 207.
Also `:244` (`Non-core world unit … must be non-selectable`) and `:248`/`:298`/`:303`
(color-policy consistency) encode the neutral policy being reversed — read each before editing.

---

### `tests/e2e/export.spec.ts` (per-property PNG gating with discrimination controls)

**Analog: `tests/e2e/export.spec.ts:470-652`, assertion 25.** This is the pattern D4-14 mandates and
the highest-value excerpt in this document.

The instrument (`:115-122`) — parse the PNG header in Node, never trust the harness:

```typescript
function readPngDimensions(bytes: Buffer): { width: number; height: number } {
  const signature = bytes.subarray(0, 8).toString('hex');
  expect(signature).toBe('89504e470d0a1a0a');
  expect(bytes.subarray(12, 16).toString('ascii')).toBe('IHDR');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}
```

Pixels are decoded **inside `page.evaluate`** (`:600-624`) by passing base64 buffers in, because
Node has no `ImageData`. The discrimination control is constructed in the same evaluate and run
through the **same counting machinery**:

```typescript
// The deliberately blank crop: an all-white buffer of the same size, run
// through the SAME counting machinery. It validates the instrument — a counter
// that reads ink into anything fails on it — and it is what the two real crops
// must both differ from.
const blankCrop = new ImageData(box.width, box.height);
blankCrop.data.fill(255);
return { inkNormal: countInk(normalCrop), inkBlank: countInk(blankCrop),
         diffNormalVsSuppressed: countDiff(normalCrop, suppressedCrop),
         diffNormalVsBlank: countDiff(normalCrop, blankCrop) };
```

Assertion order is load-bearing (`:626-651`):

```typescript
// Content floor FIRST: two blank corners satisfy "they differ" perfectly,
// and that exact defect shape has shipped here once.
expect(measured.inkNormal, 'the Inter-embedded legend crop is blank').toBeGreaterThan(500);
expect(measured.inkSuppressed, …).toBeGreaterThan(500);
// The load-bearing inequality
expect(measured.diffNormalVsSuppressed, 'the embedded @font-face did not change …').toBeGreaterThan(200);
// Blank-crop discrimination control
expect(measured.inkBlank).toBe(0);
expect(measured.diffNormalVsBlank).toBeGreaterThan(500);
```

Every Phase 4 export gate (water, coastline-vs-interior border, band, text) copies this exact
skeleton: **content floor → the inequality that names the property → blank control**, with every
`expect` carrying a message that says what the failure means. Thresholds come from a measurement
recorded in the same change — never a guess (UI-SPEC § 6.6 on `MIN_BAND_DELTA` / `NOISE_FLOOR`).

Two Phase-4-specific differences the planner must state:
1. **Bands are invisible on white water** — a band gate must use a non-white surface or a sample
   column crossing dark land, and must assert the **ordering of three samples** along the band axis
   plus a bands-off flat control, or it passes on an inverted gradient.
2. Ready-state helper `:88-95` already pins `LOGICAL_CORE_COUNT` and a legend text expectation —
   it moves to 207 with `appHarness.ts`.

---

### `tests/e2e/support/appHarness.ts`

`:5` — `export const LOGICAL_CORE_COUNT = 195;` → `207`. **`waitForApp` (`:16-19`) consumes it, so
every e2e spec inherits the change; do it in the first Phase 4 wave or the whole suite is red.**
Also `RailToolLabel` (`:36`) is a closed union of the four rail labels — it gains `'Map style'`.

---

## Shared Patterns

### Named discrete steps (D4-08 stroke weights, ramp ids)
**Source:** `src/utils/legend.ts:47-66` · **Apply to:** `ramps.ts`, `bands.ts`, map-style state
```typescript
// The one home for the legend vocabulary. Storage validation and the
// composition reducer import these; a value added in only one place is a drift
// bug, not a feature.
export const LEGEND_TEXT_SIZES: ReadonlySet<LegendTextSize> = new Set(['small','medium','large']);
```

### Render-time colour mapping over stored sentinels (D4-09)
**Source:** `src/constants/colors.ts:10-16` + `getEffectiveFeatureColor` in `src/utils/scene.ts`
```typescript
// … A solid fill, never a CSS filter - a filter applied through external CSS
// never reaches the serialised export clone, which is rasterised as an
// isolated SVG-as-image document.
export const NEUTRAL_UNIT_COLOR = '#E5E7EB';
```
`#FFFFFF` stays the **stored** sentinel; only the render maps it to grey. Storage, legend
exclusion, and undo semantics are untouched.

### No colour literal in a `.tsx`
**Source:** `src/constants/colors.ts:18-22` — the contract test's exemption list is closed at
`LegendOverlay.tsx`. Every Phase 4 preset hex lives in `src/constants/`.

### Comment-the-why, with the derivation
Every analog above carries a doc comment stating the reason and the measurement. Phase 4's new
constants (`BAND_MAX_HEIGHT`, ramp step counts, `MIN_BAND_DELTA`) must be written as derivations,
not literals.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| Interior-border **mesh derivation** in `scripts/prepareWorldData.mjs` | script | batch | `mapshaper -innerlines` has never been invoked in this repo. The `--check` verification *shape* has an analog (above); the derivation step itself is new. Planner must specify the invocation, the determinism guarantee, and where the mesh artifact lands. |
| The **two-`@font-face` / `unicode-range`** latin-ext strategy (D4-15) | asset + export | file-I/O | Only one `@font-face` has ever been inlined (`src/styles/interFontFace.ts`). RESEARCH measured the two-face approach works, but there is no in-repo shape to copy — it is authored from the research note. License check on the wider subset is also new work. |
| The `04-11` **`package.json`-unchanged** gate | test/CI | — | No precedent, and the closest attempt (`git diff --quiet HEAD`) is explicitly recorded in CLAUDE.md as a gate that **passed silently on a committed change**. Planner must specify a range diff against the phase-start SHA, and RED-prove it. |

Partial-analog warning: `MapStylePanel.tsx` has role-match analogs only (`LegendEditor`,
`ColorPicker`), and `04-02`'s redesign is changing those very surfaces — the planner should
sequence the Colors-panel redesign first (D4-04) so `MapStylePanel` copies the *new* vocabulary,
not the rejected one.

## Metadata

**Analog search scope:** `src/utils/`, `src/constants/`, `src/components/editor/`,
`src/components/icons/`, `src/styles/`, `src/styles/controls/`, `scripts/`, `tests/e2e/`,
`tests/e2e/support/`
**Files scanned:** ~20 read, directory inventories for 7 more
**Pattern extraction date:** 2026-08-06
