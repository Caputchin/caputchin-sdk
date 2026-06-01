# Interface: SkinPreset

One skin preset declared in `caputchin.json` under `skins.presets`.
 Underscore-prefixed keys are metadata; every other key is a typed value
 (color string or asset URL/path).

 `_theme` is the mode the preset is eligible for: `light` shows only in
 light mode, `dark` only in dark, `any` works in both. Omitting `_theme`
 means `any` (the preset reads on either background). `_default: true`
 marks the preset as the default for the mode(s) it is eligible for, so an
 `any` default covers both light and dark. When more than one eligible
 preset is flagged default for a mode, declaration order wins (the first
 listed takes that mode), so an author can give a `dark` preset the dark
 slot and let an `any` preset fall through to light by listing the `dark`
 one first. `_extends` may target a preset name OR a mode shortcut (`light`
 / `dark`), which resolves to that mode's default preset.

## Indexable

> \[`key`: `string`\]: `string` \| `number` \| `boolean` \| `undefined`

## Properties

| Property | Type |
| ------ | ------ |
| <a id="_default"></a> `_default?` | `boolean` |
| <a id="_extends"></a> `_extends?` | `string` |
| <a id="_theme"></a> `_theme?` | `"light"` \| `"dark"` \| `"any"` |
