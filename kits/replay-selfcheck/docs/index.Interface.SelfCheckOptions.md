# Interface: SelfCheckOptions

Options for [selfCheck](index.Function.selfCheck.md).

## Extended by

- [`SelfCheckRunOptions`](index.Interface.SelfCheckRunOptions.md)

## Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| <a id="repeats"></a> `repeats?` | `readonly` | `number` | Number of identical re-runs used for the stability probe. A higher value catches flaky non-determinism more reliably at the cost of runtime. Defaults to `8`; minimum enforced is `2`. |
