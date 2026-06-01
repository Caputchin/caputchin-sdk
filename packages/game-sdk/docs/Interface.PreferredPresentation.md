# Interface: PreferredPresentation

The game's preferred presentation, declared under `preferred` in
 `caputchin.json`. Every key is an advisory hint the host MAY honor, not a
 hard requirement.

 `width` / `height`: the widget sizes the iframe to these when the customer
 leaves the embed's `width` / `height` unset (a `full` customer value
 stretches that axis instead). Each is a positive pixel count, or the literal
 `"full"` to stretch that axis to fill the parent (the same effect an embed
 `width="full"` has, applied only when the embed leaves that axis unset). Omit
 to fall back to the widget's built-in default footprint.

 `layout`: the shell the widget builds around the game (an inline panel, a
 modal dialog, or a fullscreen overlay). The widget uses it only when the
 embed leaves `layout` unset (the default `auto`); an explicit embed
 `layout` overrides it. Resolution order: embed `layout` attribute, then this
 preferred layout, then `inline`. Honored only for games the platform
 resolves server-side (marketplace games, or a game id given without a site
 key); a customer-hosted `game-src` bundle the platform cannot read ahead of
 mount ignores this hint, the same way it ignores the preferred footprint.

## Properties

| Property | Type |
| ------ | ------ |
| <a id="height"></a> `height?` | `number` \| `"full"` |
| <a id="layout"></a> `layout?` | [`Layout`](TypeAlias.Layout.md) |
| <a id="width"></a> `width?` | `number` \| `"full"` |
