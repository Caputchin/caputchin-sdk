# Interface: CaputchinWidgetShape

Public shape of `<caputchin-widget>`; cap verification only.

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

### start() {#start}

> **start**(): `void`

#### Returns

`void`
