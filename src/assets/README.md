# `src/assets/` — vendored binary assets

These bytes are **reviewable and pinnable on purpose.** `src/assets/inter-latin-variable.woff2`
does not merely style the editor: `03-11` base64-inlines it into the export bundle so the font
reaches the `data:image/svg+xml` clone the export path rasterises, which means these exact bytes
end up inside every PNG a creator publishes. That is the same reason `public/data/world-manifest.json`
records a hash for the world geometry, and this file applies the same discipline
(`03-RESEARCH.md` § Security Domain, ASVS V6).

**No runtime third-party request.** The font is same-origin bundled. There is no Google Fonts
`@import`, no CDN `<link>`, and no `@import url(http…)` anywhere in `src/` or `index.html`
(`coding-rules/general.md` § Forbidden Patterns; threat `T-03-03`). Themely's own
`globals.css:1` uses a Google Fonts import — that is deliberately **not** carried over here.

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

**Open, flagged for `03-04` (which authors the `@font-face`) and `03-11` (which inlines it).**

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

Google Fonts always splits by unicode-range, so a single file covering latin **and** latin-ext is
not obtainable from it; producing one needs a subsetting toolchain (`fonttools`/`pyftsubset`),
which is not installed and was not added.

`03-01` deliberately did not decide this. It vendored exactly what `03-01-PLAN.md` Task 4B
specifies — a latin-subset variable woff2 — and recorded the gap with its price.

### Size note against the planned estimate

`03-01-PLAN.md`'s backstop expected 100–300 KB raw, on the reasoning that base64-inlining it into
the JS bundle for `03-11`'s export path should be "a proportionate cost rather than a load
regression". At **48,432 B raw / 64,576 B base64** the real file is well under that floor, so the
backstop's *purpose* holds with room to spare. Being under the estimated range is not a defect —
but it is a deviation from the written number, so it is recorded rather than quietly absorbed.

---

*Last updated: 2026-08-06 — created by plan `03-01` Task 4B (D-09): vendored the Inter Variable latin subset, recorded byte size, SHA-256, base64-inflated size, upstream identity, variable-axis proof, and the open latin-ext coverage gap.*

*Full edit history: `git log -p -- src/assets/README.md`.*
