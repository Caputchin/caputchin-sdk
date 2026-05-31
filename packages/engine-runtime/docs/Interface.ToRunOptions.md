# Interface: ToRunOptions\<A\>

Options for [toRun](Function.toRun.md).

## Type Parameters

| Type Parameter |
| ------ |
| `A` |

## Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| <a id="maxticks"></a> `maxTicks` | `readonly` | `number` | Maximum number of fixed timesteps the replay loop may advance before declaring the run truncated and returning `passed: false`. Prevents a non-terminating engine from hanging the server isolate. Set this to a value safely above the longest legitimate play session; a typical 30-second game at [FIXED\_TIMESTEP\_MS](Variable.FIXED_TIMESTEP_MS.md) fits in ~1875 ticks. |

## Methods

### decode()? {#decode}

> `optional` **decode**(`trace`): readonly [`TickInput`](Interface.TickInput.md)\<`A`\>[]

Decode the opaque trace bytes into recorded inputs before replaying.
Defaults to the kit's built-in [decodeTrace](Function.decodeTrace.md) (matches the widget's
built-in encoder); supply your own function to read a custom trace format.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `trace` | `string` \| `Uint8Array`\<`ArrayBufferLike`\> | Raw trace blob as emitted by the live game. |

#### Returns

readonly [`TickInput`](Interface.TickInput.md)\<`A`\>[]

Ordered array of tick-stamped inputs to feed the replay loop.
