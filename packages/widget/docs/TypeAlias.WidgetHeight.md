# Type Alias: WidgetHeight

> **WidgetHeight** = `"full"` \| `number` \| `null`

`null` means "auto" - defer to the game's preferredHeight (if any) or
 the widget default. `'full'` spans the parent (and, for game widgets in
 overlay layouts, stretches the iframe vertically inside the dialog).
 A positive number is an explicit pixel value.
