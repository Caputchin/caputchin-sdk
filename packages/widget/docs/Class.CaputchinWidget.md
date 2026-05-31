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
