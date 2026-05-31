# Interface: SkinPreset

One skin preset declared in `caputchin.json` under `skins.presets`.
 Underscore-prefixed keys are metadata; every other key is a typed value
 (color string or asset URL/path). `_theme` defaults to `light` when
 absent. `_extends` may target a preset name OR a theme shortcut (`light` /
 `dark`) - the theme form resolves to that theme's `_default:true` preset.

## Indexable

> \[`key`: `string`\]: `string` \| `boolean` \| `undefined`

## Properties

| Property | Type |
| ------ | ------ |
| <a id="_default"></a> `_default?` | `boolean` |
| <a id="_extends"></a> `_extends?` | `string` |
| <a id="_theme"></a> `_theme?` | `"light"` \| `"dark"` |
