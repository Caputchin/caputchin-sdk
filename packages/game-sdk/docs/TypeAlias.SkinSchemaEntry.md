# Type Alias: SkinSchemaEntry

> **SkinSchemaEntry** = [`SkinValueType`](TypeAlias.SkinValueType.md) \| \{ `description?`: `string`; `name?`: `string`; `type`: [`SkinValueType`](TypeAlias.SkinValueType.md); \}

Schema entry for a single skin key. Bare type string short-form
 (`"main_color": "color"`) and full descriptor (`{ type, name, description }`)
 are both legal in the same `skins.schema` block.
