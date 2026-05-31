# Type Alias: ErrorCode

> **ErrorCode** = `"invalid-config"` \| `"invalid-call"` \| `"verification-failed"` \| `"game-load-failed"` \| `"gate-unavailable"` \| `"game-error-relayed"`

Stable code on the `error` event's `detail.code`, the value you branch on.
 `invalid-config` (a rejected attribute) and `invalid-call` (a method called
 when not valid) are graceful warnings; `verification-failed`,
 `game-load-failed`, `gate-unavailable`, and `game-error-relayed` are hard
 failures. Each has a default [ErrorSeverity](TypeAlias.ErrorSeverity.md).
