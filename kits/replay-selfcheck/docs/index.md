# index

## Interfaces

| Interface | Description |
| ------ | ------ |
| [CaseReport](index.Interface.CaseReport.md) | Self-check result for one [SelfCheckCase](index.Interface.SelfCheckCase.md). `deterministic` is `true` only when `violations` is empty. |
| [SelfCheckCase](index.Interface.SelfCheckCase.md) | One determinism probe: a seed + the opaque trace recorded under it, optionally under a specific server config (defaults to `null` → the run's own defaults). Generic over the run's config shape so a typed `RunFn<C>` self-checks without a cast; defaults to the opaque ReplayConfig. |
| [SelfCheckOptions](index.Interface.SelfCheckOptions.md) | Options for [selfCheck](index.Function.selfCheck.md). |
| [SelfCheckReport](index.Interface.SelfCheckReport.md) | Aggregate result returned by [selfCheck](index.Function.selfCheck.md). `ok` is a single pass/fail signal; `cases` carries the per-case detail. |
| [SelfCheckRunOptions](index.Interface.SelfCheckRunOptions.md) | Options for [selfCheckRun](index.Function.selfCheckRun.md). |
| [Violation](index.Interface.Violation.md) | A single determinism violation found during [selfCheck](index.Function.selfCheck.md). `kind` identifies which invariant failed; `detail` names the exact surface or symptom for the error message. |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [ViolationKind](index.TypeAlias.ViolationKind.md) | Which determinism invariant a case violated. The `detail` always names the exact surface or symptom. |

## Variables

| Variable | Description |
| ------ | ------ |
| [DEFAULT\_SEEDS](index.Variable.DEFAULT_SEEDS.md) | Two distinct seeds the convenience runner probes by default: a small one and a high-entropy one (catches a run that only misbehaves on certain words). |

## Functions

| Function | Description |
| ------ | ------ |
| [selfCheck](index.Function.selfCheck.md) | Probe a `run` for determinism over the given cases. For each case the run is replayed many times under a hostile, isolate-equivalent environment; the report flags any case whose verdict is unstable across re-runs or depends on ambient non-determinism (wall-clock, `Math.random`/`crypto`, native trig, or other banned IO surfaces). `ok` is true only when every case is deterministic. |
| [selfCheckRun](index.Function.selfCheckRun.md) | Convenience over [selfCheck](index.Function.selfCheck.md) for callers with no recorded trace (the platform at vendor / upload / index time): probes the [smokeCase](index.Function.smokeCase.md) plus each seed over the empty trace. The author CLI, which DOES have recorded traces, builds its own richer case list and calls [selfCheck](index.Function.selfCheck.md) directly. |
| [smokeCase](index.Function.smokeCase.md) | The mandatory smoke case: seed `[0,0,0,0]` over an empty trace. A conforming run must return a parseable `Verdict` here (a garbage/empty trace is a FAILED round, never a crash). Both the CLI and the platform include this case in every check. |
