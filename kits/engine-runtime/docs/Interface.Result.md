# Interface: Result

What the engine reports when the game ends. `score` is the value the verdict
carries; `passed` is the engine's OWN pass/fail decision, read from the
terminal state (e.g. a goal reached, or a threshold the resolved config set).
Pass lives HERE, beside the state it judges, so the headless replay and the
live game share one decision site - never an external gate that one path can
compute differently.

## Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| <a id="passed"></a> `passed` | `readonly` | `boolean` | The engine's own pass decision from the terminal state (e.g. a score threshold or goal reached). `toRun` ANDs this with the non-truncated guard before emitting the [Verdict](Interface.Verdict.md). |
| <a id="score"></a> `score` | `readonly` | `number` | Game-defined final score. Any finite number; not bounded by the platform. |
