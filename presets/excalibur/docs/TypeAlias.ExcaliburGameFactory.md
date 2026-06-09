# Type Alias: ExcaliburGameFactory

> **ExcaliburGameFactory** = (`engine`, `api`) => `void`

The author's game builder: set up the scene (sim always; render guarded by
 `api.headless`), then register `api.onTick` sim logic and (live) wire input.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `engine` | `Engine` |
| `api` | [`ExcaliburGameApi`](Interface.ExcaliburGameApi.md) |

## Returns

`void`
