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
