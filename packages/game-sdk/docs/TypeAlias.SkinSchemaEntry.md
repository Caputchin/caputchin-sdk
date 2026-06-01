# Type Alias: SkinSchemaEntry

> **SkinSchemaEntry** = `"color"` \| `"image"` \| `"audio"` \| `"video"` \| `"boolean"` \| `"number"` \| readonly `string`[] \| \{ `description?`: `string`; `name?`: `string`; `type`: `"color"` \| `"image"` \| `"audio"` \| `"video"` \| `"boolean"` \| `"number"`; \} \| \{ `description?`: `string`; `name?`: `string`; `type`: `"list"`; `values`: readonly `string`[]; \} \| \{ `description?`: `string`; `max`: `number`; `min`: `number`; `name?`: `string`; `step?`: `number`; `type`: `"range"`; \}

Schema entry for a single skin key. Mirrors [ConfigSchemaEntry](TypeAlias.ConfigSchemaEntry.md):
 a bare type string (`"main_color": "color"`), an array-literal enum
 (`"pattern": ["dots","stripes"]`, short-form for `list`), or a full
 descriptor. `range` and `list` REQUIRE the full descriptor because they
 carry constraint data (bounds, enum); the others accept the bare descriptor.
