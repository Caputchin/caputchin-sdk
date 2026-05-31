# Interface: GameConfig

Game widget config. Verification (the cap gate) runs when a sitekey is
 present AND `no-verify` is not set. The two
 concerns are orthogonal: the sitekey is the tenant key that unlocks the
 bootstrap fetch (overrides + marketplace bundle resolution), while
 `no-verify` opts out of the gate. So a game-only widget can still supply a
 sitekey to receive overrides - it just skips the cap solve. With no sitekey
 there is nothing to verify against, so `no-verify` is implied.
 When `trigger === 'manual'`, no iframe mounts; customer slots custom
 game DOM via the default `<slot>` inside the layout shell and drives
 completion via `pass()` / `fail()`.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="game"></a> `game` | `string` \| `null` | The `game` attribute: a single marketplace game id (`owner/repo`, or `owner/repo/leaf`), resolved to a bundle server-side. |
| <a id="games"></a> `games` | `string` \| `null` | The `games` attribute: a comma-separated list of marketplace game ids; the widget picks one at random per session. |
| <a id="gamesrc"></a> `gameSrc` | `string` \| `null` | The `game-src` attribute: a URL to a game bundle you host yourself (HTTPS, or http loopback in local dev), bypassing marketplace resolution. |
| <a id="height"></a> `height` | [`WidgetHeight`](TypeAlias.WidgetHeight.md) | Frame height: omitted/`null` (auto), `full` (span the parent), or a positive pixel number. |
| <a id="layout"></a> `layout` | [`LayoutAttr`](TypeAlias.LayoutAttr.md) | Default `auto`; defers to manifest/breakpoint. `inline | modal | fullscreen` are explicit. |
| <a id="locale"></a> `locale` | `string` \| `null` | Raw `locale` attribute value (un-resolved). Sent to the server as this mount's language signal; the server resolves it against the game's manifest presets plus the scope's overrides and returns the resolved preset. Unlike the shell, the game also accepts an inline JSON object here, which the server parses and layers on top of the resolved presets. Null when omitted or empty. |
| <a id="noverify"></a> `noVerify` | `boolean` | Boolean `no-verify` attribute: skip the cap gate but keep everything else (bootstrap overrides, marketplace resolve, the game itself). Implied true when there's no sitekey. |
| <a id="sitekey"></a> `sitekey` | `string` \| `null` | Your public site key. Unlocks the bootstrap fetch (overrides plus marketplace bundle resolution) and, unless `no-verify` is set, the cap gate. `null` runs the game with no verification (game-only). |
| <a id="skin"></a> `skin` | `string` \| `null` | Raw `skin` attribute value (un-resolved). Sent to the server as this mount's skin signal and resolved there against the game's manifest skins plus the scope's overrides; like locale, the game also accepts an inline JSON object (the shell does not). Also drives the widget shell's skin (the shell consumes only `_theme`). Null when omitted or empty. |
| <a id="trigger"></a> `trigger` | [`GameTrigger`](TypeAlias.GameTrigger.md) | Only `manual` is settable here: you slot custom game DOM as children and drive completion via `pass()` / `fail()`. Every other trigger is derived from the layout, so this is `null` unless manual. |
| <a id="width"></a> `width` | [`WidgetWidth`](TypeAlias.WidgetWidth.md) | Frame width: `auto` (size to content), `full` (span the parent), or a positive pixel number. |
