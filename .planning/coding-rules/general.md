# Coding Rules: General

**Read this first.** Applies everywhere in Phase 1.

---

## TypeScript Discipline

**Strict mode always.** `tsconfig.json` must have `"strict": true`.

**No `any`** — ever. Use `unknown` if truly polymorphic, then narrow with type guards. If you're about to write `any`, you're missing a type definition.

**Type all function signatures.** Include return types even on trivial functions.

```typescript
// ✅ Good
function isValidHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

// ❌ Bad
function isValidHex(hex) {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}
```

**Discriminated unions over boolean flags.** For multi-state logic, use union types so the compiler enforces correctness.

```typescript
// ✅ Good
type MapState =
  | { status: 'loading' }
  | { status: 'loaded'; features: GeoFeature[] }
  | { status: 'error'; message: string };

// ❌ Bad
interface MapState {
  loading?: boolean;
  error?: boolean;
  features?: GeoFeature[];
  message?: string;
}
```

---

## Naming Conventions

**Components:** PascalCase (e.g., `MapCanvas`, `ColorPicker`).

**Hooks:** camelCase, prefix with `use` (e.g., `useMapState`, `useGeoData`).

**Utilities/functions:** camelCase (e.g., `exportMapPng`, `isValidHex`).

**Constants:** SCREAMING_SNAKE_CASE (e.g., `MAX_MAPS`, `STORAGE_KEY`).

**Types/interfaces:** PascalCase (e.g., `GeoFeature`, `MapState`).

**File names:** Match export name (component file = PascalCase, utility file = camelCase).

**Booleans/predicates:** Prefix with `is`, `can`, `has`, `should` (e.g., `isValidHex`, `canUndo`).

---

## Imports & Module Structure

**Group imports by category.** React/libs → internal types → internal components → internal utils → styles.

```typescript
// ✅ Good import order
import React, { useRef } from 'react';
import * as d3 from 'd3';
import { GeoFeature, MapState } from '../types/map';
import { MapCanvas } from './MapCanvas';
import { useMapState } from '../hooks/useMapState';
import { exportMapPng } from '../utils/export';
import '../styles/App.css';

// ❌ Bad (scattered)
import { MapCanvas } from './MapCanvas';
import React from 'react';
import '../styles/App.css';
import { exportMapPng } from '../utils/export';
```

**No wildcard imports** (`import *`) except for `d3` and `react` (standard libs where it's idiomatic).

**Use explicit re-exports in index files** if building a mini-library (e.g., `src/hooks/index.ts` re-exports all hooks).

---

## Comments

**Default: no comments.** Code should be self-documenting via clear naming.

**Only comment the WHY when non-obvious.** Document hidden invariants, workarounds, or design constraints.

```typescript
// ✅ Good — explains WHY, not WHAT
// D3's geoMercator sometimes renders path elements with invalid d attributes
// if a feature geometry is self-intersecting; we sanitize features on load.
const withIds = europeFeatures.map((f, idx) => ({
  ...f,
  id: f.id || f.properties.name || `country-${idx}`,
}));

// ❌ Bad — restates what the code already says
// Loop through features
features.forEach((f) => {
  // Set id
  f.id = f.id || f.properties.name;
});
```

**No JSDoc** (unless public API surface, which Phase 1 doesn't have yet).

---

## Testing Expectations

**Unit tests for utilities.** Functions in `src/utils/` should have `*.test.ts` files covering:
- Happy path
- Edge cases (empty input, invalid input, boundary values)
- Error conditions

**Component tests via Storybook or manual.** For Phase 1, manual testing is acceptable:
- Click countries, verify selection
- Color changes apply instantly
- Undo/redo work after N actions
- PNG export is 1080×1080

**No snapshot tests** for visual components (SVG diffs are too noisy).

**E2E via manual user flows** for Phase 1 (Playwright can be added in Phase 3 if needed).

---

## Performance Constraints

**Render map in <500ms.** D3 projection + SVG path generation should complete before user sees lag.

**Color updates instantly** — no re-render delays. Use React.memo on MapCanvas if needed.

**PNG export in <3 seconds** — html2canvas timeout should never fire.

**Undo/redo instant.** Reducer dispatch → state update → re-render all within <100ms.

**No unnecessary re-renders.** useCallback on event handlers; keys stable in lists.

---

## Forbidden Patterns

❌ **No raw SDK imports.** All Supabase/external-service calls go through utility wrappers (not Phase 1 concern yet, but rule for when Phase 2 adds backend).

❌ **No magic numbers.** Use named constants (e.g., `MAX_MAPS`, `EXPORT_WIDTH`).

❌ **No console.log in production code.** Use proper logging (placeholder for Phase 2).

❌ **No empty catch blocks.** Always handle or re-throw with context.

```typescript
// ❌ Bad
try {
  fetchGeoData();
} catch (e) {}

// ✅ Good
try {
  fetchGeoData();
} catch (error) {
  console.error('Failed to load map data:', error);
  setError('Could not load map. Try refreshing.');
}
```

❌ **No hardcoded strings.** Use constants (e.g., `STORAGE_KEY = 'countriesirl_maps'`).

❌ **No circular dependencies.** Refactor shared concerns into a third module.

❌ **No `eval()` or dynamic `require()`.**

---

## Error Handling

**Validate at boundaries.** Browser input (file uploads, user text) always validate. Internal function outputs: trust.

**Return success/error explicitly.** Avoid implicit null/undefined for failure.

```typescript
// ✅ Good
type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function loadMapConfig(name: string): Result<Record<string, string>> {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return { ok: false, error: 'No saved maps found' };
  // ...
}

// ❌ Bad (caller has to check for null)
function loadMapConfig(name: string): Record<string, string> | null {
  // ...
}
```

**User-facing errors → toast/alert.** Never silently fail.

```typescript
try {
  await exportMapPng(svgRef.current, filename);
  alert('Map exported!');
} catch (error) {
  alert('Export failed. See console for details.');
  console.error(error);
}
```

---

## Code Style

**Use `const` by default**, `let` if reassigned, never `var`.

**No trailing whitespace.** ESLint should catch this.

**Indentation: 2 spaces.** (Vite default.)

**Line length: 100 characters preferred**, 120 max. No hard rule for Phase 1, but keep readable.

**Quote style: single quotes for strings** (`'hello'`), double quotes for JSX attributes (`<div className="...">`).

**Semicolons: required** everywhere.

**Trailing commas in objects/arrays** (only commas inside multi-line, not on closing paren).

```typescript
// ✅ Good
const obj = {
  key1: 'value1',
  key2: 'value2',
};

// ❌ Bad
const obj = {
  key1: 'value1',
  key2: 'value2'
}
```

---

## Git & Commits

**Atomic commits.** One logical change per commit (e.g., "add ColorPicker component" not "WIP stuff").

**Commit message format:** `<type>(<scope>): <subject>` (Conventional Commits).

- **Type:** `feat`, `fix`, `refactor`, `test`, `docs`, `chore`
- **Scope:** Phase number + feature (e.g., `1-color-picker`)
- **Subject:** Imperative mood, ≤75 chars, no period

```
feat(1-map): render Europe with D3 geoMercator projection
fix(1-export): ensure PNG export is exactly 1080x1080
refactor(1-state): centralize color history in useMapState
test(1-storage): validate localStorage save/load roundtrip
docs(1): add coding-rules/frontend.md
```

**No merge commits to main** (use squash or rebase). Phase 1 is single developer, so prefer squash for clean history.

---

## Accessibility (Phase 1 MVP)

**Basic WCAG compliance.**

- Buttons must have visible labels or `aria-label`
- Images/SVG regions need `alt` or `title`
- Keyboard navigation supported (tab through countries, arrow keys to select)
- Color not sole information source (add labels, icons, or patterns)

**No `<div onClick>` — use `<button>`.** Screen readers need semantic HTML.

---

## Browser Compatibility

**Phase 1 targets:** Chrome, Firefox, Safari, Edge (last 2 versions).

**No IE11 support.**

**Use `fetch` (not Axios).** Modern browsers have it built-in.

**LocalStorage is guaranteed.** Don't feature-detect; it's available in all target browsers.

---

*Last updated: 2026-07-21 — initial Phase 1 general rules. Full edit history: `git log -p -- .planning/coding-rules/general.md`.*
