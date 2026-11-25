# Bundled fonts

| File | Family | Upstream | License |
| --- | --- | --- | --- |
| `KovaDisplay-1..3.ttf` | Kova Display | Fraunces by Undercase Type (Phontes Akritas, Undercase Type) | SIL Open Font License 1.1 |
| `WorkSans-1..3.ttf`, `WorkSans-1..3.woff2` | Work Sans | Work Sans by Wei Huang | SIL Open Font License 1.1 |
| `MaterialSymbols-1.woff2` | Material Symbols Outlined | Google Material Design | Apache License 2.0 |

`KovaDisplay` is a renamed copy of Fraunces SemiBold (latin, latin-ext and
vietnamese subsets) so the family name in the theme is unambiguous. The
outlines are unchanged; only the name table and the OS/2 weight class were
adjusted when the WOFF2 subsets were converted to TTF.

The desktop (Windows) host in nsh 0.7 registers imported faces but does not
resolve them by name in its text stack yet, so `nsh.json` lists the intended
faces first and a system fallback after them:

```
display / headline : "Kova Display, Fraunces, Georgia, serif"
title / body / label: "Work Sans, Segoe UI, sans-serif"
```

On Windows the design renders with Georgia for display and Segoe UI for text;
once the host resolves bundled families, the bundled faces take over without
any other change. The Material Symbols icon font resolves today, so the icon
set is the design's own.
