# CountriesIRL Phase 1 Execution Brief for Codex

**Target:** Production-ready Phase 1 MVP  
**Timeline:** 1–1.5 weeks  
**Quality bar:** "Super smooth" — polished interactions, fast performance, zero jank  
**Deployment:** Vercel or GitHub Pages

---

## Tech Stack (LOCKED IN)

- **Frontend:** React 18 + TypeScript
- **Mapping:** D3.js (v7+) with SVG rendering
- **State:** React Context + useReducer (for color history/undo-redo)
- **Build:** Vite
- **Data format:** GeoJSON (Natural Earth modern European boundaries)
- **Export:** html2canvas (for PNG generation)
- **Storage:** localStorage (save/load map configs)
- **Deployment:** Vercel (auto-deploy from git)

---

## Phase 1 Scope (MVP)

### Features In
- ✅ Interactive SVG map of Europe (modern borders)
- ✅ Click any country to select; visual selection indicator
- ✅ Color picker (palette presets + custom hex input)
- ✅ Assign same color to multiple countries at once
- ✅ Undo/redo (last 50 actions)
- ✅ Reset all colors to default (white)
- ✅ Export to PNG (1080×1080, Instagram square)
- ✅ Save map configuration locally (browser storage)
- ✅ Load previously saved maps
- ✅ Tooltips/help for first-time users
- ✅ Responsive design (works on tablets; mobile secondary)

### Features Out (Phase 2+)
- ❌ Historical borders (time period selector)
- ❌ Map centering/zoom levels
- ❌ Legend generation
- ❌ Batch timelapse export
- ❌ Regional zoom presets
- ❌ Hotkeys for palette colors

---

## Project Structure

```
countriesIRL/
├── public/
│   ├── index.html
│   └── data/
│       └── europe-modern.geojson (Natural Earth data)
├── src/
│   ├── main.tsx                    # Entry point
│   ├── App.tsx                     # Root component
│   ├── types/
│   │   ├── map.ts                  # GeoFeature, MapState types
│   │   └── ui.ts                   # ColorPaletteConfig, ExportOptions
│   ├── components/
│   │   ├── MapCanvas.tsx           # D3 SVG map renderer
│   │   ├── ColorPicker.tsx         # Color input + palette presets
│   │   ├── CountryList.tsx         # Bulk color assignment panel
│   │   ├── Controls.tsx            # Undo/redo/reset/export buttons
│   │   ├── SaveLoad.tsx            # Save/load UI
│   │   └── Tooltip.tsx             # Help tooltips
│   ├── hooks/
│   │   ├── useMapState.ts          # Centralized color state + history
│   │   ├── useGeoData.ts           # Load & cache GeoJSON
│   │   └── useLocalStorage.ts      # Persist maps to browser storage
│   ├── utils/
│   │   ├── export.ts               # PNG export (html2canvas)
│   │   ├── geojson.ts              # GeoJSON processing (lookup country by click)
│   │   ├── colors.ts               # Color utilities (hex validation, palette)
│   │   └── storage.ts              # localStorage helpers
│   ├── styles/
│   │   ├── App.css                 # Global layout
│   │   ├── MapCanvas.css           # SVG map styling
│   │   ├── Controls.css            # Button/control styling
│   │   └── theme.css               # Color tokens
│   └── constants/
│       ├── colors.ts               # Default palettes
│       └── config.ts               # Map bounds, defaults
├── vite.config.ts
├── tsconfig.json
└── package.json

```

---

## Core Architecture

### 1. Map State Management (useMapState hook)

```typescript
// Shape: { [countryId]: colorHex }
interface MapState {
  colors: Record<string, string>;
  history: Record<string, string>[];
  historyIndex: number;
  selectedCountry: string | null;
}

// Actions
type MapAction =
  | { type: 'SET_COLOR'; payload: { countryId: string; color: string } }
  | { type: 'SET_COLORS'; payload: Record<string, string> }  // Bulk
  | { type: 'RESET_ALL' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SELECT_COUNTRY'; payload: string | null };

// Hook exposes: state, dispatch, can undo, can redo, etc.
```

**Key detail:** History stored as full snapshots (not diffs) — simplifies undo/redo, acceptable since <1MB for 50 snapshots.

### 2. GeoJSON Processing (useGeoData hook)

```typescript
// Load europe-modern.geojson once on mount
// Features:
//   - Cache in state (no re-fetches)
//   - Build country name → feature ID lookup table
//   - Validate all features have a 'properties.name' field
//   - Expose: features[], lookup(lat, lng) → countryId

interface GeoFeature {
  id: string;
  properties: { name: string };
  geometry: GeoJSON.Geometry;
}
```

### 3. SVG Map Renderer (MapCanvas component)

- **D3 setup:** `d3.geoPath()` for converting GeoJSON to SVG paths
- **Projection:** `d3.geoMercator()` with bounds set to fit Europe
- **Rendering:** SVG `<g>` for each country; path color from state
- **Interactivity:**
  - Click path → select country + dispatch action
  - Hover → show tooltip with country name + current color
  - Visual feedback: border highlight on selected country
- **Performance:** Use React key stability; D3 updates only on color change (not re-render)

### 4. Color Picker (ColorPicker component)

- **Palette presets:** 8–10 common colors (red, blue, green, white, gray, etc.)
- **Custom hex input:** Text field for `#RRGGBB` or `rgb(r,g,b)`
- **Live preview:** Show selected color before applying
- **Apply flow:** Click "Apply to Selected" or bulk-assign to multiple
- **Validation:** Only allow valid hex/rgb; show error toast if invalid

### 5. Export Flow (export.ts utility)

```typescript
// Key function: exportMapPng(svgElement, filename)
// 1. Clone the map SVG
// 2. Add title/metadata to cloned SVG
// 3. Use html2canvas to render SVG → canvas
// 4. canvas.toBlob() → PNG
// 5. Create download link + trigger

// Options:
// - DPI scaling (2x for crisp output)
// - Filename: "CountriesIRL_<timestamp>.png"
// - Size: Force 1080×1080 canvas before export
```

---

## Component Breakdown

### App.tsx (Root)

```typescript
export default function App() {
  const { colors, dispatch, canUndo, canRedo } = useMapState();
  const { features, lookup } = useGeoData(); // Load europe-modern.geojson
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>CountriesIRL Map Generator</h1>
        <p>Color countries, generate Instagram-ready maps</p>
      </header>

      <main className="app-main">
        <section className="map-section">
          <MapCanvas
            features={features}
            colors={colors}
            selectedCountry={selectedCountry}
            onCountryClick={(countryId) => setSelectedCountry(countryId)}
            onCountryColor={(countryId, color) =>
              dispatch({ type: 'SET_COLOR', payload: { countryId, color } })
            }
          />
        </section>

        <aside className="control-panel">
          <Controls
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={() => dispatch({ type: 'UNDO' })}
            onRedo={() => dispatch({ type: 'REDO' })}
            onReset={() => dispatch({ type: 'RESET_ALL' })}
            onExport={() => exportMap()}
            onSave={() => setShowSaveDialog(true)}
          />

          {selectedCountry && (
            <ColorPicker
              currentColor={colors[selectedCountry] || '#ffffff'}
              onColorChange={(color) =>
                dispatch({
                  type: 'SET_COLOR',
                  payload: { countryId: selectedCountry, color },
                })
              }
              onApplyToMultiple={(countryIds, color) =>
                dispatch({
                  type: 'SET_COLORS',
                  payload: countryIds.reduce((acc, id) => ({
                    ...acc,
                    [id]: color,
                  }), {}),
                })
              }
            />
          )}

          <CountryList
            countries={features.map(f => f.properties.name)}
            colors={colors}
            onSelectCountry={setSelectedCountry}
          />

          {showSaveDialog && (
            <SaveLoad
              colors={colors}
              onSave={(name) => saveMapConfig(name, colors)}
              onLoad={(name) => {
                const loaded = loadMapConfig(name);
                dispatch({ type: 'SET_COLORS', payload: loaded });
              }}
              onClose={() => setShowSaveDialog(false)}
            />
          )}
        </aside>
      </main>

      <Tooltip />
    </div>
  );
}
```

### MapCanvas.tsx (D3 SVG Renderer)

```typescript
export function MapCanvas({
  features,
  colors,
  selectedCountry,
  onCountryClick,
  onCountryColor,
}: MapCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!features.length || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const projection = d3
      .geoMercator()
      .fitExtent(
        [[20, 20], [width - 20, height - 20]],
        { type: 'FeatureCollection', features }
      );

    const pathGenerator = d3.geoPath().projection(projection);

    // Bind features to paths
    svg
      .selectAll('path')
      .data(features, (d) => d.id)
      .join(
        (enter) =>
          enter
            .append('path')
            .attr('d', (d) => pathGenerator(d.geometry))
            .attr('class', 'country-path')
            .on('click', (e, d) => {
              e.stopPropagation();
              onCountryClick(d.id);
            })
            .on('mouseenter', (e, d) => showTooltip(d.properties.name)),
        (update) => update,
        (exit) => exit.remove()
      )
      .attr('fill', (d) => colors[d.id] || '#ffffff')
      .attr('stroke', (d) =>
        d.id === selectedCountry ? '#000' : '#ccc'
      )
      .attr('stroke-width', (d) =>
        d.id === selectedCountry ? '2px' : '0.5px'
      );
  }, [features, colors, selectedCountry]);

  return <svg ref={svgRef} width={width} height={height} />;
}
```

### ColorPicker.tsx

```typescript
export function ColorPicker({
  currentColor,
  onColorChange,
  onApplyToMultiple,
}: ColorPickerProps) {
  const [customHex, setCustomHex] = useState(currentColor);
  const presets = ['#FF0000', '#00AA00', '#0000FF', '#FFFF00', '#FFFFFF', '#808080'];

  return (
    <div className="color-picker">
      <h3>Color Picker</h3>
      <div className="preset-colors">
        {presets.map((color) => (
          <button
            key={color}
            className={`color-swatch ${currentColor === color ? 'active' : ''}`}
            style={{ backgroundColor: color }}
            onClick={() => onColorChange(color)}
            title={color}
          />
        ))}
      </div>
      <div className="custom-color">
        <input
          type="text"
          placeholder="#RRGGBB"
          value={customHex}
          onChange={(e) => {
            setCustomHex(e.target.value);
            if (isValidHex(e.target.value)) {
              onColorChange(e.target.value);
            }
          }}
        />
      </div>
      <button className="btn-primary" onClick={() => onApplyToMultiple(selectedCountries, customHex)}>
        Apply to Multiple
      </button>
    </div>
  );
}
```

### Controls.tsx

```typescript
export function Controls({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onReset,
  onExport,
  onSave,
}: ControlsProps) {
  return (
    <div className="controls">
      <button onClick={onUndo} disabled={!canUndo} className="btn-icon">
        ↶ Undo
      </button>
      <button onClick={onRedo} disabled={!canRedo} className="btn-icon">
        ↷ Redo
      </button>
      <button onClick={onReset} className="btn-icon btn-danger">
        🔄 Reset All
      </button>
      <hr />
      <button onClick={onSave} className="btn-primary">
        💾 Save Map
      </button>
      <button onClick={onExport} className="btn-primary btn-success">
        📥 Export PNG
      </button>
    </div>
  );
}
```

---

## Key Implementation Details

### Performance ("Super Smooth")

1. **D3 updates only on color change** — don't re-render entire SVG
2. **Lazy load GeoJSON** — fetch once, cache in state
3. **useCallback on event handlers** — prevent unnecessary re-renders
4. **PNG export in background** — use worker thread if >3 sec (nice-to-have)
5. **SVG paths pre-computed** — no runtime geometry calculations

### UX Polish

1. **Visual feedback on hover** — tooltip shows country name + current color
2. **Selection indicator** — thick black border on selected country
3. **Smooth transitions** — 150ms fade on color change
4. **Color preview** — show selected color before applying
5. **Keyboard support** — arrow keys to navigate countries (optional MVP)
6. **First-time help** — brief onboarding tooltip on load ("Click a country to start")
7. **Error handling** — toast notifications for invalid hex, export failures

### Data Quality

1. **Validate GeoJSON** — check all features have `properties.name`
2. **Country name standardization** — trim whitespace, check against known list
3. **PNG export quality** — 2x DPI scaling to ensure crispness

### Browser Storage

```typescript
// Save: { name: string, colors: Record<string, string>, timestamp: number }
// Store up to 10 maps (quota ~5MB)
// UI: List saved maps, load/delete actions
```

---

## Development Workflow

1. **Setup Vite project:**
   ```bash
   npm create vite@latest countriesirl -- --template react-ts
   npm install d3 html2canvas
   ```

2. **Add GeoJSON:** Download europe-modern.geojson from Natural Earth (10m_natural_earth_data)

3. **Build in this order:**
   - useMapState hook (state machine for colors)
   - useGeoData hook (load & process GeoJSON)
   - MapCanvas (D3 rendering)
   - ColorPicker (UI)
   - Controls (buttons)
   - SaveLoad (localStorage)
   - Export (html2canvas)
   - App (tie together)

4. **Test iteratively:**
   - Color 5 countries, check state updates
   - Undo 3 times, verify history
   - Export PNG, verify size (1080×1080)
   - Save map, reload page, verify load works

5. **Deploy:**
   ```bash
   npm install -D vercel
   vercel
   ```

---

## Quality Checklist (Ship When Done)

- [ ] Map renders in <500ms
- [ ] Color assignment instant (no lag)
- [ ] Undo/redo works for 50+ actions
- [ ] PNG export completes in <3 seconds
- [ ] localStorage saves/loads without errors
- [ ] Hover tooltip shows country name
- [ ] Selection visual feedback clear
- [ ] Mobile responsiveness works (tablet+)
- [ ] No console errors or warnings
- [ ] Tooltips guide first-time users
- [ ] Color picker validates hex input
- [ ] Export PNG is exactly 1080×1080
- [ ] Dark mode works (basic: invert colors for dark theme)
- [ ] Browser compatibility: Chrome, Firefox, Safari, Edge (last 2 versions)

---

## Success Criteria

**Phase 1 is complete when:**
1. User can color 5+ countries in <2 minutes
2. PNG export is Instagram-ready (correct size, quality)
3. Save/load works reliably
4. Zero crashes after 100+ interactions
5. UI feels responsive and polished (no jank)
6. Deployed and shareable URL works

---

## Next Phase (Phase 2) Preview

After Phase 1 ships, Phase 2 will add:
- Historical border GeoJSON files (1400s, 1700s, 1800s, 1900s)
- Time period selector UI
- Map centering on any country
- Legend generation
- **Batch timelapse export** (new feature — generate 5–20 PNGs showing progression)

---

**Ready to build?**
