# Interface: ReplayOutcome

Authoritative outcome of a replay run.

## Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| <a id="durationms"></a> `durationMs` | `readonly` | `number` | - |
| <a id="endtick"></a> `endTick` | `readonly` | `number` | Tick at which the engine reported game-over (or `maxTicks` if it never did). |
| <a id="passed"></a> `passed` | `readonly` | `boolean` | The engine's pass decision off the terminal state (before the truncated guard). |
| <a id="score"></a> `score` | `readonly` | `number` | - |
| <a id="truncated"></a> `truncated` | `readonly` | `boolean` | True if the engine hit `maxTicks` without ending - a rejectable run. |
