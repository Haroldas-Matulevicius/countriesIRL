# Codex: CountriesIRL Phase 1 Build Prompt

Copy everything below and paste into your Codex CLI. This will build the entire Phase 1 MVP.

---

## Build CountriesIRL Phase 1 MVP — Complete Implementation

**Context:** You're building a web-based choropleth map generator for Instagram creators. Phase 1 is a modern European map with interactive coloring, undo/redo, local save/load, and PNG export. The tool should feel smooth and polished.

**Tech Stack (LOCKED):**
- React 18 + TypeScript
- D3.js v7+ (SVG rendering, projections)
- Vite (build tool)
- html2canvas (PNG export)
- localStorage (save/load)
- Vercel (deployment)

**Target:** Production-ready Phase 1 in this session. Should be deployable and "super smooth."

---

## Phase 1 Scope

**In scope:**
- Interactive SVG map of modern European countries
- Click any country to select; color picker UI
- Assign colors to single or multiple countries
- Undo/redo (50-action history)
- Reset all colors
- Export to PNG (1080×1080 Instagram square)
- Save/load map configurations to browser localStorage
- Tooltips and help text for first-time users
- Responsive design (works on tablets, mobile secondary)

**Out of scope (Phase 2+):**
- Historical borders
- Map centering/zoom
- Legend generation
- Batch timelapse export
- Mobile app

---

## Project Structure & File Layout

Create this directory structure:

```
countriesIRL/
├── public/
│   ├── index.html
│   └── data/
│       └── europe-modern.geojson (download from Natural Earth)
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── types/
│   │   ├── map.ts
│   │   └── ui.ts
│   ├── components/
│   │   ├── MapCanvas.tsx
│   │   ├── ColorPicker.tsx
│   │   ├── CountryList.tsx
│   │   ├── Controls.tsx
│   │   ├── SaveLoad.tsx
│   │   └── Tooltip.tsx
│   ├── hooks/
│   │   ├── useMapState.ts
│   │   ├── useGeoData.ts
│   │   └── useLocalStorage.ts
│   ├── utils/
│   │   ├── export.ts
│   │   ├── geojson.ts
│   │   ├── colors.ts
│   │   └── storage.ts
│   ├── styles/
│   │   ├── App.css
│   │   ├── MapCanvas.css
│   │   ├── Controls.css
│   │   └── theme.css
│   └── constants/
│       ├── colors.ts
│       └── config.ts
├── vite.config.ts
├── tsconfig.json
├── package.json
└── .gitignore
```

---

## Step 1: Initialize Project

1. Navigate to the project directory
2. Run: `npm create vite@latest . -- --template react-ts`
3. Run: `npm install`
4. Run: `npm install d3 html2canvas`
5. Run: `npm install -D @types/d3`

---

## Step 2: Create File Structure & Core Files

### 2.1 vite.config.ts
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    target: 'es2020',
  },
})
```

### 2.2 tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 2.3 public/index.html
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CountriesIRL Map Generator</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### 2.4 Download GeoJSON Data

Download `ne_10m_admin_0_countries.geojson` from Natural Earth (https://www.naturalearthdata.com/downloads/10m-cultural-vectors/) and save to `public/data/europe-modern.geojson`. This contains modern country boundaries.

Filter to Europe only before saving (or load it and filter in code — your choice).

---

## Step 3: Core Types

### src/types/map.ts
```typescript
export interface GeoFeature {
  type: 'Feature';
  id: string;
  properties: {
    name: string;
    [key: string]: any;
  };
  geometry: {
    type: string;
    coordinates: any;
  };
}

export interface MapState {
  colors: Record<string, string>;
  history: Array<Record<string, string>>;
  historyIndex: number;
  selectedCountry: string | null;
}

export type MapAction =
  | { type: 'SET_COLOR'; payload: { countryId: string; color: string } }
  | { type: 'SET_COLORS'; payload: Record<string, string> }
  | { type: 'RESET_ALL' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SELECT_COUNTRY'; payload: string | null }
  | { type: 'LOAD_STATE'; payload: Record<string, string> };
```

### src/types/ui.ts
```typescript
export interface ColorPaletteConfig {
  presets: string[];
  defaultColor: string;
}

export interface SavedMap {
  name: string;
  colors: Record<string, string>;
  timestamp: number;
}

export interface ExportOptions {
  width: number;
  height: number;
  dpi: number;
}
```

---

## Step 4: Hooks

### src/hooks/useMapState.ts
```typescript
import { useReducer, useCallback } from 'react';
import { MapState, MapAction } from '../types/map';

const initialState: MapState = {
  colors: {},
  history: [{}],
  historyIndex: 0,
  selectedCountry: null,
};

function mapReducer(state: MapState, action: MapAction): MapState {
  switch (action.type) {
    case 'SET_COLOR': {
      const newColors = {
        ...state.colors,
        [action.payload.countryId]: action.payload.color,
      };
      return {
        ...state,
        colors: newColors,
        history: state.history.slice(0, state.historyIndex + 1).concat([newColors]),
        historyIndex: state.historyIndex + 1,
      };
    }

    case 'SET_COLORS': {
      const newColors = { ...state.colors, ...action.payload };
      return {
        ...state,
        colors: newColors,
        history: state.history.slice(0, state.historyIndex + 1).concat([newColors]),
        historyIndex: state.historyIndex + 1,
      };
    }

    case 'RESET_ALL': {
      const emptyColors: Record<string, string> = {};
      return {
        ...state,
        colors: emptyColors,
        history: state.history.slice(0, state.historyIndex + 1).concat([emptyColors]),
        historyIndex: state.historyIndex + 1,
      };
    }

    case 'UNDO': {
      if (state.historyIndex > 0) {
        return { ...state, historyIndex: state.historyIndex - 1, colors: state.history[state.historyIndex - 1] };
      }
      return state;
    }

    case 'REDO': {
      if (state.historyIndex < state.history.length - 1) {
        return { ...state, historyIndex: state.historyIndex + 1, colors: state.history[state.historyIndex + 1] };
      }
      return state;
    }

    case 'SELECT_COUNTRY': {
      return { ...state, selectedCountry: action.payload };
    }

    case 'LOAD_STATE': {
      return {
        ...state,
        colors: action.payload,
        history: [action.payload],
        historyIndex: 0,
      };
    }

    default:
      return state;
  }
}

export function useMapState() {
  const [state, dispatch] = useReducer(mapReducer, initialState);

  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  return { state, dispatch, canUndo, canRedo };
}
```

### src/hooks/useGeoData.ts
```typescript
import { useEffect, useState } from 'react';
import { GeoFeature } from '../types/map';

export function useGeoData() {
  const [features, setFeatures] = useState<GeoFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/europe-modern.geojson')
      .then((res) => res.json())
      .then((data) => {
        // Filter to Europe only (optional, or keep global)
        const europeFeatures = data.features.filter((f: GeoFeature) => {
          const name = f.properties.name || '';
          // Basic European country list
          const europeCountries = [
            'Portugal', 'Spain', 'France', 'Germany', 'Poland', 'Italy', 'Greece',
            'Sweden', 'Norway', 'Denmark', 'Finland', 'Ireland', 'United Kingdom',
            'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Czech Republic',
            'Slovakia', 'Hungary', 'Romania', 'Bulgaria', 'Serbia', 'Croatia',
            'Bosnia and Herzegovina', 'Montenegro', 'North Macedonia', 'Albania',
            'Lithuania', 'Latvia', 'Estonia', 'Belarus', 'Ukraine', 'Moldova',
            'Russia', // Part of Europe
          ];
          return europeCountries.includes(name);
        });

        // Ensure each feature has an id
        const withIds = europeFeatures.map((f: GeoFeature, idx: number) => ({
          ...f,
          id: f.id || f.properties.name || `country-${idx}`,
        }));

        setFeatures(withIds);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { features, loading, error };
}
```

### src/hooks/useLocalStorage.ts
```typescript
import { SavedMap } from '../types/ui';

const STORAGE_KEY = 'countriesirl_maps';
const MAX_MAPS = 10;

export function useLocalStorage() {
  const saveMaps = (name: string, colors: Record<string, string>) => {
    const maps = getMaps();
    const newMap: SavedMap = {
      name,
      colors,
      timestamp: Date.now(),
    };

    const filtered = maps.filter((m) => m.name !== name);
    const updated = [newMap, ...filtered].slice(0, MAX_MAPS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const getMaps = (): SavedMap[] => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  };

  const loadMap = (name: string): Record<string, string> | null => {
    const maps = getMaps();
    const map = maps.find((m) => m.name === name);
    return map?.colors || null;
  };

  const deleteMaps = (name: string) => {
    const maps = getMaps();
    const filtered = maps.filter((m) => m.name !== name);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  };

  return { saveMaps, getMaps, loadMap, deleteMaps };
}
```

---

## Step 5: Utilities

### src/utils/colors.ts
```typescript
export const COLOR_PRESETS = [
  '#FF0000', // Red
  '#00AA00', // Green
  '#0000FF', // Blue
  '#FFFF00', // Yellow
  '#FF00FF', // Magenta
  '#00FFFF', // Cyan
  '#FFFFFF', // White
  '#808080', // Gray
];

export function isValidHex(hex: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
}

export function isValidRgb(rgb: string): boolean {
  return /^rgb\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\)$/.test(rgb);
}

export function normalizeColor(color: string): string {
  const cleaned = color.trim();
  if (isValidHex(cleaned)) return cleaned;
  if (isValidRgb(cleaned)) return cleaned;
  return '#FFFFFF'; // Default to white
}
```

### src/utils/export.ts
```typescript
import html2canvas from 'html2canvas';

export async function exportMapPng(
  svgElement: SVGSVGElement | null,
  filename: string
): Promise<void> {
  if (!svgElement) {
    throw new Error('SVG element not found');
  }

  try {
    // Clone SVG to avoid modifying original
    const clone = svgElement.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('width', '1080');
    clone.setAttribute('height', '1080');

    // Create temporary container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.appendChild(clone);
    document.body.appendChild(container);

    // Use html2canvas to render
    const canvas = await html2canvas(clone, {
      backgroundColor: '#ffffff',
      scale: 2, // 2x DPI for crisp output
    });

    // Create download link
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${filename}.png`;
    link.click();

    // Cleanup
    document.body.removeChild(container);
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
}
```

### src/utils/geojson.ts
```typescript
import { GeoFeature } from '../types/map';

export function buildCountryLookup(features: GeoFeature[]): Map<string, GeoFeature> {
  const lookup = new Map<string, GeoFeature>();
  features.forEach((feature) => {
    lookup.set(feature.id, feature);
  });
  return lookup;
}

export function getCountryById(features: GeoFeature[], id: string): GeoFeature | undefined {
  return features.find((f) => f.id === id);
}

export function getCountryNameById(features: GeoFeature[], id: string): string {
  const feature = getCountryById(features, id);
  return feature?.properties.name || 'Unknown';
}
```

### src/utils/storage.ts
```typescript
// Re-export useLocalStorage utilities here if needed
export { useLocalStorage } from '../hooks/useLocalStorage';
```

---

## Step 6: Constants

### src/constants/colors.ts
```typescript
export const DEFAULT_COLOR = '#FFFFFF';
export const SELECTED_BORDER_COLOR = '#000000';
export const DEFAULT_BORDER_COLOR = '#CCCCCC';
export const SELECTED_STROKE_WIDTH = '2px';
export const DEFAULT_STROKE_WIDTH = '0.5px';
```

### src/constants/config.ts
```typescript
export const MAP_WIDTH = 1080;
export const MAP_HEIGHT = 1080;
export const EXPORT_DPI = 2;

export const EUROPE_BOUNDS = [
  [-10, 35], // Southwest (lon, lat)
  [40, 70],  // Northeast (lon, lat)
];
```

---

## Step 7: Components

### src/components/MapCanvas.tsx
```typescript
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { GeoFeature } from '../types/map';
import '../styles/MapCanvas.css';

interface MapCanvasProps {
  features: GeoFeature[];
  colors: Record<string, string>;
  selectedCountry: string | null;
  onCountryClick: (countryId: string) => void;
  onCountryHover: (countryName: string | null) => void;
}

export function MapCanvas({
  features,
  colors,
  selectedCountry,
  onCountryClick,
  onCountryHover,
}: MapCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!features.length || !svgRef.current) return;

    const width = 1080;
    const height = 1080;

    const svg = d3.select(svgRef.current);

    // Clear previous
    svg.selectAll('*').remove();

    // Create projection and path generator
    const projection = d3
      .geoMercator()
      .fitExtent(
        [[20, 20], [width - 20, height - 20]],
        {
          type: 'FeatureCollection' as const,
          features: features as any,
        }
      );

    const pathGenerator = d3.geoPath().projection(projection);

    // Create a group for all paths
    const g = svg.append('g');

    // Bind data and create paths
    g.selectAll('path')
      .data(features, (d: any) => d.id)
      .join('path')
      .attr('d', (d: any) => pathGenerator(d.geometry) || '')
      .attr('class', 'country-path')
      .attr('fill', (d: any) => colors[d.id] || '#FFFFFF')
      .attr('stroke', (d: any) =>
        d.id === selectedCountry ? '#000000' : '#CCCCCC'
      )
      .attr('stroke-width', (d: any) =>
        d.id === selectedCountry ? '2px' : '0.5px'
      )
      .attr('cursor', 'pointer')
      .on('click', (event: any, d: any) => {
        event.stopPropagation();
        onCountryClick(d.id);
      })
      .on('mouseenter', (event: any, d: any) => {
        onCountryHover(d.properties.name);
      })
      .on('mouseleave', () => {
        onCountryHover(null);
      });
  }, [features, colors, selectedCountry]);

  return (
    <svg
      ref={svgRef}
      width="1080"
      height="1080"
      className="map-canvas"
      style={{ border: '1px solid #eee', borderRadius: '4px' }}
    />
  );
}
```

### src/components/ColorPicker.tsx
```typescript
import React, { useState } from 'react';
import { COLOR_PRESETS, isValidHex, normalizeColor } from '../utils/colors';
import '../styles/Controls.css';

interface ColorPickerProps {
  currentColor: string;
  onColorChange: (color: string) => void;
}

export function ColorPicker({
  currentColor,
  onColorChange,
}: ColorPickerProps) {
  const [customHex, setCustomHex] = useState(currentColor);
  const [error, setError] = useState('');

  const handleHexChange = (value: string) => {
    setCustomHex(value);
    setError('');

    if (value.trim() === '') {
      setError('Enter a valid hex color');
      return;
    }

    if (isValidHex(value)) {
      onColorChange(value);
    } else {
      setError('Invalid hex format (e.g., #FF0000)');
    }
  };

  return (
    <div className="color-picker">
      <h3>Color Picker</h3>
      <div className="preset-colors">
        {COLOR_PRESETS.map((color) => (
          <button
            key={color}
            className={`color-swatch ${currentColor === color ? 'active' : ''}`}
            style={{ backgroundColor: color }}
            onClick={() => {
              onColorChange(color);
              setCustomHex(color);
              setError('');
            }}
            title={color}
            aria-label={`Select color ${color}`}
          />
        ))}
      </div>
      <div className="custom-color">
        <input
          type="text"
          placeholder="#RRGGBB"
          value={customHex}
          onChange={(e) => handleHexChange(e.target.value)}
          className={error ? 'error' : ''}
        />
        {error && <div className="error-text">{error}</div>}
      </div>
    </div>
  );
}
```

### src/components/CountryList.tsx
```typescript
import React, { useMemo } from 'react';
import '../styles/Controls.css';

interface CountryListProps {
  countries: string[];
  colors: Record<string, string>;
  onSelectCountry: (countryName: string) => void;
}

export function CountryList({
  countries,
  colors,
  onSelectCountry,
}: CountryListProps) {
  const sortedCountries = useMemo(
    () => [...countries].sort((a, b) => a.localeCompare(b)),
    [countries]
  );

  return (
    <div className="country-list">
      <h3>Countries</h3>
      <div className="country-grid">
        {sortedCountries.map((country) => (
          <button
            key={country}
            className="country-button"
            onClick={() => onSelectCountry(country)}
            style={{
              backgroundColor: colors[country] || '#FFFFFF',
              color: shouldUseDarkText(colors[country]) ? '#000' : '#FFF',
            }}
          >
            {country}
          </button>
        ))}
      </div>
    </div>
  );
}

function shouldUseDarkText(hexColor?: string): boolean {
  if (!hexColor) return true;
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128;
}
```

### src/components/Controls.tsx
```typescript
import React from 'react';
import { exportMapPng } from '../utils/export';
import '../styles/Controls.css';

interface ControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onSave: () => void;
  svgRef: React.RefObject<SVGSVGElement>;
}

export function Controls({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onReset,
  onSave,
  svgRef,
}: ControlsProps) {
  const handleExport = async () => {
    try {
      const filename = `CountriesIRL_${new Date().toISOString().split('T')[0]}`;
      await exportMapPng(svgRef.current, filename);
      alert('Map exported successfully!');
    } catch (error) {
      alert('Export failed. See console for details.');
      console.error(error);
    }
  };

  return (
    <div className="controls">
      <div className="button-group">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="btn-icon"
          title="Undo (Ctrl+Z)"
        >
          ↶ Undo
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="btn-icon"
          title="Redo (Ctrl+Y)"
        >
          ↷ Redo
        </button>
        <button onClick={onReset} className="btn-icon btn-danger" title="Reset all colors">
          🔄 Reset
        </button>
      </div>

      <hr />

      <div className="button-group">
        <button onClick={onSave} className="btn-primary">
          💾 Save Map
        </button>
        <button onClick={handleExport} className="btn-primary btn-success">
          📥 Export PNG
        </button>
      </div>
    </div>
  );
}
```

### src/components/SaveLoad.tsx
```typescript
import React, { useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import '../styles/Controls.css';

interface SaveLoadProps {
  colors: Record<string, string>;
  onSave: (name: string) => void;
  onLoad: (name: string) => void;
  onClose: () => void;
}

export function SaveLoad({
  colors,
  onSave,
  onLoad,
  onClose,
}: SaveLoadProps) {
  const { getMaps, saveMaps, deleteMaps } = useLocalStorage();
  const [mapName, setMapName] = useState('');
  const savedMaps = getMaps();

  const handleSave = () => {
    if (!mapName.trim()) {
      alert('Please enter a map name');
      return;
    }
    saveMaps(mapName, colors);
    onSave(mapName);
    setMapName('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Save / Load Map</h2>

        <div className="save-section">
          <h3>Save Current Map</h3>
          <input
            type="text"
            placeholder="Map name (e.g., EU Summer 2026)"
            value={mapName}
            onChange={(e) => setMapName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <button onClick={handleSave} className="btn-primary">
            Save
          </button>
        </div>

        <hr />

        <div className="load-section">
          <h3>Load Saved Maps</h3>
          {savedMaps.length === 0 ? (
            <p>No saved maps yet.</p>
          ) : (
            <div className="saved-maps-list">
              {savedMaps.map((map) => (
                <div key={map.name} className="saved-map-item">
                  <div>
                    <strong>{map.name}</strong>
                    <small>{new Date(map.timestamp).toLocaleDateString()}</small>
                  </div>
                  <button onClick={() => onLoad(map.name)} className="btn-small">
                    Load
                  </button>
                  <button
                    onClick={() => {
                      deleteMaps(map.name);
                      alert('Map deleted');
                    }}
                    className="btn-small btn-danger"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <hr />
        <button onClick={onClose} className="btn-secondary">
          Close
        </button>
      </div>
    </div>
  );
}
```

### src/components/Tooltip.tsx
```typescript
import React, { useState } from 'react';
import '../styles/Controls.css';

export function Tooltip() {
  const [visible, setVisible] = useState(true);
  const [tooltipText, setTooltipText] = useState('Click a country to start coloring');

  React.useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="tooltip-banner">
      <span>{tooltipText}</span>
      <button onClick={() => setVisible(false)}>✕</button>
    </div>
  );
}
```

---

## Step 8: Styling

### src/styles/App.css
```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f5f5f5;
  color: #333;
}

.app-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1.5rem;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.app-header h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.app-header p {
  font-size: 0.95rem;
  opacity: 0.95;
}

.app-main {
  display: flex;
  flex: 1;
  overflow: hidden;
  gap: 1.5rem;
  padding: 1.5rem;
}

.map-section {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: auto;
}

.control-panel {
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
}

@media (max-width: 1200px) {
  .app-main {
    flex-direction: column;
  }

  .control-panel {
    width: 100%;
    max-height: 300px;
  }
}

@media (max-width: 768px) {
  .app-main {
    padding: 1rem;
    gap: 1rem;
  }

  .app-header h1 {
    font-size: 1.5rem;
  }
}
```

### src/styles/MapCanvas.css
```css
.map-canvas {
  max-width: 100%;
  height: auto;
  cursor: grab;
}

.map-canvas:active {
  cursor: grabbing;
}

.country-path {
  transition: stroke 200ms ease, fill 150ms ease;
}

.country-path:hover {
  filter: brightness(0.95);
  stroke-width: 1px !important;
}
```

### src/styles/Controls.css
```css
.controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.button-group {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn-icon,
.btn-primary,
.btn-small,
.btn-secondary {
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 200ms ease;
}

.btn-icon {
  flex: 1;
  background: #f0f0f0;
  color: #333;
  border: 1px solid #ddd;
}

.btn-icon:hover:not(:disabled) {
  background: #e0e0e0;
}

.btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  flex: 1;
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5568d3;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-success {
  background: #48bb78;
}

.btn-success:hover {
  background: #38a169;
}

.btn-danger {
  background: #f56565;
  color: white;
}

.btn-danger:hover {
  background: #e53e3e;
}

.btn-secondary {
  background: #e2e8f0;
  color: #2d3748;
}

.btn-secondary:hover {
  background: #cbd5e0;
}

.btn-small {
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
}

hr {
  border: none;
  border-top: 1px solid #e2e8f0;
  margin: 0.5rem 0;
}

/* Color Picker */
.color-picker {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.color-picker h3 {
  font-size: 1rem;
  margin-bottom: 0.25rem;
}

.preset-colors {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

.color-swatch {
  width: 50px;
  height: 50px;
  border: 2px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: transform 150ms ease, border-color 150ms ease;
}

.color-swatch:hover {
  transform: scale(1.05);
}

.color-swatch.active {
  border-color: #333;
  box-shadow: 0 0 0 2px white, 0 0 0 4px #333;
}

.custom-color input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-family: monospace;
  font-size: 0.9rem;
}

.custom-color input.error {
  border-color: #f56565;
  background: #fff5f5;
}

.error-text {
  color: #f56565;
  font-size: 0.8rem;
  margin-top: -0.5rem;
}

/* Country List */
.country-list h3 {
  font-size: 1rem;
  margin-bottom: 0.75rem;
}

.country-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  padding: 0.5rem;
  border-radius: 6px;
}

.country-button {
  padding: 0.5rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 150ms ease;
  font-weight: 500;
}

.country-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Save/Load Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal h2 {
  margin-bottom: 1.5rem;
}

.modal h3 {
  font-size: 0.95rem;
  margin-bottom: 0.75rem;
}

.modal input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  margin-bottom: 0.75rem;
}

.save-section,
.load-section {
  margin-bottom: 1.5rem;
}

.saved-maps-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.saved-map-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 6px;
  gap: 0.5rem;
}

.saved-map-item div {
  flex: 1;
}

.saved-map-item strong {
  display: block;
  margin-bottom: 0.25rem;
}

.saved-map-item small {
  color: #999;
  font-size: 0.8rem;
}

/* Tooltip */
.tooltip-banner {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #48bb78;
  color: white;
  padding: 1rem 1.5rem;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 1rem;
  z-index: 999;
  animation: slideDown 300ms ease;
}

.tooltip-banner button {
  background: none;
  border: none;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
```

### src/styles/theme.css
```css
:root {
  --primary: #667eea;
  --primary-dark: #5568d3;
  --success: #48bb78;
  --danger: #f56565;
  --border: #e2e8f0;
  --bg-light: #f9fafb;
  --bg-gray: #f0f0f0;
  --text-primary: #2d3748;
  --text-secondary: #718096;
}

@media (prefers-color-scheme: dark) {
  :root {
    --text-primary: #e2e8f0;
    --text-secondary: #cbd5e0;
    --bg-light: #2d3748;
    --bg-gray: #4a5568;
    --border: #4a5568;
  }
}
```

---

## Step 9: Main App Component

### src/App.tsx
```typescript
import React, { useRef, useState } from 'react';
import { useMapState } from './hooks/useMapState';
import { useGeoData } from './hooks/useGeoData';
import { useLocalStorage } from './hooks/useLocalStorage';
import { MapCanvas } from './components/MapCanvas';
import { ColorPicker } from './components/ColorPicker';
import { CountryList } from './components/CountryList';
import { Controls } from './components/Controls';
import { SaveLoad } from './components/SaveLoad';
import { Tooltip } from './components/Tooltip';
import './styles/App.css';

export default function App() {
  const { state, dispatch, canUndo, canRedo } = useMapState();
  const { features, loading, error } = useGeoData();
  const { saveMaps, loadMap } = useLocalStorage();

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (loading) {
    return (
      <div className="app-container">
        <div className="app-header">
          <h1>CountriesIRL Map Generator</h1>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p>Loading map data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container">
        <div className="app-header">
          <h1>CountriesIRL Map Generator</h1>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#f56565' }}>Error loading map: {error}</p>
        </div>
      </div>
    );
  }

  const countryIds = features.map(f => f.id);

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
            colors={state.colors}
            selectedCountry={state.selectedCountry}
            onCountryClick={(countryId) => {
              dispatch({ type: 'SELECT_COUNTRY', payload: countryId });
            }}
            onCountryHover={setHoveredCountry}
          />
        </section>

        <aside className="control-panel">
          <Controls
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={() => dispatch({ type: 'UNDO' })}
            onRedo={() => dispatch({ type: 'REDO' })}
            onReset={() => dispatch({ type: 'RESET_ALL' })}
            onSave={() => setShowSaveDialog(true)}
            svgRef={svgRef}
          />

          {state.selectedCountry && (
            <ColorPicker
              currentColor={state.colors[state.selectedCountry] || '#FFFFFF'}
              onColorChange={(color) =>
                dispatch({
                  type: 'SET_COLOR',
                  payload: {
                    countryId: state.selectedCountry!,
                    color,
                  },
                })
              }
            />
          )}

          <CountryList
            countries={countryIds}
            colors={state.colors}
            onSelectCountry={(countryId) => {
              dispatch({ type: 'SELECT_COUNTRY', payload: countryId });
            }}
          />

          {showSaveDialog && (
            <SaveLoad
              colors={state.colors}
              onSave={(name) => {
                saveMaps(name, state.colors);
                setShowSaveDialog(false);
                alert('Map saved!');
              }}
              onLoad={(name) => {
                const loaded = loadMap(name);
                if (loaded) {
                  dispatch({ type: 'LOAD_STATE', payload: loaded });
                  setShowSaveDialog(false);
                  alert('Map loaded!');
                }
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

### src/main.tsx
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/theme.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

---

## Step 10: package.json

Update to include:
```json
{
  "name": "countriesirl",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "d3": "^7.8.5",
    "html2canvas": "^1.4.1"
  },
  "devDependencies": {
    "@types/d3": "^7.4.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.2.0",
    "vite": "^5.0.0"
  }
}
```

---

## Step 11: Build & Test

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start dev server:**
   ```bash
   npm run dev
   ```

3. **Test:**
   - Click countries to color them
   - Use color picker to change colors
   - Test undo/redo (should support 50+ actions)
   - Save a map, reload page, load it back
   - Export PNG (should be 1080×1080)
   - Check console for errors

4. **Build for production:**
   ```bash
   npm run build
   ```

---

## Step 12: Deploy to Vercel

1. **Push to GitHub** (if not already done)
2. **Go to vercel.com** and sign in
3. **Click "Add New" → "Project"**
4. **Import repository**
5. **Vercel auto-detects Vite config** — just click "Deploy"
6. **Share the URL!**

---

## Quality Checklist

Before shipping:
- [ ] Map renders in <500ms
- [ ] Clicking countries selects and shows color picker
- [ ] Color changes apply instantly
- [ ] Undo/redo works for 50+ actions
- [ ] PNG export is exactly 1080×1080
- [ ] Save/load works after page reload
- [ ] No console errors
- [ ] Responsive on tablets (desktop-first)
- [ ] Tooltips guide new users
- [ ] Color picker validates hex input

---

**You're ready to build. Good luck!**
