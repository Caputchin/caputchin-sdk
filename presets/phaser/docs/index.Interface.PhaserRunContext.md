# Interface: PhaserRunContext\<Action, C\>

What the driver gives the replay scene for a round.

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `Action` | - |
| `C` | `unknown` |

## Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| <a id="actions"></a> `actions` | `readonly` | readonly `Action`[] | The decoded per-tick actions (index = fixed-physics-step / worldstep). |
| <a id="config"></a> `config` | `readonly` | `C` \| `null` | Server-resolved config, or `null` for the sim's defaults. |
| <a id="seed"></a> `seed` | `readonly` | `Seed` | The round seed (server-derived). |
| <a id="trap"></a> `trap` | `readonly` | [`MathRandomTrap`](index.Interface.MathRandomTrap.md) | Seeded `Math.random` trap, pre-reset to `seed`. Wrap the stepped sim (the onWorldStep callback) in `trap.run(...)` - and do the IDENTICAL wrap on the live side - so any raw `Math.random` read in the step is symmetric live vs replay. A no-op if the sim only uses the seeded gameplay RNG. |
