# Interface: ReplayInput\<A, C\>

Inputs to a single replay run.

## Type Parameters

| Type Parameter |
| ------ |
| `A` |
| `C` |

## Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| <a id="actions"></a> `actions` | `readonly` | readonly [`TickInput`](Interface.TickInput.md)\<`A`\>[] | Tick-stamped player inputs to apply during replay, in recorded order. |
| <a id="config"></a> `config` | `readonly` | `C` \| `null` | Server-resolved gameplay config passed straight to `init`. `null` means use the engine's own defaults. |
| <a id="maxticks"></a> `maxTicks` | `readonly` | `number` | Maximum ticks before the loop stops and marks the run as [ReplayOutcome.truncated](Interface.ReplayOutcome.md#truncated). Guards against a non-terminating engine. |
| <a id="seed"></a> `seed` | `readonly` | [`Seed`](TypeAlias.Seed.md) | Per-round seed the engine's `init` receives to initialize its PRNG and starting state. |
