#!/usr/bin/env node
// caputchin-selfcheck - the pre-publish determinism CLI. Points at a
// BUILT run artifact (the file the game publishes) and replays it through the
// `selfCheck` prober under a hostile, isolate-equivalent environment, so an
// author (and our own first-party games) confirm cross-env determinism before
// the artifact ships. Exits non-zero on any violation, so it drops into CI /
// a pre-publish hook.
//
//   caputchin-selfcheck <artifact.js> [--trace <file>]... [--seed a,b,c,d]... [--repeats N]
//
// <artifact.js> must export `run` (RUN_EXPORT_NAME). Each --trace is a file
// holding one opaque trace (as the artifact's own decoder reads it); repeat for
// several recorded plays. With no --trace, an empty kit-default trace is used
// (exercises init + the tick loop - still catches Date.now-in-init - but real
// recorded traces give the strongest coverage). Each --seed is four comma-
// separated u32s; defaults probe two distinct seeds.

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { argv, exit, stderr, stdout } from 'node:process';
import { RUN_EXPORT_NAME, type RunFn, type Seed } from '@caputchin/replay-contract';
import { encodeTrace } from './trace-codec';
import { selfCheck, type SelfCheckCase, type SelfCheckReport } from './self-check';

interface Args {
  artifact: string;
  traces: string[];
  seeds: Seed[];
  repeats: number;
}

const DEFAULT_SEEDS: readonly Seed[] = [
  [1, 2, 3, 4],
  [3735928559, 2596069104, 1, 4294967295],
];

function fail(msg: string): never {
  stderr.write(`caputchin-selfcheck: ${msg}\n`);
  exit(2);
}

function parseSeed(raw: string): Seed {
  const parts = raw.split(',').map((s) => Number(s.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 0xffffffff)) {
    fail(`--seed must be four comma-separated u32 values, got "${raw}"`);
  }
  return [parts[0]!, parts[1]!, parts[2]!, parts[3]!];
}

function parseArgs(args: readonly string[]): Args {
  const traces: string[] = [];
  const seeds: Seed[] = [];
  let artifact: string | undefined;
  let repeats = 8;

  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '--trace') {
      const v = args[++i];
      if (v === undefined) fail('--trace needs a file path');
      traces.push(v);
    } else if (a === '--seed') {
      const v = args[++i];
      if (v === undefined) fail('--seed needs a value');
      seeds.push(parseSeed(v));
    } else if (a === '--repeats') {
      const v = args[++i];
      const n = Number(v);
      if (!Number.isInteger(n) || n < 2) fail('--repeats must be an integer >= 2');
      repeats = n;
    } else if (a === '-h' || a === '--help') {
      stdout.write(
        'Usage: caputchin-selfcheck <artifact.js> [--trace <file>]... [--seed a,b,c,d]... [--repeats N]\n',
      );
      exit(0);
    } else if (a.startsWith('-')) {
      fail(`unknown flag "${a}"`);
    } else if (artifact === undefined) {
      artifact = a;
    } else {
      fail(`unexpected argument "${a}"`);
    }
  }

  if (artifact === undefined) fail('missing <artifact.js> (the built run artifact to check)');
  return {
    artifact,
    traces,
    seeds: seeds.length > 0 ? seeds : [...DEFAULT_SEEDS],
    repeats,
  };
}

async function loadRun(artifact: string): Promise<RunFn> {
  let mod: Record<string, unknown>;
  try {
    mod = (await import(pathToFileURL(artifact).href)) as Record<string, unknown>;
  } catch (err) {
    fail(`could not import artifact "${artifact}": ${String(err)}`);
  }
  const run = mod[RUN_EXPORT_NAME];
  if (typeof run !== 'function') {
    fail(`artifact "${artifact}" does not export a '${RUN_EXPORT_NAME}' function`);
  }
  return run as RunFn;
}

function readTrace(path: string): string {
  try {
    return readFileSync(path, 'utf8');
  } catch (err) {
    fail(`could not read trace "${path}": ${String(err)}`);
  }
}

function buildCases(args: Args): SelfCheckCase[] {
  const traceBlobs: { label: string; trace: string }[] =
    args.traces.length > 0
      ? args.traces.map((p) => ({ label: p, trace: readTrace(p) }))
      : [{ label: '(empty default trace)', trace: encodeTrace([]) }];

  const cases: SelfCheckCase[] = [];
  for (const seed of args.seeds) {
    for (const { label, trace } of traceBlobs) {
      cases.push({ seed, trace, label: `seed[${seed.join(',')}] × ${label}` });
    }
  }
  return cases;
}

function printReport(report: SelfCheckReport): void {
  for (const c of report.cases) {
    const mark = c.deterministic ? 'PASS' : 'FAIL';
    stdout.write(`  [${mark}] ${c.label}`);
    stdout.write(c.verdict ? ` -> ${JSON.stringify(c.verdict)}\n` : '\n');
    for (const v of c.violations) stdout.write(`         ${v.kind}: ${v.detail}\n`);
  }
  const failed = report.cases.filter((c) => !c.deterministic).length;
  stdout.write(
    report.ok
      ? `\ncaputchin-selfcheck: OK (${report.cases.length} case(s) deterministic)\n`
      : `\ncaputchin-selfcheck: FAILED (${failed}/${report.cases.length} case(s) non-deterministic)\n`,
  );
}

async function main(): Promise<void> {
  const args = parseArgs(argv.slice(2));
  const run = await loadRun(args.artifact);
  const cases = buildCases(args);
  stdout.write(`caputchin-selfcheck: probing ${cases.length} case(s) × ${args.repeats} repeats\n`);
  const report = await selfCheck(run, cases, { repeats: args.repeats });
  printReport(report);
  exit(report.ok ? 0 : 1);
}

void main();
