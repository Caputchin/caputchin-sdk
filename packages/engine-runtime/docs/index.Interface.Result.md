# Interface: Result

What the engine reports when the game ends. `score` is the value the verdict
carries; `passed` is the engine's OWN pass/fail decision, read from the
terminal state (e.g. a goal reached, or a threshold the resolved config set).
Pass lives HERE, beside the state it judges, so the headless replay and the
live game share one decision site - never an external gate that one path can
compute differently.

## Properties

| Property | Modifier | Type |
| ------ | ------ | ------ |
| <a id="passed"></a> `passed` | `readonly` | `boolean` |
| <a id="score"></a> `score` | `readonly` | `number` |
