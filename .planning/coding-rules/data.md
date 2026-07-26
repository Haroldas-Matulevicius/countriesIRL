# Coding Rules: Data (GeoJSON & Country Lookup)

**Read when touching:** GeoJSON loading, country lookup, feature validation, historical borders (Phase 2).

---

## GeoFeature Contract

Every feature in the GeoJSON must have:

```typescript
interface GeoFeature {
  type: 'Feature';
  id: string;                    // Unique country identifier
  properties: {
    name: string;                // Human-readable country name
    [key: string]: any;           // Other properties (optional)
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: any;             // GeoJSON coordinates
  };
}
```

**`id` must be present and unique.** Used as the key for color assignments and D3 data joins.

**`properties.name` must be a non-empty string.** Used for display tooltips and country list.

**If a feature is missing `id` or `name`, skip it with a warning.** Don't crash; create a fallback.

```typescript
// ✅ Good — handle missing id/name
const withIds = europeFeatures.map((f, idx) => {
  if (!f.id || !f.properties.name) {
    console.warn(`Feature ${idx} missing id or name, skipping`);
    return null;
  }
  return {
    ...f,
    id: f.id,
  };
}).filter(Boolean);

// ❌ Bad — assumes all features are valid
const withIds = europeFeatures.map(f => ({
  ...f,
  id: f.id || f.properties.name,  // Crashes if both missing
}));
```

---

## GeoJSON Loading & Filtering

**Load once, cache in state.** useGeoData hook fetches `/data/europe-modern.geojson` on mount and caches the result.

**Filter to Europe for Phase 1.** Natural Earth 10m global dataset is ~500KB; filter to ~30 European countries to keep the bundle small.

```typescript
// ✅ Good — filter to known European countries
const EUROPE_COUNTRIES = new Set([
  'Portugal', 'Spain', 'France', 'Germany', 'Poland', 'Italy', 'Greece',
  'Sweden', 'Norway', 'Denmark', 'Finland', 'Ireland', 'United Kingdom',
  // ... more countries
]);

const europeFeatures = data.features.filter(f =>
  EUROPE_COUNTRIES.has(f.properties.name)
);
```

**Normalize country names.** Strip leading/trailing whitespace; match against a canonical list.

```typescript
const canonicalName = f.properties.name.trim();
if (!EUROPE_COUNTRIES.has(canonicalName)) {
  console.warn(`Unknown country: ${canonicalName}`);
}
```

**Validate geometry.** Check that coordinates exist and are valid.

```typescript
// ✅ Good
if (!f.geometry || !Array.isArray(f.geometry.coordinates)) {
  console.warn(`Feature ${f.id} has invalid geometry, skipping`);
  return null;
}
```

---

## Country Lookup

**Build a lookup map on load.** useGeoData should return both `features` and `lookup`.

```typescript
type CountryLookup = Map<string, GeoFeature>;

function useGeoData() {
  const [features, setFeatures] = useState<GeoFeature[]>([]);

  useEffect(() => {
    fetch('/data/europe-modern.geojson')
      .then(r => r.json())
      .then(data => {
        const filtered = data.features.filter(/* ... */);
        setFeatures(filtered);
      });
  }, []);

  const lookup = useMemo(() => {
    const map = new Map<string, GeoFeature>();
    features.forEach(f => map.set(f.id, f));
    return map;
  }, [features]);

  return { features, lookup };
}
```

**Use the lookup for O(1) country access.** Don't `.find()` on the features array repeatedly.

```typescript
// ✅ Good
const countryName = lookup.get(countryId)?.properties.name ?? 'Unknown';

// ❌ Bad — O(n) on every lookup
const country = features.find(f => f.id === countryId);
const countryName = country?.properties.name ?? 'Unknown';
```

---

## Color State ↔ Country Mapping

**Color state is keyed by country `id`.** MapState stores `{ [countryId]: colorHex }`.

```typescript
interface MapState {
  colors: Record<string, string>;  // { 'FR': '#FF0000', 'DE': '#00FF00', ... }
  // ...
}
```

**Always validate that a country exists before assigning a color.** MapCanvas shouldn't try to color a country that isn't in the GeoJSON.

```typescript
// ✅ Good — dispatch validates the countryId
const handleCountryClick = (countryId: string) => {
  if (lookup.has(countryId)) {
    dispatch({ type: 'SELECT_COUNTRY', payload: countryId });
  } else {
    console.warn(`Country ${countryId} not found in lookup`);
  }
};

// ❌ Bad — assumes countryId is valid
dispatch({ type: 'SELECT_COUNTRY', payload: countryId });
```

---

## Historical Borders (Phase 2+)

**Future contract:** Each time period will have its own GeoJSON file.

- `europe-1400.geojson`
- `europe-1700.geojson`
- `europe-1800.geojson`
- `europe-modern.geojson` (current)

**Structure:** Same as modern GeoJSON — `id` must match a canonical country ID (e.g., 'LT' for Lithuania), but the geometry changes per period.

**Validate period coverage.** Not every country exists in every period. If a country isn't in the chosen period, mark it as "no data" in the UI.

```typescript
// Phase 2: useGeoData accepts a timePeriod parameter
function useGeoData(timePeriod: string) {
  const [features, setFeatures] = useState<GeoFeature[]>([]);

  useEffect(() => {
    fetch(`/data/europe-${timePeriod}.geojson`)
      .then(r => r.json())
      .then(setFeatures);
  }, [timePeriod]);

  return features;
}
```

**Preserve color assignments across period changes.** If the user colored Lithuania red, and then switches from 1700 to 1800, Lithuania should still be red (if it exists in 1800).

---

## Error Handling

**On fetch failure:** Show a user-friendly error, don't crash.

```typescript
// ✅ Good
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  fetch('/data/europe-modern.geojson')
    .then(r => r.json())
    .catch(err => {
      console.error('Failed to load GeoJSON:', err);
      setError('Could not load map data. Please refresh the page.');
    });
}, []);

// In render:
if (error) return <div className="error">{error}</div>;
```

**On validation failure:** Log and skip bad features, don't stop the whole load.

```typescript
// ✅ Good — silently skip 1 bad feature, load the rest
const features = geoData.features
  .filter(f => {
    if (!f.id || !f.properties.name) {
      console.warn(`Skipping feature with missing id/name`);
      return false;
    }
    if (!f.geometry?.coordinates) {
      console.warn(`Skipping feature ${f.id} with invalid geometry`);
      return false;
    }
    return true;
  })
  .map((f, idx) => ({
    ...f,
    id: f.id || `country-${idx}`,  // Fallback (shouldn't reach here after filter)
  }));
```

---

## File Paths

**GeoJSON lives in `public/data/`.** Vercel/Vite serve it as a static asset.

- `public/data/europe-modern.geojson` — Phase 1 (modern borders)
- `public/data/europe-1400.geojson` — Phase 2
- `public/data/europe-1700.geojson` — Phase 2
- etc.

**Fetch relative paths.** `fetch('/data/europe-modern.geojson')` works both locally and on production (Vercel handles the routing).

---

## Performance

**Download size matters.** Natural Earth 10m is ~500KB gzipped for global. Europe-only is ~50KB gzipped.

**Don't lazy-load GeoJSON.** Fetch it on app mount (before any user interaction). Users can't color countries without the data.

**Memoize the lookup map.** useMemo so MapCanvas doesn't rebuild it on every render.

```typescript
const lookup = useMemo(() => {
  const map = new Map();
  features.forEach(f => map.set(f.id, f));
  return map;
}, [features]);  // Only recompute if features array changes
```

---

## Testing

**Manual validation:**
- [ ] Load the app; GeoJSON fetches and renders without errors
- [ ] All 30 European countries appear on the map
- [ ] Hover over a country; tooltip shows its name
- [ ] Click a country; it selects (no error in console)
- [ ] Color the country; color updates instantly
- [ ] Check console for no "Skipping" warnings (data quality OK)

**Edge cases:**
- [ ] Missing properties.name — should skip with warning
- [ ] Duplicate id — should overwrite (last one wins)
- [ ] Invalid geometry — should skip with warning

---

## Filesystem identity

**Always pass `{ bigint: true }` to `fs.stat` when the result feeds a file-identity key.**

A `dev:ino` pair read as a JS Number is lossy on Windows. The NTFS file ID is
`(sequenceNumber << 48) | mftRecordNumber`; past 2^53 the low bits round away, so two
**distinct** files can produce the same `dev:ino` and be reported as a false hard-link alias.
Temp-directory churn recycles MFT records and drives the sequence number up, so this fails in
**bursts and then goes quiet** — it reads as a flaky test and is not one.

Measured on this repo: 6020/6400 lossy stats, 191/800 false collisions as Number, 0/800 as
BigInt. `String(bigintValue)` stringifies exactly, so downstream key construction is unchanged.

The precision fix **strengthens** alias detection — rounding could equally mask a real alias by
colliding two keys with the wrong partner. Never "fix" a collision assertion by loosening it.

Applies to: `scripts/prepareHistoricalSnapshot.mjs` (`identityKey`, consumed by
`assertNoPathKeyCollisions`).

---

*Last updated: 2026-07-25 — added the filesystem-identity rule after a Windows inode-precision
defect surfaced as an intermittent test failure. Prior: 2026-07-21 — initial Phase 1 data rules.
Full edit history: `git log -p -- .planning/coding-rules/data.md`.*
