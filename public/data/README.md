# Modern Europe boundary data

`europe-modern.geojson` is the browser-local modern boundary asset for CountriesIRL Phase 1. The application serves this committed file from the same origin and does not request Natural Earth or any other map API at runtime.

## Source and version

- Dataset: Natural Earth **1:10m Admin 0 – Countries**
- Natural Earth version: **5.1.1**
- Source repository: <https://github.com/nvkelso/natural-earth-vector>
- Versioned GeoJSON: <https://github.com/nvkelso/natural-earth-vector/blob/v5.1.1/geojson/ne_10m_admin_0_countries.geojson>
- Raw source used by the script: <https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.1/geojson/ne_10m_admin_0_countries.geojson>
- Approved source SHA-256: `239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255`
- Terms: Natural Earth data is in the public domain. Attribution is not required, but “Made with Natural Earth” is permitted. See <https://www.naturalearthdata.com/about/terms-of-use/>.

## Geopolitical point of view

This asset uses Natural Earth 5.1.1's standard/default `ne_10m_admin_0_countries` geopolitical point of view. It does not substitute an alternate boundary or breakaway-country POV. Phase 1 presentation acceptance must review this choice before deployment.

## Inclusion policy

The preparation script includes every upstream Admin 0 feature whose `CONTINENT` is `Europe`. This intentionally preserves small European map units and dependencies represented by Natural Earth, including Åland, the Faroe Islands, Gibraltar, Guernsey, the Isle of Man, and Jersey.

It also includes the explicitly documented Europe/transregional set whose upstream `ADMIN` value is Armenia, Azerbaijan, Cyprus, Georgia, Kazakhstan, or Turkey. Russia is included by Natural Earth's own `CONTINENT: Europe` classification. No geometry is clipped, so transcontinental countries retain their complete Natural Earth feature geometry; the later map renderer owns the fixed Europe viewport.

The current transformation produces 57 features.

## Normalization contract

For each included feature, `scripts/prepareGeoData.mjs`:

1. Selects the first non-sentinel stable administrative code in this order: `ADM0_A3`, `GU_A3`, `ISO_A3`, `SOV_A3`.
2. Rejects missing, placeholder (`-99`, `99`, `N/A`, `NA`, `NULL`, `UNKNOWN`, `UNRESOLVED`), or duplicate normalized IDs.
3. Selects the first trimmed display name in this order: `NAME_LONG`, `ADMIN`, `NAME`.
4. Accepts only valid `Polygon` or `MultiPolygon` coordinates.
5. Rebuilds each feature with only `type`, `id`, `properties.name`, and `geometry`.
6. Sorts features by normalized ID and writes compact JSON with one trailing line feed.

The script also verifies the exact approved upstream SHA-256 before processing, so a moved tag or changed download fails instead of silently changing the committed map.

## Regeneration and verification

From the repository root:

```bash
node scripts/prepareGeoData.mjs
node scripts/prepareGeoData.mjs --check
```

`--check` regenerates canonical bytes in memory and exits non-zero if the committed asset differs. It does not rewrite the asset.

To use a previously downloaded copy of the exact approved source:

```bash
node scripts/prepareGeoData.mjs --source path/to/ne_10m_admin_0_countries.geojson
node scripts/prepareGeoData.mjs --source path/to/ne_10m_admin_0_countries.geojson --check
```

The local source must match the approved SHA-256 above.

# Modern world boundary data

`world-modern.geojson` is the browser-local modern world asset for CountriesIRL Phase 2. It combines the complete Natural Earth 1:50m Admin 0 Countries layer with six reviewed 1:10m supplements. The application serves the committed output from the same origin and makes no Natural Earth or other third-party request at runtime.

## Source composition and provenance

- Dataset: Natural Earth **Admin 0 – Countries**
- Natural Earth version: **5.1.1**
- License: **public domain**; see <https://www.naturalearthdata.com/about/terms-of-use/>
- Base source: **1:50m** `ne_50m_admin_0_countries.geojson`
- Base URL: <https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.1/geojson/ne_50m_admin_0_countries.geojson>
- Approved base SHA-256: `3e458fc036ad0a66411f2c1e6cac49c5d7bfb81cb1123bc513b22511a2b7fdeb`
- Supplement source: **1:10m** `ne_10m_admin_0_countries.geojson`
- Supplement URL: <https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.1/geojson/ne_10m_admin_0_countries.geojson>
- Approved supplement SHA-256: `239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255`
- Reviewed 1:10m supplements: `ESB`, `WSB`, `UMI`, `CSI`, `CLP`, and `GIB`
- Generated asset SHA-256: `45ccfed198f2d3ba4cbeb1d1b06889b0ba6869ee944feff32a5355b94cf0827a`
- Reviewed manifest SHA-256: `57313d11df49285e348b3fb67179aedd7d01f227426729eb0107c4f18fb51fe4`

The generated asset contains exactly **248 geographic units**: all 242 units from the 1:50m layer plus the six reviewed 1:10m supplements. Exactly **195 core states** are selectable and colorable. The core is the 193 UN member states plus the Holy See and State of Palestine. Dependencies, associated units, disputed units, indeterminate units, and supplements are not counted as core states.

## Geopolitical and color policy

The world asset uses Natural Earth 5.1.1's standard/default de facto Admin 0 point of view. CountriesIRL does not add a political-claim perspective switch or infer political identity from display names.

`world-manifest.json` records every core source join and every non-core color policy. Clear reviewed dependencies inherit the color of an explicit `parentCoreId`. Disputed, indeterminate, and ambiguous associated units—including Cook Islands, Niue, and Gibraltar—remain visible, neutral, and non-selectable with `parentCoreId: null`. Small island states retain their source geometry at true scale; later runtime search and Locate controls provide access without artificial markers or inset geometry.

## Deterministic generation and verification

From the repository root:

```bash
node scripts/prepareWorldData.mjs
npm run data:world:check
```

The generator verifies both approved source SHA-256 values, validates Polygon/MultiPolygon geometry and finite coordinates, applies only reviewed manifest joins and parent/neutral policy, sorts all units by logical ID, and writes compact JSON with one trailing line feed. `data:world:check` regenerates canonical bytes in memory and exits non-zero for a source checksum mismatch or committed-byte drift without rewriting the asset.

Previously downloaded approved sources can be supplied without changing the output:

```bash
node scripts/prepareWorldData.mjs \
  --base-source path/to/ne_50m_admin_0_countries.geojson \
  --supplement-source path/to/ne_10m_admin_0_countries.geojson
```

Both local files must match the approved hashes. Upstream URLs are build-time provenance only. The committed manifest and GeoJSON are the complete browser boundary, so normal map rendering remains offline-ready after the application assets are available from the same origin.

Historical snapshot assets are governed by separate provenance and review gates. This modern-world documentation does not claim that disputed units are core states or that any historical snapshot is complete or approved.
