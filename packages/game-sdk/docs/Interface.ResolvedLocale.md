# Interface: ResolvedLocale

Final locale object the widget hands the game. `_extends` and
 `_default` are stripped during resolution; only metadata (`_lang`,
 `_direction`) and text tokens survive. The language-tag key was renamed
 from `_iso` to `_lang` after v2.0.0; read `_lang`.

## Indexable

> \[`key`: `string`\]: `string`

## Properties

| Property | Type |
| ------ | ------ |
| <a id="_direction"></a> `_direction` | `"ltr"` \| `"rtl"` |
| <a id="_lang"></a> `_lang` | `string` |
