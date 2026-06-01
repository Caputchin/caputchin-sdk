# Interface: ResolvedSkin

Final skin object the widget hands the game (as `ctx.skin`). `_extends` and
 `_default` are stripped during resolution; the flattened typed keys survive.
 Color values are strings and asset URLs are already resolved to absolute form
 (bundle-base relative paths joined; `data:` URIs verbatim). Scalar keys
 (`boolean` / `number` / `range` / `list`) arrive as their typed value, the
 same as `ResolvedConfig` (a `boolean` is `true`, a `number` is `8`); hence
 the value union widens to `string | boolean | number`. `_theme` is always the
 concrete mode the skin was resolved for (`light` or `dark`, never `any`): an
 `any` preset reports the visitor's actual mode so the surrounding chrome
 stays in step.

## Indexable

> \[`key`: `string`\]: `string` \| `number` \| `boolean`

## Properties

| Property | Type |
| ------ | ------ |
| <a id="_theme"></a> `_theme` | `"light"` \| `"dark"` |
