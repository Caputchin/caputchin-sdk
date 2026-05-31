# Interface: SelfCheckReport

Aggregate result returned by [selfCheck](Function.selfCheck.md). `ok` is a single pass/fail
signal; `cases` carries the per-case detail.

## Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| <a id="cases"></a> `cases` | `readonly` | readonly [`CaseReport`](Interface.CaseReport.md)[] | Per-case reports, one entry per element of the `cases` input array. |
| <a id="ok"></a> `ok` | `readonly` | `boolean` | `true` only when every case in `cases` is deterministic (no violations). |
