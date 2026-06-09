# Interface: PumpResult

## Extends

- `Outcome`

## Properties

| Property | Modifier | Type | Description | Inherited from |
| ------ | ------ | ------ | ------ | ------ |
| <a id="durationms"></a> `durationMs` | `readonly` | `number` | - | - |
| <a id="over"></a> `over` | `public` | `boolean` | Round ended (gameOver latched). | `Outcome.over` |
| <a id="passed"></a> `passed` | `public` | `boolean` | - | `Outcome.passed` |
| <a id="score"></a> `score` | `public` | `number` | - | `Outcome.score` |
| <a id="tick"></a> `tick` | `public` | `number` | Number of fixed ticks run so far (also the next tick index). | `Outcome.tick` |
| <a id="truncated"></a> `truncated` | `readonly` | `boolean` | The replay hit the tick ceiling without the sim ending (always a fail). | - |
