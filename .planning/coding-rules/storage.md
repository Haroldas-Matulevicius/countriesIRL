# Coding Rules: Storage (localStorage Persistence)

**Read when touching:** localStorage, save/load maps, useLocalStorage hook, SaveLoad component.

---

## Storage Contract

**Storage key:** `'countriesirl_maps'`

**Format:** JSON array of saved maps.

```typescript
interface SavedMap {
  name: string;                    // User-chosen name (e.g., "EU Summer 2026")
  colors: Record<string, string>;  // { [countryId]: hexColor }
  timestamp: number;               // Unix milliseconds (Date.now())
}

// Stored as:
// localStorage.countriesirl_maps = JSON.stringify([
//   { name: 'EU Summer', colors: {...}, timestamp: 1721570000000 },
//   { name: 'Old Map', colors: {...}, timestamp: 1721569000000 },
// ])
```

**Max maps:** 10. If the user tries to save an 11th, drop the oldest.

**Quota:** ~5MB for localStorage. 10 maps × ~50KB per map (rough estimate) = ~500KB used. Plenty of headroom.

---

## useLocalStorage Hook

**Responsibility:** Save, load, delete, list saved maps.

```typescript
export function useLocalStorage() {
  const STORAGE_KEY = 'countriesirl_maps';
  const MAX_MAPS = 10;

  const saveMaps = (name: string, colors: Record<string, string>): void => {
    const maps = getMaps();
    const newMap: SavedMap = { name, colors, timestamp: Date.now() };

    // Replace if name already exists, otherwise prepend
    const filtered = maps.filter(m => m.name !== name);
    const updated = [newMap, ...filtered].slice(0, MAX_MAPS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const getMaps = (): SavedMap[] => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse saved maps:', e);
      return [];
    }
  };

  const loadMap = (name: string): Record<string, string> | null => {
    const maps = getMaps();
    const map = maps.find(m => m.name === name);
    return map?.colors || null;
  };

  const deleteMap = (name: string): void => {
    const maps = getMaps();
    const filtered = maps.filter(m => m.name !== name);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  };

  return { saveMaps, getMaps, loadMap, deleteMap };
}
```

**Always wrap `JSON.parse` in try/catch.** localStorage can be corrupted if the user manually edits it or if browser crashes mid-write.

```typescript
// ✅ Good
try {
  return JSON.parse(stored);
} catch (e) {
  console.error('Storage parse error:', e);
  return [];  // Return empty list, not crash
}

// ❌ Bad
return JSON.parse(stored);  // Throws if invalid JSON
```

---

## Save Flow

1. **User clicks "Save Map" button.**
2. **Modal opens** with a text input for the map name.
3. **User types a name** (e.g., "EU Summer 2026").
4. **User clicks "Save".**
5. **saveMaps(name, state.colors) is called.**
6. **useLocalStorage stores it.** If a map with that name exists, it's overwritten (update timestamp).
7. **Modal closes; user gets a toast** "Map saved!"

```typescript
// SaveLoad component
const handleSave = () => {
  if (!mapName.trim()) {
    alert('Please enter a map name');
    return;
  }
  saveMaps(mapName, colors);
  onSave(mapName);
  setMapName('');
};

// App component
const [showSaveDialog, setShowSaveDialog] = useState(false);

<button onClick={() => setShowSaveDialog(true)}>💾 Save Map</button>

{showSaveDialog && (
  <SaveLoad
    colors={state.colors}
    onSave={(name) => {
      setShowSaveDialog(false);
      alert('Map saved!');
    }}
    onClose={() => setShowSaveDialog(false)}
  />
)}
```

---

## Load Flow

1. **User clicks "Save Map" button** (same modal).
2. **Modal shows two sections:**
   - "Save Current Map" (text input)
   - "Load Saved Maps" (list of existing maps)
3. **User clicks "Load" on a saved map.**
4. **loadMap(name) is called; returns colors.**
5. **dispatch({ type: 'LOAD_STATE', payload: colors }) updates the map.**
6. **Modal closes; toast shows "Map loaded!"**

```typescript
// MapAction includes LOAD_STATE
type MapAction =
  // ... other actions
  | { type: 'LOAD_STATE'; payload: Record<string, string> };

// Reducer
case 'LOAD_STATE': {
  return {
    ...state,
    colors: action.payload,
    history: [action.payload],  // Reset history
    historyIndex: 0,
  };
}

// SaveLoad component
<button
  onClick={() => {
    const loaded = loadMap(map.name);
    if (loaded) {
      onLoad(map.name);
      alert('Map loaded!');
    }
  }}
>
  Load
</button>
```

**Reset undo/redo history on load.** The user is starting a fresh session with a different map.

---

## Delete Flow

```typescript
<button
  onClick={() => {
    deleteMap(map.name);
    alert('Map deleted');
    // Refresh the list
  }}
>
  Delete
</button>
```

**No confirmation dialog for Phase 1.** (Phase 2 can add "Are you sure?")

---

## Error Handling

**localStorage quota exceeded.** Unlikely (<500KB used out of 5MB), but handle gracefully.

```typescript
// ✅ Good
const saveMaps = (name: string, colors: Record<string, string>): void => {
  try {
    const maps = getMaps();
    const newMap: SavedMap = { name, colors, timestamp: Date.now() };
    const filtered = maps.filter(m => m.name !== name);
    const updated = [newMap, ...filtered].slice(0, MAX_MAPS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    if (e instanceof Error && e.name === 'QuotaExceededError') {
      alert('Storage full. Delete an old map and try again.');
    } else {
      alert('Failed to save map. Try refreshing the page.');
      console.error(e);
    }
  }
};
```

**Private browsing mode.** In private mode, localStorage is available but cleared on tab close. No need to special-case this; the API works the same.

---

## Performance

**localStorage is synchronous.** Reading/writing blocks the main thread. For Phase 1 (10 maps × ~50KB), no issue. Phase 2+ might use IndexedDB if maps get huge.

**Lazy-load saved maps.** Don't call getMaps() until the SaveLoad modal opens.

```typescript
// ✅ Good — lazy
{showSaveDialog && (
  <SaveLoad
    onLoad={(name) => {
      const loaded = loadMap(name);  // Only loaded when user clicks Load
      if (loaded) dispatch({ type: 'LOAD_STATE', payload: loaded });
    }}
  />
)}

// ❌ Bad — loaded on every render
const savedMaps = getMaps();
{showSaveDialog && (
  <SaveLoad savedMaps={savedMaps} ... />
)}
```

---

## Testing

**Manual tests:**

- [ ] Save a map with name "Test 1"
- [ ] Color some countries
- [ ] Save another map with name "Test 2"
- [ ] Verify the list shows both maps with their timestamps
- [ ] Click "Load Test 1"; map resets to Test 1's colors
- [ ] Load Test 2; colors change to Test 2's
- [ ] Delete Test 1; list shows only Test 2
- [ ] Close the browser tab, reopen the app; maps are still there
- [ ] Try to save 11 maps; the oldest should be dropped

**Edge cases:**

- [ ] Save a map, then modify colors, save again with same name (should update)
- [ ] Save with an empty name (should show error, not save)
- [ ] Save with a very long name (>100 chars — should work, truncate in UI if needed)
- [ ] Delete while the SaveLoad modal is open (list should refresh)

---

## Privacy & Security

**No server-side sync.** Maps are stored locally only. Users can't access their maps on a different device. This is intentional for Phase 1 (browser-first, no backend).

**No authentication.** Any user on the same computer can see and load each other's saved maps.

**Local encryption (Phase 2+).** If Phase 2 adds cloud sync, use TweetNaCl.js or libsodium.js to encrypt maps client-side before sending to the server.

---

## Phase 2: Cloud Sync (Future)

**Contract for Phase 2+:**

```typescript
// Save to cloud
const saveMapsToCloud = async (name: string, colors: Record<string, string>) => {
  // 1. Encrypt locally
  // 2. Upload to Supabase
  // 3. Store locally as fallback
};

// Load from cloud with fallback
const loadMapsFromCloud = async (): Promise<SavedMap[]> => {
  // 1. Try to fetch from Supabase
  // 2. If offline or auth fails, fall back to localStorage
};
```

The hook API stays the same; the backend swaps out.

---

## Phase 2 Amendments (authoritative where they conflict with the above)

The Phase 1 sections above describe the colors-only V1 record and the one-click delete. Both
are superseded. Phase 1 records are still readable and are migrated in memory.

**Saved-map rows never read stored colors.** `StorageAdapter.listSummaries()` returns
`SavedMapSummary` (`name`, `timestamp`, `sourceVersion`, `snapshotId`, `legendEntryCount`,
`isWholeWorldView`). The list surface consumes only that projection. `list()` still returns
full `SavedMap` records and stays reserved for callers that genuinely need the colors.

**Row metadata is derived from the stored record, never patched in memory.** After a
successful save or delete, re-read the list instead of splicing the write result into state,
or the metadata line drifts from what is actually on disk.

**A V1 record is never rewritten by reading or loading it.** Migration is in memory only;
only an explicit save/replace may write a V2 record over it. Any list/summary path that
writes is a bug.

**Never name a period from a stored id alone.** `snapshotId` is looked up in
`SNAPSHOT_CATALOG`; an id outside the approved catalog falls back to the legacy metadata
line. A deferred snapshot must never become reachable through a saved record's label.

**`isWholeWorldCamera` is a tolerance check, not identity.** Saved cameras are written from
the live D3 transform, so a reset view can differ from `INITIAL_WORLD_CAMERA` in the last
float digits. The row label is a human claim; use the epsilons, not `===`.

**Delete is a two-step inline confirmation** (`Delete Saved Map` → `Delete Map` / `Keep Map`),
and **loading over dirty work opens a confirmation dialog** (`Load Saved Map` /
`Keep Editing`). Replacement uses the inline pre-action warning only — no extra modal.

**A save failure is reported with save copy, a load failure with load copy.** Reasons are
shared (`StorageErrorReason` + `map-canvas-unavailable`), so a fall-through `else` silently
borrows the other operation's message: `map-canvas-unavailable` on **Save Current Map** used to
read *"This saved composition could not be loaded"*, and `map-not-found` claimed the browser
blocks local saves. Map each reason **exhaustively** in one pure `getSaveFailureMessage(reason)`
/ load equivalent — a `switch` over the union, so a new reason is a type error rather than a
wrong sentence — and unit-test that the messages stay distinct and never say "loaded" on a save
path.

**Dirty state needs a color baseline of its own.** The composition baseline covers camera,
period, legend, and settings but not colors. The color baseline is set only by an explicit
save or load — never by undo/redo, which must stay colors-only history.

**Proving a live-camera save needs a fixture, not the real app.** A mid-animation save cannot
be driven through the real UI — opening Save/Load costs more than the 240ms transition.
`tests/e2e/fixtures/persistence.html` mounts `MapCanvas` with the real save/load transactions
and exposes `saveAfter(delayMs, name)`.

**Do not assert a live-camera save by comparing it to another live read** — that is
tautological. The load-bearing comparison is against the *committed* camera: `onGestureFrame`
only paints and `onGestureEnd` commits, so during motion the composition camera is provably
stale. A save that stored it would be the stale-save bug. Assert
`stored ≈ painted-at-activation`, `stored ≠ committed-at-activation`, and `stored ≠ settled`.

---

*Last updated: 2026-07-25 — save-vs-load failure messaging rule (wave 6 review LOW-8).*
*Last updated: 2026-07-25 — Phase 2 amendments: summary projection, V1 no-rewrite, delete/dirty confirmations, live-camera evidence rules (plan 02-20).*
*Last updated: 2026-07-21 — initial Phase 1 storage rules. Full edit history: `git log -p -- .planning/coding-rules/storage.md`.*
