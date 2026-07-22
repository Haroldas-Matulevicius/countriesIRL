const BLOCKED_COUNTRY_IDS = new Set([
  '-99',
  '99',
  'N/A',
  'NA',
  'NULL',
  'UNKNOWN',
  'UNRESOLVED',
  '__PROTO__',
  'CONSTRUCTOR',
  'PROTOTYPE',
]);

export function isSafeStableCountryId(countryId: string): boolean {
  return (
    countryId.length > 0 &&
    countryId === countryId.trim() &&
    !BLOCKED_COUNTRY_IDS.has(countryId.toUpperCase())
  );
}

export function normalizeStableCountryId(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const countryId = value.trim();
  return isSafeStableCountryId(countryId) ? countryId : null;
}
