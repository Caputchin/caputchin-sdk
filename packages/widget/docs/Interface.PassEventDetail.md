# Interface: PassEventDetail

Payload of the `pass` event, fired when verification is released.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="durationms"></a> `durationMs` | `number` \| `null` | Client-reported solve duration in milliseconds, for analytics only. May be `null`. |
| <a id="score"></a> `score` | `number` \| `null` | Client-reported score, for analytics only. May be `null`. Never a trust signal: the gate is the server's replay, not this value. |
| <a id="token"></a> `token` | `string` \| `null` | Wrapped token; null on `caputchin-game` without sitekey (game-only). |
