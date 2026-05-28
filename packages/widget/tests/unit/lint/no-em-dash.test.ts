import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Mechanical guard against em-dashes in published SDK source. The widget is a
// published public package; em-dashes in comments / strings read AI-generated
// and the project's hygiene rule bans them. This rule has fired on consecutive
// review slices (signals.ts:24 + custom-fetch.ts:224/232); the test halts the
// recurrence at commit time so the next slice can't reintroduce it.

const SRC = join(__dirname, '..', '..', '..', 'src');
const EM_DASH = '—';

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) out.push(full);
  }
  return out;
}

describe('no em-dash in published SDK source', () => {
  it('every src/**/*.{ts,tsx} file is em-dash-free', () => {
    const hits: { file: string; line: number; excerpt: string }[] = [];
    for (const file of walk(SRC)) {
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((text, i) => {
        if (text.includes(EM_DASH)) {
          hits.push({ file: file.slice(SRC.length + 1), line: i + 1, excerpt: text.trim().slice(0, 120) });
        }
      });
    }
    expect(hits, `em-dashes in published SDK source:\n${hits.map((h) => `  ${h.file}:${h.line} → ${h.excerpt}`).join('\n')}`).toEqual([]);
  });
});
