# Interface: WidgetConfig

Cap widget config. The widget has two visual forms:
 - default: checkbox + brand strip (visible).
 - `invisible` attribute set: no DOM at all; verification still runs per trigger.

 There is no enum-style `mode` attribute; `invisible` is a boolean HTML
 attribute (same shape as `<input disabled>` / `<details open>`).

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="height"></a> `height` | [`WidgetHeight`](TypeAlias.WidgetHeight.md) | Widget height: omitted/`null` is auto, `full` spans the parent, or a positive pixel number fixes it. |
| <a id="invisible"></a> `invisible` | `boolean` | When present, the widget renders no visible UI; verification still runs per `trigger`. The default visible form is a checkbox with a brand strip. |
| <a id="locale"></a> `locale` | `string` \| `null` | Raw `locale` attribute value. Resolved against the widget's bundled shell presets at mount. On this shell widget the attribute is a selector only: preset names + ISO codes are accepted, inline JSON is rejected. This is a shell-specific choice (resolver flag `rejectInlineJson`), NOT a global widget rule; the game widget (`<caputchin-game>`) deliberately accepts inline-JSON locale so authors can hand-author a custom game locale on the attribute. The shell pushes custom authoring to CSS / server-served overrides instead. Omitted/empty means browser auto. |
| <a id="sitekey"></a> `sitekey` | `string` | Your public site key. Required: without it the widget stays inert and emits a `warn`-severity `error` event. This is the public key, not your API secret. |
| <a id="size"></a> `size` | [`WidgetSize`](TypeAlias.WidgetSize.md) | Visual density of the checkbox widget: `normal` (standard) or `compact` (smaller). |
| <a id="skin"></a> `skin` | `string` \| `null` | Raw `skin` attribute value. Resolved against the widget's bundled skin presets at mount. Selector only on this shell widget: `<mode>` / `auto` / `<skin-name>` are accepted, inline JSON is rejected (`rejectInlineJson`). Same shell-specific scope as `locale` above: the game widget accepts inline-JSON skin, the shell does not, since the shell chrome is already CSS-styleable (`--cpt-skin-*` + `::part()`) and white-labelable. Omitted/empty means auto (honors `prefers-color-scheme`). |
| <a id="trigger"></a> `trigger` | [`WidgetTrigger`](TypeAlias.WidgetTrigger.md) | When verification begins: `auto` on mount, `click` on the checkbox, `form-submit` when the enclosing form submits or the checkbox is clicked (a click verifies in place without submitting the form), or `manual` when you call `start()` yourself. |
| <a id="width"></a> `width` | [`WidgetWidth`](TypeAlias.WidgetWidth.md) | Widget width: `auto` sizes to content, `full` spans the parent, or a positive pixel number fixes it. |
