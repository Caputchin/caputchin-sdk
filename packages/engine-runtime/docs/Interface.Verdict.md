# Interface: Verdict

The output of a replay `run`, and the only thing we read from it. `passed`
drives the captcha decision; `score` and `durationMs` are carried in the
issued token (and a future scoreboard). The shape is OURS; everything else
about the run - the engine, the trace, the renderer - is the customer's.

## Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| <a id="durationms"></a> `durationMs` | `readonly` | `number` | Engine-reported play duration in milliseconds. Must be finite and non-negative. |
| <a id="passed"></a> `passed` | `readonly` | `boolean` | Captcha decision: `true` if the player cleared the game according to the engine's own pass logic. |
| <a id="score"></a> `score` | `readonly` | `number` | Game-defined final score. Any finite number; not bounded by the platform. |
