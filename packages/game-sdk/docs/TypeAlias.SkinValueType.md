# Type Alias: SkinValueType

> **SkinValueType** = `"color"` \| `"image"` \| `"audio"` \| `"video"` \| `"boolean"` \| `"number"` \| `"range"` \| `"list"`

Value type a skin key may carry. Drives the resolver's per-value validator.
 `color` accepts hex (`#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`) and functional
 `rgb(...)` / `rgba(...)`. Asset types (`image` / `audio` / `video`) accept
 absolute URLs, bundle-relative paths (resolved against the package's bundle
 base, like `game-src`), and `data:` URIs whose MIME prefix is on the
 allow-list. The scalar types (`boolean` / `number` / `range` / `list`)
 behave exactly like their configuration counterparts and resolve to the
 typed value (a `boolean` stays `true`, a `number` stays `8`).
