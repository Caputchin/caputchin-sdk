# Type Alias: ErrorSeverity

> **ErrorSeverity** = `"warn"` \| `"error"`

Severity on the `error` event's `detail.severity`: `warn` (the widget
 degraded but kept running) or `error` (something actually broke). Read it
 to filter the two without hardcoding a code-to-severity table.
