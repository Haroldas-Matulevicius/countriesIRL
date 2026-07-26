# Coding Rules: General

**Read this first.** Applies everywhere.

**Phase 1 text is retained; Phase 2 corrections are marked inline and win where they conflict.**
Several Phase 1 statements below turned out to be false once the code existed — most importantly
"LocalStorage is guaranteed" and "E2E via manual user flows". They are struck through or annotated
rather than deleted, because Phase 1 release evidence cites this file.

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

**No snapshot tests** for visual components (SVG diffs are too noisy).

### Phase 2: automated testing ships (supersedes the manual-only guidance above)

Storybook was never added, and Playwright did not wait for Phase 3. Both tiers exist now:

| Tier | Runner | Command | Notes |
|---|---|---|---|
| Unit / component | Vitest on the **`node`** environment | `npm test` | No DOM. Component-shaped code is tested through `renderToStaticMarkup` plus pure factories. |
| Browser E2E | Playwright | `npm run test:e2e` | `tests/e2e/`; shared fixtures in `tests/e2e/support/`. |

**Vitest runs on `node`, and that shapes the code.** A hook that needs a DOM or a renderer to be
tested is the wrong shape — split the rules into a pure factory and keep React state in a thin
wrapper. If a behavior genuinely needs effects, refs, or real input, it belongs in the Playwright
suite, not in a heavier unit environment.

**A gate must be able to fail on the bug it covers.** Before landing an assertion, break the
thing it protects and watch it go red. This phase shipped three tests that could not fail:

- a performance gate that compared a value to itself;
- a legend-placement assertion inside a fixture that re-implemented the wiring under test;
- a pixel probe that asserted only cross-context *equality*, which three identical blank
  canvases satisfy perfectly.

All three read as proof. A test that cannot fail on its own subject is worse than no test,
because it stops anyone from looking. The corollary: **a fixture that re-implements the
composition root's wiring can only make claims about the fixture** — keep one real-app
counterpart for every structural contract `App` owns.

**Manual verification still has a job, but a narrow one:** physical claims automation cannot
make — touch targets, screen-reader output, and visual judgement. Do not substitute an automated
result for one of those, and do not accept a manual checklist where a gate would do.

---

## Performance Constraints

**Render map in <500ms.** D3 projection + SVG path generation should complete before user sees lag.

**Color updates instantly** — no re-render delays. Use React.memo on MapCanvas if needed.

**PNG export in <3 seconds** — html2canvas timeout should never fire.

**Undo/redo instant.** Reducer dispatch → state update → re-render all within <100ms.

**No unnecessary re-renders.** useCallback on event handlers; keys stable in lists.

---

## Forbidden Patterns

❌ **No backend, and therefore no external-service SDK.** Phase 2 is browser-only and
localhost-only: no deployment target, no server, no auth, no cloud, no environment secrets. The
Phase 1 note anticipated "when Phase 2 adds backend" — Phase 2 did not, and adding one is an
architectural decision, not an implementation detail. If a future phase does add a service, its
calls go through utility wrappers rather than raw SDK imports.

❌ **No runtime third-party network request.** Map data is bundled same-origin under
`public/data/` and integrity-checked. A request to another origin at runtime is a defect, not an
optimization.

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

**User-facing errors → toast.** Never silently fail.

```typescript
try {
  await exportMapPng(svgRef.current, filename);
  alert('Map exported!');
} catch (error) {
  alert('Export failed. See console for details.');
  console.error(error);
}
```

**Superseded in Phase 2 — the shape above is wrong twice over.**

1. **`alert()` is not the reporting channel.** Everything creator-facing goes through
   `ToastRegion`, which is a *boundary*: a message is rendered only if it matches an exact
   approved string or a bounded dynamic pattern, and anything else degrades to a severity
   fallback. That is what keeps hashes, file paths, schema versions, and DOM exception names off
   a creator's screen even if a future call site passes one straight through. "See console for
   details" is not an instruction a creator can act on.
2. **Never tell the user to refresh the page.** The composition lives only in browser memory, so
   a refresh destroys every unsaved colour, camera, period, and legend. It is destructive advice
   even when the underlying failure really is transient. This applies to *every* message in the
   app, not just export copy.

**Branch on the reason, and only offer a retry that can succeed.** A refusal decided
synchronously before any work begins — a blocked legend, an invalid composition — will refuse
identically on retry, forever. Offering "try again" there is how a permanently stuck gate gets
shipped. Map each reason exhaustively with a `switch` over the union so a new reason is a
compile error rather than a wrong sentence.

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

### Git safety

**Never run `git checkout -- <file>` on a file with uncommitted work.** It is a silent,
unrecoverable discard — there is no reflog for a working-tree change that was never staged. Two
separate agents lost edits this way in a single session.

This bites hardest during a **RED probe**, where the whole point is to temporarily break
something, watch a test fail, and put it back. "Put it back" is where the loss happens. Instead:

1. copy the file to a scratchpad directory *outside* the repository;
2. make the breaking edit in place;
3. run the test and record that it failed;
4. restore by copying the scratchpad copy back — never by asking git to do it.

Then confirm with `git status` that the tree is exactly as it was. The same rule covers
`git restore`, `git stash`, `git clean`, and `git reset --hard`: any command whose effect is
"discard whatever is in the working tree" needs a copy first.

**Also: do not junction or symlink `node_modules` between git worktrees.** `git worktree remove
--force` follows the junction and empties the shared target. Run `npm ci` in each worktree.

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

~~**LocalStorage is guaranteed.** Don't feature-detect; it's available in all target browsers.~~

**Corrected 2026-07-26 — `localStorage` is fallible, and the code already treats it that way.**
The API being *present* is not the same as it being *usable*: Safari private mode, blocked site
data, and a full origin all make `setItem` throw. `StorageAdapter` returns typed
`storage-unavailable` / `quota-exceeded` reasons on every entry point rather than throwing, and
callers map each reason to its own message. Never write code that assumes a read or a write
succeeds. See `storage.md` for the bounded-V2 limits that are checked *before* `JSON.parse`.

**Certification status is recorded honestly.** Chrome and Edge are exercised by the Playwright
suite. Firefox and Safari are **unverified/deferred by owner choice** — never described as
passing, and never implicitly certified by a claim about "all target browsers".

**Browser support is proven by the suite, not asserted in prose.** Playwright owns that claim;
if a browser is not in the project's Playwright configuration, no document may say it works.

---

*Last updated: 2026-07-26 — Phase 2 corrections: Vitest/Playwright supersede the manual-only testing guidance, a gate must be able to fail on its own subject, `localStorage` is fallible, no backend and no runtime third-party request, toast-not-alert with no "refresh the page" copy, and the git-safety rule for RED probes (plan 02-25).*
*Last updated: 2026-07-21 — initial Phase 1 general rules.*

*Full edit history: `git log -p -- .planning/coding-rules/general.md`.*
