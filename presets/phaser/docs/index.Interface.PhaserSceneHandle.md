# Interface: PhaserSceneHandle

A built replay scene: the Phaser scene config plus readers for the verdict.
 The scene's `create()` MUST subscribe its per-tick logic to the Arcade
 `worldstep` event (use [onWorldStep](index.Function.onWorldStep.md)), advancing one action per step, so
 the headless replay tracks the live recording exactly.

## Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| <a id="scene"></a> `scene` | `readonly` | `object` | A Phaser scene config object (at least `create`). |

## Methods

### isOver() {#isover}

> **isOver**(): `boolean`

True once the round has ended.

#### Returns

`boolean`

***

### result() {#result}

> **result**(): `object`

The terminal score + pass decision.

#### Returns

`object`

| Name | Type |
| ------ | ------ |
| `passed` | `boolean` |
| `score` | `number` |

***

### tickCount() {#tickcount}

> **tickCount**(): `number`

How many fixed physics steps have elapsed (the scene's worldstep counter).

#### Returns

`number`
