# Interface: ErrorEventDetail

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="code"></a> `code` | [`ErrorCode`](TypeAlias.ErrorCode.md) | Stable code you branch on (for example `invalid-config`, `verification-failed`, `game-load-failed`). |
| <a id="message"></a> `message` | `string` | Human-readable description of what happened. |
| <a id="originalcode"></a> `originalCode?` | `string` | Present when `code` is a generalization of a more specific internal reason; carries that raw reason for diagnostics only. |
| <a id="severity"></a> `severity` | [`ErrorSeverity`](TypeAlias.ErrorSeverity.md) | `warn` for graceful-degradation paths (invalid-config, invalid-call); `error` for hard failures (verification-failed, game-load-failed, gate-unavailable, game-error-relayed). Customers filter via this without keying off codes. |
