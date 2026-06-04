# Interface: KaplayShim

A handle to an installed shim: the canvas KAPLAY draws into, plus loop control.

## Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| <a id="canvas"></a> `canvas` | `readonly` | `object` | The fake canvas to pass as `kaplay({ canvas })` (an opaque stub; cast to `HTMLCanvasElement` at the call site). |

## Methods

### flushFrame() {#flushframe}

> **flushFrame**(`tMs`): `void`

Run the latest pending rAF callback with timestamp `tMs` (ms). No-op if none pending.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `tMs` | `number` |

#### Returns

`void`

***

### hasPendingFrame() {#haspendingframe}

> **hasPendingFrame**(): `boolean`

Whether a frame callback is currently armed.

#### Returns

`boolean`

***

### uninstall() {#uninstall}

> **uninstall**(): `void`

Restore the globals this shim replaced.

#### Returns

`void`
