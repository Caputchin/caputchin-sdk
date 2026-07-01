# Type Alias: WidgetTrigger

> **WidgetTrigger** = `"auto"` \| `"click"` \| `"form-submit"` \| `"manual"`

When the widget starts verification. `auto`: on mount. `click`: when the
 visitor activates the checkbox. `form-submit`: when the enclosing `<form>`
 submits, or when the visitor clicks the checkbox (a click verifies in place
 without submitting the form). `manual`: only when you call `start()`.
