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

> **Superseded in Phase 2 by the world asset — see "World Asset and Snapshot Catalog" below.**
> `useGeoData` now loads `/data/world-modern.geojson` and there is no Europe filter. The Phase 1
> text is kept because Phase 1 release evidence cites it.

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

## World Asset and Snapshot Catalog (Phase 2)

**This section replaces the Phase 1 "Historical Borders (Phase 2+)" sketch**, which named
`europe-1400.geojson` / `europe-1700.geojson` / `europe-1800.geojson` and a
`useGeoData(timePeriod)` signature. None of those exist. Do not build against them.

**One bundled world asset, same-origin, no runtime third-party fetch.**

- `public/data/world-modern.geojson` — the modern world geometry
- `public/data/world-manifest.json` — its provenance and integrity record
- `public/data/snapshots/index.json` — the snapshot catalog

**Periods come from the catalog, never from a filename convention.** A period is an entry in
`SNAPSHOT_CATALOG` (`src/constants/snapshots.ts`) whose `assetPath` and `sha256` are verified.
Do not derive an asset URL by interpolating a year into a template — an unapproved id would
then be one string concatenation away from reaching the network.

**A snapshot that is not in the approved catalog is structurally unreachable, not merely
hidden.** As of 2026-07-25 the catalog holds exactly one entry, `Modern`. The 1492/1700/1815/
1914 packets are **deferred for missing archival source material** — not pending a signature.
`resolvePeriodOptions` decides reachability; listing an id anywhere else (a manifest, a saved
record, an announcement allowlist) does not make it reachable and must never be treated as
approval.

**Approval is evidence, never inference.** Geometry reaches `public/data` only with a durable
chain: an identified rights-cleared source, a recorded licence, a content hash that matches the
catalog, and independent factual and topology review. Specifically:

- **Executor self-approval is forbidden** for source/licence and factual review. The author of a
  packet cannot be its reviewer.
- **A manually traced boundary carries its own record** — operator, source scan and edition,
  control points, and the georeferencing method — or it is not usable. "Traced from an atlas" with
  no control points is not a provenance record.
- **A BLOCKED packet is not a delivered snapshot** and is never counted as one.
- **The six historical region IDs are never silently merged.** They stay distinct through
  curation, validation, and approval, even when their geometry is absent.

**Effective entities, not raw features.** A scene's selectable set is the *effective* entity list
for the active snapshot — the entities that scene actually contains — and selection/colour can
never reach a country outside it. Out-of-scene rows in `CountryList` and Locate are **disabled,
never removed**: the modern 195-core catalog stays whole so the creator sees a stable list.

**Colour survives a period change; selection is reconciled in the same write.** History is
colours-only. `commitScene` reconciles the selection against the new scene in the same write as
the snapshot switch — putting selection into a history snapshot would let undo resurrect a
country the active scene does not contain.

**Failure retains the prior scene.** A snapshot that fails validation, hash check, or fetch
leaves the previous scene on screen; it never blanks the map.

### The approved-id filter on the saved-map row resolver (OPEN ITEM 4, decided in 03-07)

**The fact, verified in the UI-SPEC:** `storage.ts` builds `SNAPSHOT_IDS` from **all five**
`SNAPSHOT_CATALOG` entries and its record validator admits any id in that set, so a hand-crafted
`localStorage` record carrying `"snapshotId": "1914"` validates. This is **pre-existing Phase 2
behaviour, not a Phase 3 regression**, and reaching it requires hand-editing browser storage — a
weak, local exposure, not a path by which a deferred snapshot becomes *reachable*.

**The decision:** `getPeriodShortLabel` in `SaveLoad.tsx` resolves through the ids the **approved
manifest** actually yields — the same source `resolvePeriodOptions` reads, handed down from
`useSnapshotCatalog` — and returns `null` otherwise, so the row renders **no period label**. The
label text itself still comes only from the approved catalog registry, never from manifest text
(T-02-40). This is a presentation-layer change of a few lines that makes the original claim
(*"a stored record can never name a deferred period"*) **true** rather than merely narrower, and
it is RED-proven by planting a `1914` record in the e2e context.

**The storage validator is deliberately NOT changed.** Filtering `SNAPSHOT_IDS` there would alter
which stored records are *admitted* — a data-layer behaviour change outside a chrome phase's
scope. If a later phase revisits it, that is its own decision with its own evidence. A V2 record
with an unapproved period is also **not relabelled as a legacy map**: it will not "open with
modern borders" (loading it refuses with the period-unavailable message), so the row keeps its
real metadata and simply omits the period token.

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

**GeoJSON lives in `public/data/`.** Vite serves it as a static asset.

- `public/data/world-modern.geojson` — the Phase 2 world geometry
- `public/data/world-manifest.json` — provenance and integrity
- `public/data/snapshots/index.json` — the approved snapshot catalog
- `public/data/europe-modern.geojson` — Phase 1 (modern European borders), retained

There is no `europe-1400.geojson` / `europe-1700.geojson` / `europe-1800.geojson`. The Phase 1
draft listed them; the approved chain writes into `public/data/snapshots/` instead, and only
after the approval evidence above exists.

**Fetch same-origin absolute paths.** `fetch('/data/world-modern.geojson')`. Phase 2 is
browser-only and localhost-only — no deployment target, no backend, and no runtime request to a
third-party origin.

**Binary assets the *bundle* carries live in `src/assets/`, not `public/data/`.** The two homes
are not interchangeable — see § Vendored binary assets.

### The base path has one home, and two predicates are deliberately not in it

`src/config/editorConfig.ts` is the **single production home** for the data asset base path.
`useGeoData.ts`, `constants/snapshots.ts`, and `useSnapshotCatalog.ts` derive their URLs from it;
none of them holds a path literal. The base path arrives through `MapEditor`'s props boundary with
the standalone app's value as its default, so a future host can serve the same bundled assets from
its own directory without editing a fetch site. `src/config/editorConfig.test.ts` enforces this by
scanning every non-test file under `src/`.

**Two literals are exempt, and the exemption is the important part of the rule.**
`src/utils/historicalValidation.ts` holds them — at the time of writing, line 1098
(`!input.assetPath.startsWith('/data/')`) and line 1190
(`entry.assetPath.startsWith('/data/snapshots/')`).

They are **safety predicates on manifest-declared asset paths, not fetch URLs.** Parameterising
them alongside the fetch paths would let a host-configured base path widen what counts as an
acceptable asset path — a loosening of the approval chain wearing a refactor's clothes. A manifest
that could nominate any base would be a manifest that decides its own reviewed boundary.

**The condition under which they would have to change.** If the base path ever becomes genuinely
host-configurable *for approved historical geometry* — which it is not today, because the approved
catalog holds exactly `Modern` — the predicate must validate against the **configured** base, resolved
once at the mount boundary and passed in as a value. It must never become a wildcard, an
`endsWith`, or a check that any non-empty prefix satisfies. Widening it is a change to the approval
chain and needs the approval chain's evidence, not a code review.

The gate's exemption set is **closed** and keyed on the predicate's own source text, with the line
numbers carried alongside for a reader. Text, not line number, because a line number drifts the
moment anything above it moves and a gate that is red on arrival gets loosened rather than obeyed.
A third match anywhere fails.

---

## Vendored binary assets (`src/assets/`)

There are now **two** homes for a bundled, same-origin, hash-recorded asset, and they are chosen by
who reads the bytes, not by taste:

| Home | Read by | Integrity record | Checked by |
|---|---|---|---|
| `public/data/` | the app at runtime, via `fetch` | `world-manifest.json` / `snapshots/index.json` | `npm run data:world:check` |
| `src/assets/` | the **bundler**, via `import` | `src/assets/README.md` | `shasum -a 256` against the README row |

`public/data/` is for geometry the app fetches. `src/assets/` is for bytes Vite must inline or emit
— today that is `inter-latin-variable.woff2` (D-09), which `03-11` base64-inlines so the typeface
reaches the `data:image/svg+xml` export clone. A file under `src/assets/` cannot be fetched by
path, and a file under `public/data/` cannot be `?inline`d; putting one in the other's home
silently breaks the consumer.

**Every vendored binary carries a row in `src/assets/README.md`** giving source URL, subset or
variant, byte size, SHA-256, and licence. That is the same discipline `world-manifest.json` applies
to the world asset, and the reason is stronger here: these bytes end up inside every exported PNG,
so they are creator-visible output, not just input.

**Never satisfy a font or icon with a network request.** No Google Fonts `@import`, no CDN `<link>`,
no `@import url(http…)` in any stylesheet or in `index.html`. Vendor the bytes instead. This is the
same forbidden pattern as the geometry rule above, and it is the one most likely to arrive by
accident — a design system copied from a host project usually brings its font `@import` with it.

**A subset is a decision with a price, so record both.** `inter-latin-variable.woff2` is latin-only;
latin-ext (`U+0100-024F`) falls back mid-string in the exported PNG. The gap, the affected
languages, and the measured cost of closing it are written down in `src/assets/README.md` rather
than left for someone to rediscover from a rendering bug.

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

*Last updated: 2026-08-06 — § World Asset and Snapshot Catalog gained the approved-id filter on
the saved-map row resolver (OPEN ITEM 4): `getPeriodShortLabel` resolves through the ids the
approved manifest yields and returns `null` otherwise, the storage validator is deliberately
unchanged, an unapproved V2 record is not relabelled as legacy, and the filter is RED-proven with
a planted `1914` record (plan 03-07).*
*Last updated: 2026-08-06 + earlier, condensed — § File Paths gained the single base-path home in
`src/config/editorConfig.ts` with the two `historicalValidation.ts` safety predicates exempted by
source text and the condition under which they would change (plan 03-05); § Vendored binary
assets: `src/assets/` vs `public/data/`, the README-row integrity record, the no-network-font
rule, and recording a subset's coverage gap with its price (plan 03-01). 2026-07-26: the world
asset and approved snapshot catalog replaced the Phase 1 sketch (plan 02-25); 2026-07-25: the
filesystem-identity rule after a Windows inode-precision defect.*

*Full edit history: `git log -p -- .planning/coding-rules/data.md`.*
