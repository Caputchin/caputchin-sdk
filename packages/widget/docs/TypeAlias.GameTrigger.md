# Type Alias: GameTrigger

> **GameTrigger** = `"manual"` \| `null`

Only manual is a customer-settable trigger on the game widget. All other
 triggers are layout-derived (inline → auto, modal/fullscreen → click).
 Manual is the escape hatch; no iframe; the customer hosts the game in
 their own DOM and slots it into the layout shell.
