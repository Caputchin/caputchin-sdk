# Interface: ResolvedSkin

Final skin object the widget hands the game. `_extends` and `_default`
 are stripped during resolution; `_theme` plus the flattened typed keys
 survive. Asset URLs are already resolved to absolute form (bundle-base
 relative paths joined; `data:` URIs verbatim).

## Indexable

> \[`key`: `string`\]: `string`

## Properties

| Property | Type |
| ------ | ------ |
| <a id="_theme"></a> `_theme` | `"light"` \| `"dark"` |
