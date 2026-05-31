# Function: parseVerdict()

> **parseVerdict**(`value`): [`Verdict`](Interface.Verdict.md) \| `null`

Validate an untrusted value as a [Verdict](Interface.Verdict.md). The `run` is customer
code, so its return value is untrusted: the replay host MUST funnel it
through here and treat a `null` result as a REJECTED round, never a passing
one. Returns a fresh, normalized Verdict (exactly the three fields) on
success, or `null` on any shape violation.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `value` | `unknown` | The raw return value of a `run` invocation. |

## Returns

[`Verdict`](Interface.Verdict.md) \| `null`

A normalized [Verdict](Interface.Verdict.md) on success, or `null` if the shape is
  invalid (missing field, wrong type, non-finite number, negative
  `durationMs`).
