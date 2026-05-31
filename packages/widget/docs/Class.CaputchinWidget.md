# Class: CaputchinWidget

`<caputchin-widget>`; cap PoW + instrumentation only. Default renders
the Caputchin checkbox + brand strip. Add the `invisible` boolean
attribute to mount no UI (verification still runs per trigger). For
games, use `<caputchin-game>` instead.

Mount is two-phase: synchronous prep (config inspection,
shadow attach, bundled cascade for hint extraction) followed by an
async bootstrap fetch (with a 2s hard timeout). First paint blocks until
bootstrap resolves; bundled fallback applies on timeout / network error.

## Extends

- `HTMLElement`

## Constructors

### Constructor

> **new CaputchinWidget**(): `CaputchinWidget`

#### Returns

`CaputchinWidget`

#### Inherited from

`HTMLElement.constructor`

## Properties

| Property | Modifier | Type |
| ------ | ------ | ------ |
| <a id="observedattributes"></a> `observedAttributes` | `static` | `string`[] |

## Methods

### attributeChangedCallback() {#attributechangedcallback}

> **attributeChangedCallback**(`name`, `oldValue`, `_newValue`): `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |
| `oldValue` | `string` \| `null` |
| `_newValue` | `string` \| `null` |

#### Returns

`void`

***

### connectedCallback() {#connectedcallback}

> **connectedCallback**(): `void`

#### Returns

`void`

***

### disconnectedCallback() {#disconnectedcallback}

> **disconnectedCallback**(): `void`

#### Returns

`void`
