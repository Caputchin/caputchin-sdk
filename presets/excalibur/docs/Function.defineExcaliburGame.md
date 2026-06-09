# Function: defineExcaliburGame()

> **defineExcaliburGame**(`factory`, `options`): [`ExcaliburGame`](Interface.ExcaliburGame.md)

Declare an Excalibur game once; mount it live with [mountExcaliburGame](Function.mountExcaliburGame.md) and
replay it headless with [excaliburRun](Function.excaliburRun.md). Both ends run the SAME factory over
the SAME fixed-dt ticks, so the live result and the server verdict agree by
construction.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `factory` | [`ExcaliburGameFactory`](TypeAlias.ExcaliburGameFactory.md) |
| `options` | [`ExcaliburGameOptions`](Interface.ExcaliburGameOptions.md) |

## Returns

[`ExcaliburGame`](Interface.ExcaliburGame.md)
