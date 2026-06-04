# Interface: MathRandomTrap

A seed-then-restore trap for `Math.random`, scoped to a stepped callback. Apply it
IDENTICALLY on both ends so any `Math.random` read inside the stepped sim consumes
the SAME seeded stream live and on the server.

## Methods

### reset() {#reset}

> **reset**(`seed`): `void`

(Re)seed the stream from the round seed. Call once at scene / world create,
 beside the gameplay RNG seeding.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `seed` | readonly `number`[] |

#### Returns

`void`

***

### run() {#run}

> **run**\<`T`\>(`fn`): `T`

Run `fn` with `Math.random` pointed at the seeded stream, then restore the real
 one (even if `fn` throws). The stream is CONTINUOUS across calls (each step
 advances it), so the Nth step consumes the same values both ends.

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `fn` | () => `T` |

#### Returns

`T`
