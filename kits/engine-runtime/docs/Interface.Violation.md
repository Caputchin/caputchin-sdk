# Interface: Violation

A single determinism violation found during [selfCheck](Function.selfCheck.md). `kind`
identifies which invariant failed; `detail` names the exact surface or
symptom for the error message.

## Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| <a id="detail"></a> `detail` | `readonly` | `string` | Human-readable description, naming the surface or symptom (e.g. `"run accessed 'Date'"`). |
| <a id="kind"></a> `kind` | `readonly` | [`ViolationKind`](TypeAlias.ViolationKind.md) | Which determinism invariant the run violated. |
