# Interface: SelfCheckRunOptions

Options for [selfCheckRun](index.Function.selfCheckRun.md).

## Extends

- [`SelfCheckOptions`](index.Interface.SelfCheckOptions.md)

## Properties

| Property | Modifier | Type | Description | Inherited from |
| ------ | ------ | ------ | ------ | ------ |
| <a id="emptytrace"></a> `emptyTrace?` | `readonly` | `string` \| `Uint8Array`\<`ArrayBufferLike`\> | The "no inputs" trace representation (see [smokeCase](index.Function.smokeCase.md)). Defaults to `''`. | - |
| <a id="repeats"></a> `repeats?` | `readonly` | `number` | Number of identical re-runs used for the stability probe. A higher value catches flaky non-determinism more reliably at the cost of runtime. Defaults to `8`; minimum enforced is `2`. | [`SelfCheckOptions`](index.Interface.SelfCheckOptions.md).[`repeats`](index.Interface.SelfCheckOptions.md#repeats) |
| <a id="seeds"></a> `seeds?` | `readonly` | readonly `Seed`[] | Seeds to probe (each over the empty trace). Defaults to [DEFAULT\_SEEDS](index.Variable.DEFAULT_SEEDS.md). | - |
