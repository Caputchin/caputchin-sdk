# Interface: CaputchinGameShape

Public shape of `<caputchin-game>`; game host with optional verification.
 No `start()`; verification auto-kicks on mount for inline, on first
 dialog open for modal/fullscreen.

## Extends

- `HTMLElement`

## Methods

### addEventListener() {#addeventlistener}

#### Call Signature

> **addEventListener**\<`K`\>(`type`, `listener`, `options?`): `void`

##### Type Parameters

| Type Parameter |
| ------ |
| `K` *extends* keyof [`CaputchinEventMap`](Interface.CaputchinEventMap.md) |

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `type` | `K` |
| `listener` | (`this`, `ev`) => `void` |
| `options?` | `boolean` \| `AddEventListenerOptions` |

##### Returns

`void`

##### Overrides

`HTMLElement.addEventListener`

#### Call Signature

> **addEventListener**(`type`, `listener`, `options?`): `void`

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `type` | `string` |
| `listener` | `EventListenerOrEventListenerObject` |
| `options?` | `boolean` \| `AddEventListenerOptions` |

##### Returns

`void`

##### Overrides

`HTMLElement.addEventListener`

***

### fail() {#fail}

> **fail**(`payload?`): `void`

Manual mode only; abort cap verification + fire `game-error-relayed`.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `payload?` | \{ `code?`: `string`; `message?`: `string`; \} |
| `payload.code?` | `string` |
| `payload.message?` | `string` |

#### Returns

`void`

***

### pass() {#pass}

> **pass**(`payload?`): `void`

Manual mode (`trigger="manual"`) only; release the cap gate with the
 game payload and fire the `pass` event.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `payload?` | \{ `durationMs?`: `number` \| `null`; `score?`: `number` \| `null`; \} |
| `payload.durationMs?` | `number` \| `null` |
| `payload.score?` | `number` \| `null` |

#### Returns

`void`

***

### removeEventListener() {#removeeventlistener}

#### Call Signature

> **removeEventListener**\<`K`\>(`type`, `listener`, `options?`): `void`

##### Type Parameters

| Type Parameter |
| ------ |
| `K` *extends* keyof [`CaputchinEventMap`](Interface.CaputchinEventMap.md) |

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `type` | `K` |
| `listener` | (`this`, `ev`) => `void` |
| `options?` | `boolean` \| `EventListenerOptions` |

##### Returns

`void`

##### Overrides

`HTMLElement.removeEventListener`

#### Call Signature

> **removeEventListener**(`type`, `listener`, `options?`): `void`

##### Parameters

| Parameter | Type |
| ------ | ------ |
| `type` | `string` |
| `listener` | `EventListenerOrEventListenerObject` |
| `options?` | `boolean` \| `EventListenerOptions` |

##### Returns

`void`

##### Overrides

`HTMLElement.removeEventListener`

***

### setNickname() {#setnickname}

> **setNickname**(`letters`): `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `letters` | `string` |

#### Returns

`void`
