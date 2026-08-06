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

## Cloud Sync (not built; no backend exists)

**Nothing below ships, and nothing below is planned for Phase 2.** Phase 2 is browser-only and
localhost-only: no backend, no auth, no cloud, no deployment target. There is no Supabase
dependency and adding one is an architectural decision, not an implementation detail. This
sketch is an intent record for some future phase, retained so the idea is not silently lost.

**Draft contract, unimplemented:**

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

**Stored bytes are untrusted input, and the bounds are checked BEFORE `JSON.parse`.** Anyone can
edit localStorage, and a deeply nested or enormous payload turns a synchronous parse on the main
thread into a hang the creator cannot escape. `try/catch` around `JSON.parse` — the Phase 1 rule
above — does not help: by the time it catches, the cost is already paid.

| Bound | Value | Checked |
|---|---|---|
| `MAX_STORAGE_SERIALIZED_LENGTH` | 1,000,000 chars | on the raw string, **before** parse |
| `MAX_STORAGE_JSON_DEPTH` | 32 | during a bounded walk |
| `MAX_STORAGE_JSON_NODES` | 50,000 | during the same walk |
| `MAX_SAVED_MAPS` | 10 | records past it are dropped with a corrupt warning |

Per-record bounds (colour entries, legend entries, label length, legend coordinates) are applied
during validation. **Over-bound input is repaired and reported, never silently clamped** — the
same rule that makes a stored 0-1 legend opacity become percent *and* raise `isRepaired`, rather
than quietly becoming 1%.

**`localStorage` is fallible; every entry point returns a typed reason.** `storage-unavailable`
and `quota-exceeded` are real outcomes — Safari private mode, disabled site data, and a full
origin all produce them — and they are returned, not thrown. This supersedes the Phase 1 claims
that quota is "plenty of headroom" and that private browsing needs no special case.

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

## Phase 3 Amendments — the adapter is the boundary

**Exactly one production file under `src/` may name browser storage, and it is `src/utils/storage.ts`.**
Enforced by `src/config/editorConfig.test.ts`, in both directions, and RED-proven. Everything else
goes through `StorageAdapter`. Test injection sites and the `page.evaluate` sites under `tests/e2e/`
are out of scope — they are test setup, not app code, and widening the gate to chase them is how it
stops being a gate.

**The adapter arrives through `MapEditor`'s props boundary as a FACTORY, not an instance.** The
default factory builds the browser-backed adapter; a host substituting its own changes nothing else
in the app. It is a factory because constructing the default at module scope binds the decision at
import time, before a test — or a host — has installed the environment the editor runs in.

### The shape `03-06` and `03-07`'s two new keys must follow

Both new Phase 3 keys — **D-18**'s last-open tool and **D-30**'s theme — follow the
`ONBOARDING_DISMISSED_KEY` precedent, and each rule below has a reason:

| Rule | Why |
|---|---|
| Reached through `StorageAdapter`, never a raw write | the gate above; and a raw write gets none of the typed reasons |
| A small **separate** key, not a new field on the composition record | the composition record is the creator's *map*. Editor UI state does not belong in a document that gets saved, loaded, and exported under a name; widening it makes every saved map carry the panel state that happened to be open when it was written |
| Respect the bounded V2 contract | `MAX_STORAGE_SERIALIZED_LENGTH`, `MAX_STORAGE_JSON_DEPTH`, `MAX_STORAGE_JSON_NODES`, all checked **before** `JSON.parse`. Stored bytes are untrusted whatever wrote them |
| **Absent-tolerant**, with the default decided in advance | a returning creator has neither key, and a first run must not look like a failure. Panel **closed** (D-18) and **light** (D-30). Never read an operating-system preference to fill either — Live Invariant 9 and `uiContract.test.ts` assertion 1 forbid a second writer of the theme |
| A failed read or write is a typed reason, never a throw | the theme and the panel are cosmetic; neither may take the editor down when site data is blocked |

### What `03-06` actually landed, and the two places it refines the shape above

`LAST_OPEN_TOOL_KEY` and `THEME_MODE_KEY` are in `src/constants/config.ts` beside
`ONBOARDING_DISMISSED_KEY`, and `StorageAdapter` gained exactly four methods:
`getLastOpenTool` / `setLastOpenTool` / `getThemeMode` / `setThemeMode`. The composition record's
shape is unchanged.

**The bound is checked on the RAW string, before the value is interpreted at all.** Neither key is
ever `JSON.parse`d — they hold short enum words — so there is no parse to guard. The rule still
applies and `MAX_PREFERENCE_VALUE_LENGTH` (32) enforces it, because *"stored bytes are untrusted
and bounded first"* is exactly the discipline that quietly stops being applied on the small keys.
Over-bound, unrecognised, and structurally wrong values all resolve to the default **and raise a
`corrupt-data` warning**; only an absent key resolves to the default silently.

**`closed` is a real stored value, not an absent key.** A creator who closes the panel and reloads
must get it back closed, and "absent" already means *never chose*. Both resolve to closed; only one
of them is a decision, and conflating them would have made "restore the last-open tool" unable to
restore *closed*.

**`getThemeMode` returns `EditorThemeMode | null`, and `null` means "no stored choice".** The
adapter does **not** apply the `light` default. It is a storage boundary, not a policy engine, and
baking the default in here would make `MapEditor`'s `initialThemeMode` prop dead code for every
host that mounts the editor with storage available. The default lives at the one layer that knows
it — `DEFAULT_EDITOR_CONFIG.initialThemeMode = 'light'` — so **an absent key still resolves to
light for the standalone app**, a host that mounts in dark still opens in dark on a first run, and
**no operating-system preference is consulted on either path** (D-30). `getLastOpenTool` needs no
equivalent, because closed is the only default and no prop competes for it.

**Preference reads do NOT go through `recordResult` in `useLocalStorage`.** A failed read of either
key must not set the storage error that drives `isPersistenceAvailable` and the
storage-unavailable toast: the panel state and the theme are cosmetic, and a blocked backend must
leave the editor fully usable with Export enabled and produce **no creator-facing message**. They
fall back silently. That is the contract, not an oversight — `ToastRegion` stays the allowlist
boundary and this phase introduces no new message.

## What `03-07` actually landed — Save/Load is panel content, and the confirmation contract survived the dialog

**The Save/Load modal dialog dissolved into the `saved` tool panel.** The dialog role, the
modality attribute, the overlay, the focus trap, the imperative `inert`, the opener button, and
the opener-restore chain (`restoreSaveLoadFocus`) all retired **with** the dialog. The panel's own
close (`Close Saved Maps`, now a unique accessible name — deferred item D-4 closed) and the tool
panel's Escape handle dismissal; opening the `saved` rail row IS opening Save/Load.

**The nested-confirmation contract survives verbatim — it was never about the modal:**
- a confirmation renders as a **sibling** of the surface it interrupts (the row's action group
  swaps in place), never a descendant of it;
- it carries its own **`tabIndex={-1}`** — a mouse-down on its body text must not drop focus to
  `document.body`, or the panel's keydown handler never fires and Escape dies with the prompt
  stuck open;
- `Escape` dismisses the **innermost** open confirmation, branching over every open layer in
  order (load confirm, then delete confirm); only an Escape that closes nothing propagates to the
  tool panel's own close;
- focus returns to the control that opened the confirmation **from an effect, keyed by the stable
  row key** (`name.length:name:timestamp`) — index keys break as soon as a row is deleted.

**Deleting a saved map is never one-shot** (unchanged): the row's actions swap to
`Delete Map: <name>` (filled from the mode-invariant `--destructive-fill` — white on the dark-mode
`--themely-red` is 2.78:1, so the fill follows the `--accent-fill` precedent) + `Keep Map: <name>`.
The dirty-load confirmation is the same inline shape now: heading, prompt, `Load Saved Map`,
`Keep Editing`.

**The saved-map row resolver filters through the APPROVED manifest ids (OPEN ITEM 4).**
`getPeriodShortLabel(snapshotId, approvedPeriodIds)` returns `null` for any id the approved
manifest does not yield, and the row renders **no period label**. The storage validator
(`SNAPSHOT_IDS` over all five catalog entries) is **deliberately unchanged** — a behaviour change
there alters what stored records are admitted, which is a data-layer decision, not a restyle.
See `data.md` § the approved-id filter for the reasoning of record.

---

*Last updated: 2026-08-06 — §What `03-07` actually landed: the Save/Load dialog dissolved into the `saved` tool panel with the modal machinery, opener, and `restoreSaveLoadFocus` retired; the nested-confirmation contract carried across verbatim (sibling, own `tabIndex={-1}`, innermost-first Escape, effect-based focus return keyed by the stable row key); the dirty-load confirmation made inline in the row; `Delete Map` filled from the new mode-invariant `--destructive-fill`; and the approved-id filter on `getPeriodShortLabel` with the storage validator deliberately unchanged (OPEN ITEM 4, plan 03-07).*
*Last updated: 2026-08-06 + earlier, condensed — §What `03-06` actually landed: the two preference keys with `MAX_PREFERENCE_VALUE_LENGTH` bounding the RAW string before interpretation; `closed` as a real stored value distinct from an absent key; `getThemeMode` returning `EditorThemeMode | null` so the adapter stays a boundary and `initialThemeMode` is not dead code; preference reads kept out of `recordResult` (plan 03-06). §Phase 3 Amendments: the one-production-storage-site gate, the adapter as a factory across `MapEditor`'s props boundary, and the D-18/D-30 key shape — separate small key, bounded V2, absent-tolerant, defaults closed and light (plan 03-05). 2026-07-26: pre-parse bounded V2 limits, fallible localStorage with typed reasons, cloud-sync sketch marked backend-less (plan 02-25). 2026-07-25: Phase 2 amendments — summary projection, V1 no-rewrite, delete/dirty confirmations, live-camera evidence, save-vs-load failure messaging (plan 02-20).*

*Full edit history: `git log -p -- .planning/coding-rules/storage.md`.*
