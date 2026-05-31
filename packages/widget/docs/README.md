# @caputchin/widget

## Classes

| Class | Description |
| ------ | ------ |
| [CaputchinGame](Class.CaputchinGame.md) | `<caputchin-game>`; game host with optional cap verification. - sitekey present → cap.solve runs alongside the game. - sitekey absent → game-only (no verification, `pass` event carries `token: null`). |
| [CaputchinWidget](Class.CaputchinWidget.md) | `<caputchin-widget>`; cap PoW + instrumentation only. Default renders the Caputchin checkbox + brand strip. Add the `invisible` boolean attribute to mount no UI (verification still runs per trigger). For games, use `<caputchin-game>` instead. |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [CaputchinEventMap](Interface.CaputchinEventMap.md) | Map of every event the Caputchin widget elements emit to its `CustomEvent` type. |
| [CaputchinGameShape](Interface.CaputchinGameShape.md) | Public shape of `<caputchin-game>`; game host with optional verification. No `start()`; verification auto-kicks on mount for inline, on first dialog open for modal/fullscreen. |
| [CaputchinWidgetShape](Interface.CaputchinWidgetShape.md) | Public shape of `<caputchin-widget>`; cap verification only. |
| [DialogVisibilityDetail](Interface.DialogVisibilityDetail.md) | Payload of the `dialog-shown` / `dialog-hidden` events (game overlay layouts). |
| [ErrorEventDetail](Interface.ErrorEventDetail.md) | Payload of the `error` event, spanning benign config warnings to hard failures. |
| [GameConfig](Interface.GameConfig.md) | Game widget config. Verification (the cap gate) runs when a sitekey is present AND `no-verify` is not set - see shouldVerify. The two concerns are orthogonal: the sitekey is the tenant key that unlocks the bootstrap fetch (overrides + marketplace bundle resolution), while `no-verify` opts out of the gate. So a game-only widget can still supply a sitekey to receive overrides - it just skips the cap solve. With no sitekey there is nothing to verify against, so `no-verify` is implied. When `trigger === 'manual'`, no iframe mounts; customer slots custom game DOM via the default `<slot>` inside the layout shell and drives completion via `pass()` / `fail()`. |
| [LayoutResolvedEventDetail](Interface.LayoutResolvedEventDetail.md) | Payload of the `layout-resolved` event: the layout the widget settled on and why. |
| [NicknameEventDetail](Interface.NicknameEventDetail.md) | Payload of the `nickname` event. |
| [PassEventDetail](Interface.PassEventDetail.md) | Payload of the `pass` event, fired when verification is released. |
| [StartEventDetail](Interface.StartEventDetail.md) | Payload (`event.detail`) of the `start` event, fired when verification begins. |
| [WidgetConfig](Interface.WidgetConfig.md) | Cap widget config. The widget has two visual forms: - default: checkbox + brand strip (visible). - `invisible` attribute set: no DOM at all; verification still runs per trigger. |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [ErrorCode](TypeAlias.ErrorCode.md) | - |
| [ErrorSeverity](TypeAlias.ErrorSeverity.md) | - |
| [Layout](TypeAlias.Layout.md) | - |
| [LayoutAttr](TypeAlias.LayoutAttr.md) | - |
| [LayoutSource](TypeAlias.LayoutSource.md) | - |
| [WidgetHeight](TypeAlias.WidgetHeight.md) | `null` means "auto" - defer to the game's preferredHeight (if any) or the widget default. `'full'` spans the parent (and, for game widgets in overlay layouts, stretches the iframe vertically inside the dialog). A positive number is an explicit pixel value. |
| [WidgetSize](TypeAlias.WidgetSize.md) | Visual density of the checkbox widget. `normal` is the standard size; `compact` is a smaller variant. |
| [WidgetTrigger](TypeAlias.WidgetTrigger.md) | When the widget starts verification. `auto`: on mount. `click`: when the visitor activates the checkbox. `form-submit`: when the enclosing `<form>` submits. `manual`: only when you call `start()`. |
| [WidgetWidth](TypeAlias.WidgetWidth.md) | `auto` (default) sizes to content. `full` spans the parent. A positive number is an explicit pixel value that overrides both (and any game preferredWidth). |
