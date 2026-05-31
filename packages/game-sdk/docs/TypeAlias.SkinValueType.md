# Type Alias: SkinValueType

> **SkinValueType** = `"color"` \| `"image"` \| `"audio"` \| `"video"`

Value type a skin key may carry. Drives the resolver's per-value validator
 (allow-list of formats / mimetypes) and the widget shell's authoring
 tooling. `color` accepts hex (`#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`) and
 functional `rgb(...)` / `rgba(...)`. Asset types accept absolute URLs,
 bundle-relative paths (resolved against the package's bundle base, like
 `game-src`), and `data:` URIs whose MIME prefix is on the allow-list.
