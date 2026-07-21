# Deferred Items

- **Plan 01-06 verification:** `node scripts/prepareGeoData.mjs --check` reports that `public/data/europe-modern.geojson` differs from the deterministic output. Plan 01-06 did not modify the data asset or preparation script, and its required lint/TypeScript checks plus the full 79-test suite pass. Reconcile the pre-existing asset/check mismatch in the owning data plan before the Phase 1 final gate.
