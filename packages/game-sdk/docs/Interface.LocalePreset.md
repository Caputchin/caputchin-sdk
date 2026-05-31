# Interface: LocalePreset

One locale preset declared in `caputchin.json` under `locales.presets`.
 Underscore-prefixed keys are metadata; every other key is a translatable
 text token. A locale carries a `_lang` BCP-47 language tag; multiple
 presets may share a `_lang` (e.g. two English copy variants). Direction
 can be omitted and is auto-derived from `_lang` when the language is in
 the RTL set (ar, he, fa, ur, yi, ps, sd).

## Indexable

> \[`key`: `string`\]: `string` \| `boolean` \| `undefined`

## Properties

| Property | Type |
| ------ | ------ |
| <a id="_default"></a> `_default?` | `boolean` |
| <a id="_direction"></a> `_direction?` | `"ltr"` \| `"rtl"` |
| <a id="_extends"></a> `_extends?` | `string` |
| <a id="_lang"></a> `_lang?` | `string` |
