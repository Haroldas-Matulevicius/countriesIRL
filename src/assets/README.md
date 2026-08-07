# `src/assets/` — vendored binary assets

These bytes are **reviewable and pinnable on purpose.** `src/assets/inter-latin-variable.woff2`
and `src/assets/inter-latin-ext-variable.woff2` do not merely style the editor: `03-11` (latin) and
`04-04` (latin-ext) base64-inline them into the export bundle so the font reaches the
`data:image/svg+xml` clone the export path rasterises, which means these exact bytes
end up inside every PNG a creator publishes. That is the same reason `public/data/world-manifest.json`
records a hash for the world geometry, and this file applies the same discipline
(`03-RESEARCH.md` § Security Domain, ASVS V6).

**No runtime third-party request.** Both fonts are same-origin bundled. There is no Google Fonts
`@import`, no CDN `<link>`, and no `@import url(http…)` anywhere in `src/` or `index.html`
(`coding-rules/general.md` § Forbidden Patterns; threat `T-03-03`). Themely's own
`globals.css:1` uses a Google Fonts import — that is deliberately **not** carried over here.
**The Google Fonts fetches recorded below were one-time authoring actions performed by a human at
the terminal**; the shipped bytes are vendored and same-origin, and **no network request enters the
export path** (`coding-rules/export.md`).

---

## `inter-latin-variable.woff2`

| Field | Value |
|---|---|
| Typeface | Inter (variable) |
| Axis | `wght` 100–900, single variable face — verified, see § Variable-axis verification |
| Style | normal (no italic face is vendored) |
| Subset | **latin only** — `U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD` |
| Byte size | **48,432** bytes (`wc -c`) |
| SHA-256 | `c940764593d0fe5d596be327ca7558855e018039fb78509aa21921fd3644c3e4` |
| Base64-inflated | **64,576** bytes (`ceil(48432 / 3) * 4`) — the cost `03-11` pays per bundle |
| Licence | SIL Open Font License 1.1 |
| Copyright | `Copyright (c) 2016 The Inter Project Authors (https://github.com/rsms/inter)` |

Verify at any time:

```bash
wc -c src/assets/inter-latin-variable.woff2      # 48432
shasum -a 256 src/assets/inter-latin-variable.woff2
```

### Where the bytes came from

Fetched 2026-08-06 from the Google Fonts CSS2 API, which serves Inter under OFL-1.1 as
per-unicode-range subsets. Two requests, both recorded so the fetch is reproducible:

1. The stylesheet, requested with a woff2-capable Chrome user agent (the returned URLs differ by
   user agent, so the UA is part of the provenance):

   ```
   GET https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap
   User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 \
               (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36
   ```

2. The `/* latin */` block's `src`, downloaded verbatim:

   ```
   https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7W0Q5nw.woff2
   ```

   That block declares `font-weight: 100 900` and the unicode-range recorded in the table above.

**Upstream identity**, checked in the same session against the canonical source of truth —
`rsms/inter` release **v4.1** (published 2024-11-16), asset `Inter-4.1.zip`:

| Upstream artifact | SHA-256 |
|---|---|
| `LICENSE.txt` (SIL OFL 1.1) | `262481e844521b326f5ecd053e59b98c8b2da78c8ee1bdbb6e8174305e54935a` |
| `web/InterVariable.woff2` (352,240 B, full charset — **not** vendored) | `693b77d4f32ee9b8bfc995589b5fad5e99adf2832738661f5402f9978429a8e3` |

The upstream release ships no latin-subset build, so the Google Fonts subset is the source taken.
The upstream full-charset file is recorded here only so the size and coverage trade below rests on
measured numbers rather than an estimate.

`@fontsource-variable/inter` was **not** installed. `03-UI-SPEC.md` § Vendoring Safety records it
as not taken: bytes that end up in creator output must be reviewable and pinnable, and this repo
already has a first-class pattern for a bundled hash-verified same-origin asset.

### Variable-axis verification

The file is a genuine variable font, not a static instance mislabelled as one. Its WOFF2 table
directory carries every variation table:

```
tables    : GDEF GPOS GSUB HVAR MVAR OS/2 STAT avar cmap fvar gasp glyf loca gvar head hhea hmtx maxp name post
variation : fvar gvar avar HVAR MVAR STAT
```

It also renders through the real export path: `tests/e2e/spike-export-font.spec.ts` loads this file
by name, base64-inlines it into an SVG serialised exactly the way `src/utils/export.ts` does, and
asserts the raster differs from a font-less control. See the `OQ-1 verdict` section of
`.planning/phases/03-clean-ui-overhaul-1-1-5-weeks/03-01-SUMMARY.md`.

### Coverage gap — latin-ext is NOT included

> **CLOSED 2026-08-06 by plan `04-04` (D4-15) — annotated, not rewritten.** Everything below is
> still true **of this file**: `inter-latin-variable.woff2` stops at `U+00FF` and always will.
> The gap it describes no longer reaches the creator, because a **second** face is now vendored
> and inlined beside it — see § `inter-latin-ext-variable.woff2`. The original text is retained
> because it is the measurement `04-04` acted on, and its numbers came out exact.

**Was open, flagged for `03-04` (which authors the `@font-face`) and `03-11` (which inlines it).**

The vendored subset stops at `U+00FF`. Characters in latin-ext (`U+0100-024F`) fall back to
`system-ui` mid-string — in the editor *and* inside the exported PNG:

| Missing | Affects |
|---|---|
| `Ł ł ą ę ś ż ź ć ń` | Polish |
| `ą č ę ė į š ų ū ž` | Lithuanian |
| `ő ű` | Hungarian |
| `č ć đ š ž` | Balkan languages |
| `ā ē ī ū ģ ķ ļ ņ` | Latvian |
| `ě ď ř ů` | Czech |
| `ș ț` | Romanian |

This matters because `PROJECT.md` names Poland, Lithuania, Hungary, the Balkans, Iberia, and
Scandinavia as the focus regions. **Iberia and Scandinavia are unaffected** — `á é í ó ú ñ ü ö ä å
ø æ` are all inside latin-1. The bundled world geometry is also unaffected: Natural Earth
`properties.name` values are English and ASCII (`Poland`, `Lithuania`, `Czechia`). The exposure is
**creator-typed legend labels written in a native orthography** — `Łódź`, `Česko`, `Magyarország`
renders fine (`á` is latin-1) but `Košice` does not.

Measured cost of closing it, so the decision is made on numbers:

| Option | Raw | Base64 | Coverage |
|---|---|---|---|
| **Vendored today** — Google `latin` | 48,432 | 64,576 | latin-1 + common punctuation |
| Add Google `latin-ext` as a **second** file | +85,272 | +113,696 | adds `U+0100-02BA`, `U+1E00-1E9F`, `U+2C60-2C7F`, … |
| Replace with upstream `InterVariable.woff2` | 352,240 | 469,654 | full — also Greek, Cyrillic, Vietnamese (unwanted) |

**`04-04` took row 2, and the estimate was exact:** the fetched latin-ext file measures **85,272 B**
raw / **113,696 B** base64 — the same numbers to the byte.

> **§ Measured cost — framing corrected 2026-08-06 by `04-04`.** The Phase 3-era reading of this
> table (*"+113 KB per export"*) named the **wrong artifact**. The base64 inflates the **intermediate
> SVG data URL** that `exportMapPng` rasterises, and the bundle that carries it. The PNG encoder
> never sees a font byte: it is handed a raster. **Exported PNG file size is unaffected by either
> font**, and adding latin-ext did not change it. The real cost is bundle size plus export-time
> memory and serialisation work — measured headroom there is two orders of magnitude (a 3,000,269-character
> data URL loaded fine in installed Chrome, against ~190 KB for both faces after `encodeURIComponent`).

Google Fonts always splits by unicode-range, so a single file covering latin **and** latin-ext is
not obtainable from it; producing one needs a subsetting toolchain (`fonttools`/`pyftsubset`),
which is not installed and was not added. **`04-04` did not add one either** — two `@font-face`
rules for one family, each scoped by its own `unicode-range`, need no subsetting at all.

`03-01` deliberately did not decide this. It vendored exactly what `03-01-PLAN.md` Task 4B
specifies — a latin-subset variable woff2 — and recorded the gap with its price. **`04-04` decided
it** (D4-15), by adding the second file below rather than by touching this one.

### Size note against the planned estimate

`03-01-PLAN.md`'s backstop expected 100–300 KB raw, on the reasoning that base64-inlining it into
the JS bundle for `03-11`'s export path should be "a proportionate cost rather than a load
regression". At **48,432 B raw / 64,576 B base64** the real file is well under that floor, so the
backstop's *purpose* holds with room to spare. Being under the estimated range is not a defect —
but it is a deviation from the written number, so it is recorded rather than quietly absorbed.

---

## `inter-latin-ext-variable.woff2`

Added by plan `04-04` (D4-15). It does **not** replace the latin file — Google Fonts always splits
by `unicode-range`, so the two ship side by side and one family emits **two** `@font-face` rules,
each scoped to its own range. Both are inlined into the export clone, unconditionally.

| Field | Value |
|---|---|
| Typeface | Inter (variable) |
| Axis | `wght` 100–900, single variable face — verified, see § Variable-axis verification (latin-ext) |
| Style | normal (no italic face is vendored) |
| Subset | **latin-ext only** — `U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF` |
| Byte size | **85,272** bytes (`wc -c`) |
| SHA-256 | `a28eb6d3ccb534ae0c94ca999371df024aab60b08c3c8a5720ee9e32fa0faaa2` |
| Base64-inflated | **113,696** bytes (`ceil(85272 / 3) * 4`) — the cost `04-04` adds to the bundle and to the intermediate SVG, **not** to the exported PNG |
| Licence | SIL Open Font License 1.1 — **re-verified by live fetch this session**, see below |
| Copyright | `Copyright 2020 The Inter Project Authors (https://github.com/rsms/inter)` — read from the served family's `OFL.txt` |

Verify at any time:

```bash
wc -c src/assets/inter-latin-ext-variable.woff2  # 85272
shasum -a 256 src/assets/inter-latin-ext-variable.woff2
```

The `unicode-range` above is recorded **verbatim from the fetch** and is pasted verbatim into
`src/styles/interFontFace.ts` and `src/styles/theme.css`. A hand-typed range is a silent coverage
hole: the rule still parses, the face is still present, and the glyphs still fall back.

### Where the bytes came from

Fetched **2026-08-06** from the Google Fonts CSS2 API — the same two-request shape as the latin
file, recorded so the fetch is reproducible. This is a **one-time authoring action at the terminal**,
not a runtime request.

1. The stylesheet, requested with a woff2-capable Chrome user agent (the returned URLs differ by
   user agent, so the UA is part of the provenance):

   ```
   GET https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap
   User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 \
               (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36
   ```

2. The `/* latin-ext */` block's `src`, downloaded verbatim with the same user agent:

   ```
   https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa25L7W0Q5n-wU.woff2
   ```

   That block declares `font-weight: 100 900` and the unicode-range recorded in the table above.

**The same response re-verified the latin row.** The `/* latin */` block in this 2026-08-06 fetch
returned the byte-identical URL already recorded above
(`…UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7W0Q5nw.woff2`) with the identical `unicode-range`, so the
upstream `v20` build has not moved and the existing row's SHA-256 stands unchanged. **It was not
edited.**

### Licence verification — by fetch, not from memory

`04-RESEARCH.md` recorded `[ASSUMED, A6]` that the licence and byte sizes were still what Phase 3
measured. **That assumption is retired here**; both were checked live in this session:

| Checked | Where it was read | Result |
|---|---|---|
| Family licence | `GET https://fonts.google.com/metadata/fonts/Inter` (same UA) | `"license": "ofl"` |
| Licence text | `GET https://raw.githubusercontent.com/google/fonts/main/ofl/inter/OFL.txt` | *"This Font Software is licensed under the SIL Open Font License, Version 1.1."* — SHA-256 `5b9321a4298cfeb6b34354164a1c3afc3db114569984c502b9b35d988fd58c57`, 4,377 B |
| Copyright line | line 1 of that `OFL.txt` | `Copyright 2020 The Inter Project Authors (https://github.com/rsms/inter)` |
| Byte size | `wc -c` on the downloaded file | 85,272 — **exactly** the `03-01` estimate |

The licence is unchanged, so nothing was escalated. Had it changed, the task stops: a licence change
is an owner decision, never a plan decision.

The copyright string differs in form from the latin row's (`Copyright (c) 2016 …`) because the two
were read from **different places** — that row quotes the upstream `rsms/inter` v4.1 release, this
one quotes the served family's `OFL.txt`. Neither was inferred from the other.

### Variable-axis verification (latin-ext)

The file is a genuine variable font, not a static instance mislabelled as one. Its WOFF2 table
directory was parsed locally (no `fonttools` on this machine — the directory is read straight from
the WOFF2 header) and carries every variation table:

```
tables    : GDEF GPOS GSUB HVAR MVAR OS/2 STAT avar cmap fvar gasp glyf loca gvar head hhea hmtx maxp name post
variation : fvar gvar avar HVAR MVAR STAT
```

The same parser was run against `inter-latin-variable.woff2` as a control and reproduced the table
list already recorded above for it, character for character — so the parser is reading real table
tags, not printing a constant.

### Coverage — what the second face fixes, and what it does not

`Ł ł ą ę ś ż ź ć ń` (Polish), `ą č ę ė į š ų ū ž` (Lithuanian), `ő ű` (Hungarian), `č ć đ š ž`
(Balkan), `ā ē ī ū ģ ķ ļ ņ` (Latvian), `ě ď ř ů` (Czech) and `ș ț` (Romanian) are all inside
`U+0100-02BA` and are now drawn by this face — in the editor and inside the exported PNG.

**Still not covered, and no claim is made otherwise:** Greek, Cyrillic, Vietnamese-specific
precomposed forms (`U+1EA0-1EF9`), and CJK. Those are separate Google Fonts subsets that were
**not** vendored. **No claim of full Unicode coverage may be made anywhere.**

**What is proven, and by what.** `tests/e2e/export.spec.ts` proves the two faces reach the clone
and that a latin-ext string rasterises **differently** from the same string with the font
suppressed — i.e. that these bytes are what draw the glyphs. It does **not** prove the glyphs are
*correct*: that needs a human to open a PNG and look, which is requirement **A12**, scheduled in
plan `04-16` and **not performed** by anything in `04-04`.

---

*Last updated: 2026-08-06 — plan `04-04` Task 1 (D4-15): vendored `inter-latin-ext-variable.woff2` (85,272 B, SHA-256 `a28eb6d3…`) with fetch URLs, user agent, verbatim unicode-range, a locally parsed variable-axis proof, and a **live-fetch licence re-verification** that retires assumption A6. The latin row was annotated, never edited — the same fetch confirmed its URL and range are unmoved. § Measured cost framing corrected: the base64 inflates the bundle and the intermediate SVG, **not** the exported PNG.*

*Last updated: 2026-08-06 — created by plan `03-01` Task 4B (D-09): vendored the Inter Variable latin subset, recorded byte size, SHA-256, base64-inflated size, upstream identity, variable-axis proof, and the open latin-ext coverage gap.*

*Full edit history: `git log -p -- src/assets/README.md`.*
