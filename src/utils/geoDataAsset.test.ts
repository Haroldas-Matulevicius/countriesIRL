import { describe, expect, it } from 'vitest';

import repositoryAttributes from '../../.gitattributes?raw';

const GEOJSON_ATTRIBUTE = 'public/data/europe-modern.geojson text eol=lf';

describe('deterministic GeoJSON asset', (): void => {
  it('keeps canonical LF bytes across Git checkouts', (): void => {
    expect(repositoryAttributes.split(/\r?\n/u)).toContain(GEOJSON_ATTRIBUTE);
  });
});
