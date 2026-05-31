# Function: parseVerdict()

> **parseVerdict**(`value`): [`Verdict`](index.Interface.Verdict.md) \| `null`

Validate an untrusted value as a [Verdict](index.Interface.Verdict.md). The `run` is customer code,
so its return value is untrusted: the replay host MUST funnel it through here
and treat a `null` result as a REJECTED round, never a passing one. Returns a
fresh, normalized Verdict (exactly the three fields) on success, or `null` on
any shape violation.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `value` | `unknown` |

## Returns

[`Verdict`](index.Interface.Verdict.md) \| `null`
