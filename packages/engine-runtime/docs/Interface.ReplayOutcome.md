# Interface: ReplayOutcome

Authoritative outcome of a replay run produced by [replay](Function.replay.md).

## Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| <a id="durationms"></a> `durationMs` | `readonly` | `number` | Play duration in milliseconds, derived as `endTick * FIXED_TIMESTEP_MS`. |
| <a id="endtick"></a> `endTick` | `readonly` | `number` | Tick at which the engine reported game-over, or `maxTicks` if it never terminated. |
| <a id="passed"></a> `passed` | `readonly` | `boolean` | The engine's own pass decision from the terminal state (before the `truncated` guard is ANDed in). |
| <a id="score"></a> `score` | `readonly` | `number` | Final score read from the engine's terminal state via `engine.result`. |
| <a id="truncated"></a> `truncated` | `readonly` | `boolean` | `true` if the engine reached `maxTicks` without reporting game-over. A truncated run is always rejectable. |
