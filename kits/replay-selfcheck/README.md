# @caputchin/replay-selfcheck

The shared **replay determinism check**. Point it at a `run(seed, config, trace)
-> verdict` (the `@caputchin/replay-contract` surface) and it replays the run
under a hostile, isolate-equivalent environment, then reports any reason the run
could reject an honest player on the server.

It is the ONE check used in both places:

- the author / CI CLI `caputchin-selfcheck` (re-exported by
  [`@caputchin/engine-kit`](../engine-kit)),
- the platform's replay isolate at vendor / upload / index time (via the
  `./isolate` entry).

The non-deterministic-surface set and the divergent-trig keys come from
[`@caputchin/determinism`](../determinism) - the same registry the runtime ban
shim projects from - so the check and the enforcement can never drift apart.

## What it catches

- **Ambient access** - the run reads `Date` / `performance` (wall-clock),
  `Math.random` / `crypto` (entropy), or `fetch` / timers / `Intl` / `navigator`
  (environment-dependent IO). Each is replaced by a loud thrower; touching one is
  flagged with the surface name.
- **Native transcendental divergence** - the verdict changes when `Math.sin` /
  `cos` / `pow` / ... are swapped to `capMath`, meaning the run depends on
  libm-approximated math that differs between a player's ARM device and an x86-64
  server. Use `capMath` instead.
- **Run-to-run drift** - identical re-runs of the same seed + trace produce
  different verdicts.
- **Crash or bad output** - the run throws, or returns a value that is not a
  `Verdict`.

Every check includes a **smoke case**: seed `[0,0,0,0]` over an empty trace must
return a `Verdict`, not crash (a garbage trace is a failed round, never an error).

## Usage

```ts
import { selfCheck, selfCheckRun } from '@caputchin/replay-selfcheck';

// With recorded traces (the author CLI path):
const report = await selfCheck(run, [{ seed, trace, label: 'play-1' }]);

// With synthetic seeds + the empty trace (no recorded play available):
const quick = await selfCheckRun(run, { repeats: 8 });

if (!quick.ok) {
  for (const c of quick.cases.filter((c) => !c.deterministic))
    console.error(c.label, c.violations);
}
```

Inside a sealed replay isolate, the host imports the bundled `./isolate` entry:

```ts
import { runSelfCheck } from '@caputchin/replay-selfcheck/isolate';
const report = await runSelfCheck(run); // report.ok is the gate signal
```

## Scope

This is a confidence + gate mechanism, not the trust anchor. The server's
per-verify replay remains authoritative. It sees only the `run` reference, so it
catches ambient access at run time; a value captured at module-load time is
covered by the runtime ban shim and the real-isolate diff, not here.
