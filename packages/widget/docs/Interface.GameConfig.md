# Interface: GameConfig

Game widget config. Verification (the cap gate) runs when a sitekey is
 present AND `no-verify` is not set - see shouldVerify. The two
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
| <a id="game"></a> `game` | `string` \| `null` | - |
| <a id="games"></a> `games` | `string` \| `null` | - |
| <a id="gamesrc"></a> `gameSrc` | `string` \| `null` | - |
| <a id="height"></a> `height` | [`WidgetHeight`](TypeAlias.WidgetHeight.md) | - |
| <a id="layout"></a> `layout` | [`LayoutAttr`](TypeAlias.LayoutAttr.md) | Default `auto`; defers to manifest/breakpoint. `inline | modal | fullscreen` are explicit. |
| <a id="locale"></a> `locale` | `string` \| `null` | Raw `locale` attribute value (un-resolved). Sent to the server as this mount's language signal; the server resolves it against the game's manifest presets plus the scope's overrides and returns the resolved preset. Unlike the shell, the game also accepts an inline JSON object here, which the server parses and layers on top of the resolved presets. Null when omitted or empty. |
| <a id="noverify"></a> `noVerify` | `boolean` | Boolean `no-verify` attribute: skip the cap gate but keep everything else (bootstrap overrides, marketplace resolve, the game itself). Implied true when there's no sitekey. |
| <a id="sitekey"></a> `sitekey` | `string` \| `null` | - |
| <a id="skin"></a> `skin` | `string` \| `null` | Raw `skin` attribute value (un-resolved). Sent to the server as this mount's skin signal and resolved there against the game's manifest skins plus the scope's overrides; like locale, the game also accepts an inline JSON object (the shell does not). Also drives the widget shell's skin (the shell consumes only `_theme`). Null when omitted or empty. |
| <a id="trigger"></a> `trigger` | `GameTrigger` | - |
| <a id="width"></a> `width` | [`WidgetWidth`](TypeAlias.WidgetWidth.md) | - |
