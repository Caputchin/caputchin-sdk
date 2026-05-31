# Type Alias: ConfigSchemaEntry

> **ConfigSchemaEntry** = `"string"` \| `"link"` \| `"boolean"` \| `"number"` \| readonly `string`[] \| \{ `description?`: `string`; `name?`: `string`; `type`: `"string"` \| `"link"` \| `"boolean"` \| `"number"`; \} \| \{ `description?`: `string`; `name?`: `string`; `type`: `"list"`; `values`: readonly `string`[]; \} \| \{ `description?`: `string`; `max`: `number`; `min`: `number`; `name?`: `string`; `step?`: `number`; `type`: `"range"`; \}

Schema entry for a single configuration key. Three legal shapes:

  - Bare type string (`"show_high_score": "boolean"`) - short-form for
    types that need no extra metadata: `string`, `link`, `boolean`,
    `number`. `range` and `list` REQUIRE full forms because they carry
    constraint data (bounds, enum).
  - Array literal as enum (`"levels": ["a","b","c"]`) - short-form for
    `list` type. Value must equal one of the array entries exactly.
  - Full descriptor (`{ type, name?, description?, ... }`) - every type
    accepts this form. `list` uses `{ type:"list", values:[…] }`,
    `range` uses `{ type:"range", min, max, step? }`.
