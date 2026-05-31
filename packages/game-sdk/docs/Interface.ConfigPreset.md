# Interface: ConfigPreset

One configuration preset declared in `caputchin.json` under
 `configurations.presets`. Underscore-prefixed keys are metadata; every
 other key is a typed value. Unlike skins / langs, the value can be a
 boolean or a number (not just a string).

## Indexable

> \[`key`: `string`\]: `string` \| `number` \| `boolean` \| `undefined`

## Properties

| Property | Type |
| ------ | ------ |
| <a id="_default"></a> `_default?` | `boolean` |
| <a id="_extends"></a> `_extends?` | `string` |
