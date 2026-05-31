# Interface: CaseReport

Self-check result for one [SelfCheckCase](Interface.SelfCheckCase.md). `deterministic` is `true`
only when `violations` is empty.

## Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| <a id="deterministic"></a> `deterministic` | `readonly` | `boolean` | `true` when the case passed all probes with no violations. |
| <a id="label"></a> `label` | `readonly` | `string` | Human label for the case (the `label` field from [SelfCheckCase](Interface.SelfCheckCase.md), or `"case #n"`). |
| <a id="verdict"></a> `verdict` | `readonly` | [`Verdict`](Interface.Verdict.md) \| `null` | Verdict observed under the clean environment, or `null` if the run threw or returned a non-Verdict. See `violations` for which kind applied. |
| <a id="violations"></a> `violations` | `readonly` | readonly [`Violation`](Interface.Violation.md)[] | All violations found for this case. Empty when `deterministic` is `true`. |
