# Interface: CaseReport

## Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| <a id="deterministic"></a> `deterministic` | `readonly` | `boolean` | - |
| <a id="label"></a> `label` | `readonly` | `string` | - |
| <a id="verdict"></a> `verdict` | `readonly` | [`Verdict`](index.Interface.Verdict.md) \| `null` | The verdict observed under the clean environment, or null if the run threw / returned a non-Verdict (see violations for which). |
| <a id="violations"></a> `violations` | `readonly` | readonly [`Violation`](index.Interface.Violation.md)[] | - |
