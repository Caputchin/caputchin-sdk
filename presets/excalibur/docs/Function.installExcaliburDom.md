# Function: installExcaliburDom()

> **installExcaliburDom**(`scope?`): `void`

Install the Excalibur headless DOM stubs onto `scope` (default `globalThis`).
HEADLESS ONLY. Idempotent enough to call once at module load and again at the
start of each `run()` (the replay self-check prober shadows globals per call;
re-installing re-asserts the deterministic stubs over the probe).

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `scope` | `object` | `globalThis` |

## Returns

`void`
