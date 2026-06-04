# Interface: Bridge

The control surface the widget hands your game factory (second argument).
 Use it to report a completed round, surface an error, or resize the frame.
 The widget owns the verification flow; the bridge is how your game talks
 back to it.

## Properties

| Property | Modifier | Type |
| ------ | ------ | ------ |
| <a id="layout"></a> `layout` | `readonly` | `Layout` \| `null` |

## Methods

### error() {#error}

> **error**(`err`): `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `err` | \{ `code`: `string`; `message?`: `string`; \} |
| `err.code` | `string` |
| `err.message?` | `string` |

#### Returns

`void`

***

### pass() {#pass}

> **pass**(`result`): `void`

Signal a completed round by handing the widget the OPAQUE TRACE of the
play. The trace is a serialized string the game alone defines
(the recorded inputs); the server re-runs the game's `run(seed, trace)` to
compute the authoritative verdict - the game does NOT report a score here.
Seed the run from `ctx.seed` so the live play and the server replay agree.
(The score, if any, is the game's own in-iframe UI concern.)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `result` | \{ `trace`: `string`; \} |
| `result.trace` | `string` |

#### Returns

`void`

***

### setSize() {#setsize}

> **setSize**(`width`, `height`): `void`

Tell the widget to resize the iframe to fit the game's content. Use
 this when your game can compute its viewport but doesn't use an
 intrinsic-sized root element (e.g. CSS-percentage layouts that auto-
 measure can't infer). The widget also auto-measures the game's first
 child after factory runs; this is the explicit escape hatch.

 Call AFTER your first paint. Calling repeatedly mid-session works but
 is discouraged; viewport changes during play are an antipattern.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `width` | `number` |
| `height` | `number` |

#### Returns

`void`
