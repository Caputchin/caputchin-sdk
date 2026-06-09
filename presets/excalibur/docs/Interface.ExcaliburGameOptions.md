# Interface: ExcaliburGameOptions

Options for [defineExcaliburGame](Function.defineExcaliburGame.md).

## Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| <a id="actions"></a> `actions?` | `readonly` | readonly `string`[] | Ordered named-action names (optional; pointer games may omit). The index is the wire code, so APPEND new actions, never reorder or remove. |
| <a id="height"></a> `height` | `readonly` | `number` | Fixed world height the sim reasons in. |
| <a id="maxticks"></a> `maxTicks` | `readonly` | `number` | Max sim ticks before a replay is declared truncated (and rejected). |
| <a id="width"></a> `width` | `readonly` | `number` | Fixed world width the sim reasons in (pointer coords are in this space). |
