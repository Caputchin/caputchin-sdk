# Class: CaputchinGame

`<caputchin-game>`; game host with optional cap verification.
  - sitekey present → cap.solve runs alongside the game.
  - sitekey absent → game-only (no verification, `pass` event carries
    `token: null`).

Layout drives rendering. Trigger is implicit per layout except for the
`trigger="manual"` escape hatch:
  - `inline` (default) → iframe up on mount, trigger=auto.
  - `modal` / `fullscreen` → checkbox entry, iframe opens on click.
  - `trigger="manual"` → no iframe; customer slots custom game DOM into
    the layout shell via the default `<slot>`. Methods `start` / `pass`
    / `fail` drive the lifecycle.

## Extends

- `HTMLElement`

## Constructors

### Constructor

> **new CaputchinGame**(): `CaputchinGame`

#### Returns

`CaputchinGame`

#### Inherited from

`HTMLElement.constructor`
