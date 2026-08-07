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

## The colour value at the storage boundary (Phase 4, D4-02, plan `04-05`)

**The V2 wire format is one canonical hex string per country. The in-memory model is the
`ColorValue` union.** Those are two different shapes on purpose, and `storage.ts` is the only file
that knows both. A `typeof raw === 'string'` in `normalizeColorMap` is the **wire format** being
read, not the old hex-only assumption coming back — the union's discriminant is a `kind` property
and nothing narrows it with `typeof` (general.md Live Invariant 10).

**"A shape this version does not persist" is not corruption. Only "a value that is invalid" is.**
That distinction is the whole rule, and both halves are gated:

| Stored value | Outcome |
|---|---|
| `"#2563EB"` — V2's own wire shape | read as the custom variant, **no repair** |
| `{"kind":"custom","hex":"#2563EB"}` | read as-is, **no repair** (non-canonical spelling repairs, as before) |
| `{"kind":"ramp","rampId":"blues","t":0.5}` — a shape `04-14` will write | read as-is, **no repair** |
| unknown `rampId`, `t` outside `[0, 1]`, non-finite or non-numeric `t`, missing `kind`, a nested object as `t` | **corrupt** — entry dropped and the record reported |

Validation is `isColorValue` in `src/utils/colors.ts` — one rule, not a second copy here.
`rampId` is checked against `RAMP_IDS`, and `[0, 1]` is part of the shape because `t` is a
normalized position by definition (T-04-05-01).

**Saving is interim and LOSSY IN THE RAMP IDENTITY until `04-14` — stated, not discovered.**
`toStoredColorMap` resolves every value to hex at serialization, so the bytes stay a **valid V2
record** and no file claims a version whose shape it does not have. Saving a ramp-painted map and
reopening it yields a custom-hex map that **renders identically** but can no longer be re-skinned
by switching ramps. `04-14` owns the `schemaVersion` bump to V3 and the bounds that go with it;
its V3 branch is what makes this lossless. Until then `schemaVersion` still dispatches on `2`.

**No bound moved for the union, and the order did not change.**
`MAX_STORAGE_SERIALIZED_LENGTH` (1,000,000), `MAX_STORAGE_JSON_DEPTH` (32),
`MAX_STORAGE_JSON_NODES` (50,000) and `MAX_STORED_COLOR_ENTRIES` (512) are untouched: the
raw-length check still runs **before** `JSON.parse` and `hasSafeJsonBudget` immediately after.
Because saves serialize hex, a stored record's node count is what it always was. **`04-14` extends
these for the V3 fields, in this same order** — a union object per country is more nodes per
entry, so that is a real budget question, not a formality (T-04-05-03).

**Prototype pollution: the guard got more load-bearing, not less.** Every `ColorMap` built from
stored data still goes through `createEmptyColorMap()`'s `Object.create(null)` and
`isSafeStableCountryId`. The union nests an **object** under each key now, so a reserved key
smuggles in a structure rather than a string; the `__proto__` / `constructor` / `prototype` tests
cover the ramp variant as well as the custom one (T-04-05-02).

---

## A removed field is not a damaged one (Phase 4, D4-11, plan `04-12`)

**`04-05` established that a shape this version does not *persist* is not corruption. `04-12`
establishes the mirror rule: a field this version no longer *models* is not corruption either.**

D4-11 deleted `theme`, `backgroundOpacity`, and `borderStyle` from `LegendState`. Every saved V2
record on a creator's machine still carries all three. `normalizeLegend` **does not read them and
does not report them**, and that is deliberate rather than an omission:

| Stored legend field | Outcome |
|---|---|
| `theme`, `backgroundOpacity`, `borderStyle` — present, any value, including the retired 0–1 opacity fraction | **ignored, no repair, no warning** |
| `textSize` — a value outside `LEGEND_TEXT_SIZES` | **repaired to the default and reported** |
| `entries` / `position` — malformed | **repaired and reported**, exactly as before |

**Why it has to be silent.** `isRepaired` is what raises `composition-repaired`, and that warning
reaches the creator as a corruption toast. Counting a dropped field would fire it on **every
reopened saved map**, for a migration that succeeded — a permanent, unclearable alarm about
nothing. The distinction the validator draws is **"field removed by this version"** versus
**"value invalid"**, and only the second is reported.

**Relaxing one must not relax the other**, so both directions are asserted in `storage.test.ts`:
a V2 record carrying all three deleted fields loads `ok: true` with `warnings: []`, and the same
record with an invalid `textSize` beside them still reports `composition-repaired`.

**The SAVE side changed too, and `04-14` inherits it.** `useCompositionSaveTransaction` no longer
writes the three fields into the V2 record — the shape it emits is `{entries, position,
textSize}`. `tests/e2e/persistence.spec.ts` asserts that saved **key set** rather than a dropped
value, so a field creeping back into the persisted record reddens it. **No bound moved:**
`MAX_STORED_LEGEND_ENTRIES` (512), `MAX_LEGEND_LABEL_LENGTH` (32), and the pre-`JSON.parse`
raw-length check are untouched, and `LEGEND_MAX_ACTIVE_ENTRIES = 30` still gates export
unchanged. `04-14`'s V3 record starts from three legend keys, not six.

**This retires Live Invariant 8** (`general.md`) — the 0–1-fraction repair it mandated has no
field left to repair. Retired there, not deleted.

### The three fields `04-13` added back, and the same rule in the other direction (D4-12)

`form`, `caption`, and `showNoData` joined `LegendState`. **None of them is chrome** — one is which
marks the legend draws, the other two are what it says — and all three arrive at `normalizeLegend`
from untrusted stored JSON, so the same distinction applies with the sign flipped:

| Stored legend field | Absent | Present and valid | Present and invalid |
|---|---|---|---|
| `form` | **`null`, no warning** — every record written before `04-13` lacks it, and `null` means "follow the colouring technique" | kept verbatim | **repaired to `null` and reported** — `'stack'` renders neither form, which reaches the PNG as a blank rectangle |
| `caption` | **`''`, no warning** | kept verbatim | sanitised (control characters stripped, bounded to `MAX_LEGEND_CAPTION_LENGTH`) **and reported** — a value that had to be changed WAS damaged |
| `showNoData` | **`false`, no warning** | kept verbatim | **repaired to `false` and reported** |

Both directions are asserted in `storage.test.ts` and both were RED-proved, because relaxing one
must not relax the other: forcing the absent branch to behave as present-and-invalid reddens the
clean-load case, and dropping the three terms from `isRepaired` reddens the damaged-load case.

**The SAVE side, restated for `04-14`: the legend record is now SIX keys** — `{entries, position,
textSize, form, caption, showNoData}` — and `persistence.spec.ts` asserts that exact set. The three
D4-11 keys are still absent, which is the half that assertion has always protected.

> ⚠ **`form` is persisted RESOLVED, not as the raw override, and this is a rule rather than an
> implementation detail.** `04-05`'s save path resolves every `ColorValue` to a hex, so a reloaded
> composition has **no ramp assignments left** and `inferLegendForm` returns `rows` for every one of
> them. Persisting a `null` override would therefore reopen every saved bar legend as rows — a
> silent, creator-visible change to a map that may already have been posted.
> `final-integration.spec.ts` measured it: **1426 red legend pixels before a reload, 484 after.**
> A save is a snapshot, so it records the form the legend actually had. **`04-14` should revisit
> this when V3 persists the colour union**: once the ramp identity survives a round trip, the
> inference does too, and the resolved write can go back to being an override.

**No bound moved.** `MAX_STORED_LEGEND_ENTRIES` (512), `MAX_LEGEND_LABEL_LENGTH` (32), and the
pre-`JSON.parse` raw-length check are untouched, and `LEGEND_MAX_ACTIVE_ENTRIES = 30` with
`LEGEND_OVERFLOW_MESSAGE` still gates export in **both** forms. The caption's bound is a new one
(`MAX_LEGEND_CAPTION_LENGTH`, 32) and it **truncates rather than refuses**, deliberately: a refusal
needs a creator-facing message, every such message passes through `ToastRegion`'s allowlist, and
`uiContract.test.ts` assertion 23 pins those counts as hard numbers that `04-13` does not move.

---

## The V3 record, and one rendering path (Phase 4, D4-17, plan `04-14`)

**`save()` writes `schemaVersion: 3`. There is no legacy mode.** The owner gate was answered
`v3-one-path` under a **blanket, in-advance, sight-unseen proceed-authorization** — per Immutable
Safety Constraint 8 that authorized *proceeding*; it is **not** a content review and **not**
hash-bound.

### A V3 writer breaks V2 readers by design — recorded, not discovered

Once a record is written at version 3, an older build reading the same browser origin reports
`unsupported-version` **for that record**. It is a refusal, not a crash, and the other records in
the array still load. Browser-local; no deployment exists, so it can only affect a machine running
an older build against the same profile. This is accepted, not mitigated.

**And the creator-visible half, which is the real cost.** A map saved before Phase 4 reopens with
**no legend box** (D4-11), **grey uncoloured countries** instead of white (D4-09), **a top band
on**, **coastlines at `none`** with interior borders at `thin`, and the legend **lower**, below the
title block (D4-13). **Re-exporting it produces a PNG that differs from one the creator may already
have posted.** Colours, selections, legend labels and ordering, legend position, text size, camera,
and the composition name all survive; only the legend's box styling — already deleted from the
model — is gone. `storage.test.ts` asserts each of those five defaults on a hand-built V2 record, so
the acknowledgement is machine-checkable rather than prose.

### The dispatch is three-way, and the V2 branch is KEPT

| Stored `schemaVersion` | Branch |
|---|---|
| absent | V1 legacy → `createLegacyOutcome`, `sourceVersion: 1`, `legacy-migrated` |
| `2` | `normalizeComposition(…, 2)` → **upgraded in memory** to the V3 snapshot, `sourceVersion: 2` |
| `3` | `normalizeComposition(…, 3)`, `sourceVersion: 3` |
| anything else | `unsupported-version` |

`isSavedCompositionV2` is **kept** and `isSavedCompositionV3` added beside it. One rendering path
means every branch produces the same in-memory snapshot — it does **not** mean deleting the reader
that lets a creator's existing maps open.

**A record is upgraded only by an explicit save of its OWN.** A V2 record re-written because a
*neighbour* was saved is serialized back in the **V2 wire shape** — hex colours and the lone
`backgroundColor` settings field — exactly as a V1 record has always stayed V1. The in-memory
snapshot now carries a full V3 settings object because the *reader* fills defaults, and spreading
that into a `schemaVersion: 2` record would make the bytes claim a version whose shape they do not
have.

### What V3 persists

`composition.colors` persists the **`ColorValue` union losslessly**: a ramp assignment as
`{kind:'ramp',rampId,t}`, a custom one as a **bare canonical hex**. The hex is not an inconsistency
— it is V2's own wire shape, `normalizeColorMap` already reads it, and it costs one json node
instead of four. **This replaces `04-05`'s interim resolve-to-hex**, which that plan recorded as
deliberate, temporary, and lossy in the ramp identity. A reopened map can be re-skinned again.

`composition.settings` persists `surfaceColor`, `uncoloredFill`, `borderColor`, `interiorWeight`,
`coastlineWeight`, the four band fields, and the five text fields — and **deliberately omits
`backgroundColor`**. It was V2's record that the composition is opaque, nothing renders from it, and
`surfaceColor` is the value that actually paints. `04-14` was named as the plan that would decide
its fate; it decided to drop it.

`composition.legend` is unchanged from `04-13`'s six keys. **`form` is still persisted RESOLVED.**
V3 now makes the ramp identity survive a round trip, so `inferLegendForm` *could* work on a reloaded
map and the resolved write *could* go back to being an override — the revisit `04-13` invited. It
was deliberately **not** taken here: reverting it is a creator-visible behaviour change with its own
gates, and it is not this plan's subject. It stays open.

### Defaults, not repairs — and the line between them

| Stored field | Outcome |
|---|---|
| **absent** (any new V3 field) | the default, **no repair** |
| present and valid | kept |
| present and invalid | the default, or the clamped/sanitised value, **and reported** |
| `settings.backgroundColor`, any value or none | **read and discarded, silent** |
| `legend.theme` / `backgroundOpacity` / `borderStyle` | **read and discarded, silent** (`04-12`) |

The reason is the creator's screen, not tidiness: `isRepaired` raises `composition-repaired`, which
reaches the creator as a **corruption toast**. Reporting a field V3 simply does not model would fire
it on **every reopened saved map**, permanently, for a migration that succeeded. **V2's validator
required `settings.backgroundColor === '#FFFFFF'` and flagged the whole record repaired otherwise;
that requirement is now a migration, not a rejection.**

The distinction is **"field removed or added by V3"** versus **"value invalid"**, and only the
second is corruption. Both directions are asserted, one case per new settings field, because
relaxing one must not relax the other.

### The extended bounds, in the order the existing ones established

**The order is the mitigation, not decoration** (T-04-14-01), and no existing value or step moved:

1. `MAX_STORAGE_SERIALIZED_LENGTH` (1,000,000) on the **raw string, before any parse**;
2. `hasSafeJsonBudget` (`MAX_STORAGE_JSON_DEPTH` 32, `MAX_STORAGE_JSON_NODES` 50,000) on the parsed
   value, **immediately after**;
3. the per-field bounds, during validation.

Both sites that touch the serialized form apply step 1: `parseSavedMaps` on the way in, and
`writeRecords` on the way out (refused as `quota-exceeded`). `storage.test.ts` proves the ordering
by feeding an oversized string and asserting the injected parser was **never called**.

The new per-field bounds: band heights through **`clampBandHeight`** (`[0, BAND_MAX_HEIGHT]`, the
one clamp, not re-derived), text through **`sanitizeCompositionText`**, colours through
`normalizeColor`, and the enums through `STROKE_WEIGHTS` / `COMPOSITION_TEXT_SIZES` /
`COMPOSITION_TEXT_ALIGNMENTS`.

> ⚠ **Text is bounded at `MAX_COMPOSITION_TEXT_LENGTH` (100), NOT at `characterBoundFor`'s per-role
> line bounds**, and that is a decision rather than an omission. The product **refuses rather than
> truncates** past a role bound: a creator can hold an over-bound title in state, watch the counter
> turn destructive, and be told to shorten it, while `getCompositionTextBlockingMessage` blocks the
> export. Truncating at the storage boundary would silently clip those words, convert a legible
> refusal into invisible damage, and mean a title no longer round-trips. **A storage bound must
> equal the state boundary's bound.**

There is **no** new "count of text boxes" bound: the schema has exactly three named text fields and
no collection, so a count is structurally unrepresentable. There is **no** separate ramp-assignment
cap either — `MAX_STORED_COLOR_ENTRIES` (512) already bounds every colour entry, and a second cap
would be decorative for the reason below.

### The node budget the union actually costs — measured, and not raised

`04-05` flagged this as *"a real budget question, not a formality"*, because a ramp assignment is an
**object** per country instead of a string. Measured with the same walk `hasSafeJsonBudget`
performs:

| Store | V2 nodes | V3 nodes |
|---|---|---|
| ONE worst-case record (512 colours + 512 legend entries) | 2,584 | **4,134** |
| TEN worst-case records (a full `MAX_SAVED_MAPS` store) | 25,831 | **41,331** |
| TEN realistic records (207 colourable units, 30 legend entries) | — | 9,851 |

**It fits, and `MAX_STORAGE_JSON_NODES` was not raised.** The honest half is the margin: a hostile
full store went from **48% headroom under V2 to 17% under V3**, so the union spent roughly two
thirds of what was spare. A real creator cannot approach it — there are 207 colourable units, so
9,851 is the practical ceiling — and reaching 41,331 needs hand-edited `localStorage`. The
assertions pin the margin **behaviourally** through the real adapter rather than re-implementing the
walker and agreeing with it: **twelve worst-case records still parse (49,597) and thirteen do not
(53,730)**.

> ⚠ **A per-field cap cannot rescue the node budget, and none was added to pretend otherwise.**
> `hasSafeJsonBudget` runs over the **whole parsed array** before any record is validated, so step 3
> only ever trims a record that has already parsed. If a future field pushes the worst case over
> 50,000, the failure is the entire store rejected at once — not a trimmed record.

### The reserved-key guard got more load-bearing again

`createEmptyColorMap()`'s `Object.create(null)` and `isSafeStableCountryId` stay on every path that
builds state from a stored record. V3 is the first version that actually **writes** the nested
object, so a reserved key now smuggles a structure through a real wire shape rather than a
hypothetical one. `storage.test.ts` covers `__proto__` and `constructor` carrying **ramp payloads**.

### Carried forward unchanged: the deferred-snapshot-id validator (T-04-14-04)

`storage.ts` builds `SNAPSHOT_IDS` from the **full five-entry catalog**, so a hand-edited record can
still name a deferred snapshot and be admitted by the validator; Phase 3 filtered only the
presentation layer (`getPeriodShortLabel`). **This is pre-existing Phase 2 behaviour, recorded in
`STATE.md`, not introduced by `04-14`, and deliberately not fixed here** — changing what stored
records are admitted is a data-layer decision, not a schema bump. Restated so it stays visible.

---

*Last updated: 2026-08-07 (Phase 4, plan `04-14`) — §The V3 record, and one rendering path added (D4-17/D4-18). `save()` writes `schemaVersion: 3`; the dispatch is three-way with the V2 branch KEPT and `isSavedCompositionV3` beside `isSavedCompositionV2`; a record is upgraded only by an explicit save of its OWN, so a re-written V2 neighbour keeps the V2 wire shape. **`04-05`'s interim resolve-to-hex is replaced** — a ramp assignment persists as `{kind,rampId,t}` and a custom one as a bare hex, so the ramp identity survives a round trip. `settings` persists every Phase 4 field and **drops `backgroundColor`**, whose fate this plan was named to decide; its V2 `=== '#FFFFFF'` requirement became a **migration, not a rejection**, because reporting it would fire a corruption toast on every reopened map. Defaults-not-repairs tabulated with both directions asserted per field. Bounds EXTENDED without moving a value or a step, with the deviation stated: text is bounded at `MAX_COMPOSITION_TEXT_LENGTH` (100), **not** `characterBoundFor`, because the product refuses rather than truncates and a storage bound must equal the state boundary's bound. The node budget is **measured, not assumed** — 4,134 nodes for one worst-case V3 record and 41,331 for a full store against 50,000, headroom down from 48% to 17%, pinned behaviourally at twelve-parse / thirteen-refuse — and NOT raised, with the note that a per-field cap cannot rescue it because the budget runs over the whole array first. `form` stays persisted RESOLVED: `04-13`'s revisit is now possible but deliberately not taken. T-04-14-04's deferred-snapshot-id validator carried forward unfixed.*
*Last updated: 2026-08-07 (`04-13`) + 2026-08-07 (`04-12`) and earlier, merged per the two-entry rule — §A removed field is not a damaged one gained §The three fields `04-13` added back (D4-12): `form`, `caption`, and `showNoData` arrive from untrusted stored JSON, and the D4-11 rule applies with the sign flipped — ABSENT is a schema difference and silent (every pre-`04-13` record lacks all three), PRESENT-BUT-INVALID is corruption and reported, tabulated per field in three columns and RED-proved in both directions. The saved legend record is now SIX keys and `persistence.spec.ts` asserts that set. **`form` is persisted RESOLVED, not as the raw override**, because `04-05`'s hex-at-serialization leaves a reloaded composition with no ramp assignments to infer from — measured at 1426 red legend pixels before a reload and 484 after — with `04-14` named as the plan that can revert it once V3 persists the colour union. The caption's new bound TRUNCATES rather than refuses, because a refusal would need a `ToastRegion` allowlist entry and assertion 23's counts do not move. Earlier: 2026-08-07 (`04-12`) + 2026-08-06 and earlier, merged per the two-entry rule — §A removed field is not a damaged one added (D4-11): the mirror of `04-05`'s rule — a field this version no longer MODELS is not corruption, tabulated per stored legend field, with the reason stated as the creator-facing consequence (`isRepaired` raises a corruption toast, so counting a dropped field would alarm on every reopened map for a migration that succeeded) and both directions required to be asserted so relaxing one cannot relax the other. Records the SAVE-side change `04-14` inherits — the V2 legend record is now `{entries, position, textSize}` and `persistence.spec.ts` asserts the key SET — confirms no bound moved and the 30-colour export gate is unchanged, and names Live Invariant 8 as retired in `general.md` rather than deleted.* Earlier: §The colour value at the storage boundary (D4-02) added: the V2 WIRE format stays one canonical hex per country while the in-memory model becomes the `ColorValue` union, with `storage.ts` the only file that knows both and its `typeof raw === 'string'` explicitly the wire format rather than the retired hex-only assumption; the rule that "a shape this version does not persist" is NOT corruption and only "a value that is invalid" is, tabulated per stored value, with validation delegated to `isColorValue` rather than copied; saving recorded as a DELIBERATE INTERIM that is lossy in the ramp identity and never invalid, with `04-14`'s V3 branch named as what makes it lossless and `schemaVersion` still dispatching on 2; every bound and their order confirmed unmoved, with the note that V3 genuinely does need the node budget rechecked because a union object per country is more nodes per entry; and the reserved-key guard called out as MORE load-bearing because the union nests an object under each key. Earlier: §What `03-06` actually landed: the two preference keys with `MAX_PREFERENCE_VALUE_LENGTH` bounding the RAW string before interpretation; `closed` as a real stored value distinct from an absent key; `getThemeMode` returning `EditorThemeMode | null` so the adapter stays a boundary and `initialThemeMode` is not dead code; preference reads kept out of `recordResult` (plan 03-06). §Phase 3 Amendments: the one-production-storage-site gate, the adapter as a factory across `MapEditor`'s props boundary, and the D-18/D-30 key shape — separate small key, bounded V2, absent-tolerant, defaults closed and light (plan 03-05). 2026-07-26: pre-parse bounded V2 limits, fallible localStorage with typed reasons, cloud-sync sketch marked backend-less (plan 02-25). 2026-07-25: Phase 2 amendments — summary projection, V1 no-rewrite, delete/dirty confirmations, live-camera evidence, save-vs-load failure messaging (plan 02-20) Earlier the same day: §What `03-07` actually landed: the Save/Load dialog dissolved into the `saved` tool panel with the modal machinery, opener, and `restoreSaveLoadFocus` retired; the nested-confirmation contract carried across verbatim (sibling, own `tabIndex={-1}`, innermost-first Escape, effect-based focus return keyed by the stable row key); the dirty-load confirmation made inline in the row; `Delete Map` filled from the new mode-invariant `--destructive-fill`; and the approved-id filter on `getPeriodShortLabel` with the storage validator deliberately unchanged (OPEN ITEM 4, plan 03-07).*

*Full edit history: `git log -p -- .planning/coding-rules/storage.md`.*
