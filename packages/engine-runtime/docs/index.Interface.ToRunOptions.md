# Interface: ToRunOptions\<A\>

## Type Parameters

| Type Parameter |
| ------ |
| `A` |

## Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| <a id="maxticks"></a> `maxTicks` | `readonly` | `number` | Upper bound on ticks; a run that exceeds it is truncated and fails. |

## Methods

### decode()? {#decode}

> `optional` **decode**(`trace`): readonly [`TickInput`](index.Interface.TickInput.md)\<`A`\>[]

Decode the opaque trace into recorded inputs. Defaults to the kit's
[decodeTrace](index.Function.decodeTrace.md); supply your own to read a custom trace format.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `trace` | `string` \| `Uint8Array`\<`ArrayBufferLike`\> |

#### Returns

readonly [`TickInput`](index.Interface.TickInput.md)\<`A`\>[]
