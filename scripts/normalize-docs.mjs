import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Rewrite tool-inserted typographic dashes (em/en) to ASCII hyphens across the
// generated markdown. TypeDoc renders a source " - " (space-hyphen-space) in
// doc comments as an em-dash; em/en-dashes in public-repo docs read as
// AI-authored, so the committed reference keeps plain hyphens. Source comments
// are hyphen-only already; this only undoes the renderer's substitution.
//
// Usage: node ../../scripts/normalize-docs.mjs <dir>  (run per package, dir is
// resolved relative to the package cwd, e.g. "docs").
const dir = process.argv[2];
if (!dir) {
  console.error("usage: normalize-docs.mjs <dir>");
  process.exit(1);
}

async function walk(d) {
  for (const entry of await readdir(d, { withFileTypes: true })) {
    const p = join(d, entry.name);
    if (entry.isDirectory()) await walk(p);
    else if (entry.isFile() && p.endsWith(".md")) {
      const before = await readFile(p, "utf8");
      const after = before.replace(/[—–]/g, "-");
      if (after !== before) await writeFile(p, after);
    }
  }
}

await walk(dir);
