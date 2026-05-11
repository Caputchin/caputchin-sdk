# caputchin-js qa-notes

## T-platform-root — root scaffold (pnpm workspace, tsconfig.base, .gitignore, .npmrc, README, LICENSE, packages/* placeholders)

- Status: APPROVED
- Reviewed-by: qa-engineer
- Reviewed-at: 2026-05-11T20:25:00Z
- Diff-hash: n/a (no git repo init yet — tracked by file mtime under /home/armaaar/projects/caputchin/caputchin-js/)
- Skills-run: review, simplify, verification-before-completion
- Scope: root files + packages/* dir layout only. fe (widget/game-sdk src) + be (mcp src) review deferred to own slices.
- Findings: none blocking platform slice.

### Verification

- `pnpm install` → clean. 4 workspace projects resolved. 1 warn: ignored build script `esbuild@0.27.7` — benign, expected on first install. Not a blocker.
- Root files all present + correct shape:
  - `package.json` private, packageManager pinned `pnpm@10.33.3`, scripts delegate `pnpm -r`.
  - `pnpm-workspace.yaml` globs `packages/*`.
  - `tsconfig.base.json` strict, ES2022, moduleResolution bundler, declaration, sourceMap, esModuleInterop, skipLibCheck — matches spec.
  - `.gitignore` covers `node_modules/`, `dist/`, `.turbo/`, `*.log`, `.DS_Store`.
  - `.npmrc` `engine-strict=true`, `access=public`.
  - `README.md` accurate one-paragraph + install/build snippet.
  - `LICENSE` MIT, holder Caputchin, year 2026 — matches today.
  - `packages/{widget,game-sdk,mcp}/` dirs exist with `.gitkeep` (plus engineer-added scaffolds in fe/be slices).
- Simplify pass: no redundant root files, no over-engineering, no premature abstractions.

### Notes carried to other slices (not platform findings)

- mcp typecheck + build fail: `tsconfig include:["src"]` matches no inputs; `tsup` cannot find `src/cli.ts`. → be slice review will block on this.
- `pnpm -r typecheck` ran 3 of 4 workspaces (root has no `typecheck` script — fine, root is private orchestrator).
- `pnpm approve-builds` for esbuild postinstall scripts — defer until first publish-readiness pass; not a skeleton blocker.

### Verdict

Platform root scaffold APPROVED. Engineer may mark T-platform-root complete.

## T-fe-skeleton — @caputchin/widget + @caputchin/game-sdk skeleton

- Status: REJECTED
- Reviewed-by: qa-engineer
- Reviewed-at: 2026-05-11T20:35:00Z
- Diff-hash: n/a (no git repo init yet)
- Skills-run: review, simplify, ui-state-coverage (N/A — no UI surfaces in skeleton beyond customElements.define), verification-before-completion
- Findings:
  - F1 Major /home/armaaar/projects/caputchin/caputchin-js/packages/widget/package.json:exports — `types` condition is NOT first in the `.` exports map. Currently:
    ```
    "exports": { ".": { "import": "./dist/widget.js", "types": "./dist/index.d.ts" } }
    ```
    Two problems:
    1. `types` MUST be the first condition or strict resolvers (TypeScript `moduleResolution: "node16"`/`"nodenext"`/`"bundler"` strict path) skip the types lookup. game-sdk got this right; widget did not.
    2. `types` points to `./dist/index.d.ts` but the actual emitted DTS is `./dist/widget.d.ts` (entry name is `widget` per tsup config). Path is wrong — file does not exist on disk. Strict consumers will fail type resolution.
    Fix: reorder + correct the path:
    ```
    "exports": { ".": { "types": "./dist/widget.d.ts", "import": "./dist/widget.js" } }
    ```

### Verification

- typecheck widget — clean
- typecheck game-sdk — clean
- build widget — ESM dist/widget.js 252B + IIFE dist/widget.global.js 1.21KB (`var Caputchin = (() => ...)()`) + DTS dist/widget.d.ts 116B
- build game-sdk — ESM dist/index.js 519B + CJS dist/index.cjs 1.49KB + DTS .d.ts + .d.cts 229B each
- customElements.define('caputchin', CaputchinElement) confirmed in dist/widget.js + IIFE
- register(id, factory) signature matches docs/game-sdk.md contract exactly: `(container: HTMLElement, onComplete: (result: { score: number }) => void) => (() => void) | void`
- warn-on-missing-global + warn-on-duplicate-id last-write-wins behavior confirmed in src + dist
- game-sdk exports map: `types` first → correct
- no runtime deps in either package; sideEffects correct (widget array → entry side-effectful for customElements.define; game-sdk false)

### Re-review-after

After F1 fixed, ping for re-review. Engineer must include reflection block per CLAUDE.md non-negotiable principle 4 (What-failed / What-change / Repeating-prior-attempt: no).

## T-fe-skeleton — re-review cycle 2

- Status: APPROVED
- Reviewed-by: qa-engineer
- Reviewed-at: 2026-05-11T20:58:00Z
- Diff-hash: n/a (no git repo init yet)
- Skills-run: review (delta), verification-before-completion
- Findings: none.

### Verification

- F1 fix verified at /home/armaaar/projects/caputchin/caputchin-js/packages/widget/package.json:8-13 — exports map now `{".":{"types":"./dist/widget.d.ts","import":"./dist/widget.js"}}`. types-first + path matches actual emitted DTS.
- typecheck widget — clean
- build widget — ESM dist/widget.js 252B + IIFE dist/widget.global.js 1.21KB + DTS dist/widget.d.ts 116B; widget.d.ts file existence confirmed on disk.
- Reflection block present + correct (What-failed / What-change / Repeating-prior-attempt: no).

### Verdict

T-fe-skeleton APPROVED. Engineer may mark complete + commit.

## T-be-skeleton — @caputchin/mcp skeleton

- Status: REJECTED
- Reviewed-by: qa-engineer
- Reviewed-at: 2026-05-11T20:50:00Z
- Diff-hash: n/a (no git repo init yet)
- Skills-run: review, simplify, security-review (touches stdio + CLI binary), verification-before-completion
- Findings:
  - F1 Major /home/armaaar/projects/caputchin/caputchin-js/packages/mcp/package.json:exports — `./server` subpath has `types` AFTER `import`. Same bug class as fe widget F1. Currently:
    ```
    "exports": { "./server": { "import": "./dist/server.js", "types": "./dist/server.d.ts" } }
    ```
    Path is correct (file exists this time). Only the ordering is broken. Strict resolvers (TS moduleResolution node16/nodenext/bundler) walk conditions in order — they pick `import` first and skip the types lookup. Fix:
    ```
    "exports": { "./server": { "types": "./dist/server.d.ts", "import": "./dist/server.js" } }
    ```
  - F2 Minor /home/armaaar/projects/caputchin/caputchin-js/packages/mcp/README.md:1 — file starts with `## @caputchin/mcp` (h2) instead of `# @caputchin/mcp` (h1). Convention; matches widget + game-sdk READMEs. Non-blocking but fix while there.
  - F3 Minor /home/armaaar/projects/caputchin/caputchin-js/packages/mcp/src/server.ts:5,18 — tool name `caputchin.ping` uses `.` separator. MCP spec permits any string but several real clients (incl. some Claude Desktop builds) restrict tool names to `[a-zA-Z0-9_-]`. Recommend `caputchin_ping`. Non-blocking for skeleton — flag for the actual tool surface review.

### Verification

- `pnpm -F @caputchin/mcp typecheck` → clean
- `pnpm -F @caputchin/mcp build` → cli.js 741B + server.js 641B + server.d.ts 279B
- dist/cli.js line 1 shebang `#!/usr/bin/env node` confirmed
- @modelcontextprotocol/sdk@1.29.0 resolved in pnpm store; `server/mcp.js` + `server/stdio.js` entrypoints exist + match imports in src — current 1.x API
- `node dist/cli.js` over stdio: full MCP handshake exercised end-to-end:
  - `initialize` → `protocolVersion: 2024-11-05`, `serverInfo: {name: "caputchin", version: "0.0.0"}`, `capabilities: {tools: {listChanged: true}}`
  - `tools/list` → returns `caputchin.ping` with description + JSON Schema (object, no properties)
  - `tools/call caputchin.ping` → returns `{content: [{type: "text", text: "pong"}]}`
  - clean exit (0) on stdin EOF
- security-review pass: no shell exec, no fs writes, no network, no dynamic require, no eval, no untrusted input deserialization beyond MCP SDK internals. zod input schema validates `tools/call` arguments. Skeleton attack surface empty.
- simplify pass: no dead code; TOOLS const duplicates the description string with the registerTool call. Acceptable for skeleton; collapse to single source when first real tool is added.

### Re-review-after

After F1 fixed (F2 + F3 optional bundle), ping for re-review. Engineer must include reflection block per CLAUDE.md non-negotiable principle 4 (What-failed / What-change / Repeating-prior-attempt: no).

## T-be-skeleton — re-review cycle 2

- Status: APPROVED
- Reviewed-by: qa-engineer
- Reviewed-at: 2026-05-11T21:05:00Z
- Diff-hash: n/a (no git repo init yet)
- Skills-run: review (delta), verification-before-completion
- Findings: none.

### Verification

- F1 fix verified at /home/armaaar/projects/caputchin/caputchin-js/packages/mcp/package.json:11-15 — `./server` exports map now `{"types":"./dist/server.d.ts","import":"./dist/server.js"}`. types-first.
- F2 fix verified at /home/armaaar/projects/caputchin/caputchin-js/packages/mcp/README.md:1 — now `# @caputchin/mcp` (h1).
- F3 fix verified at /home/armaaar/projects/caputchin/caputchin-js/packages/mcp/src/server.ts:6,18 — tool name now `caputchin_ping` (safe charset).
- typecheck clean.
- build clean: cli.js 741B + server.js 641B + server.d.ts 279B.
- MCP handshake re-exercised: `initialize` → ok, `tools/list` returns `caputchin_ping`, `tools/call caputchin_ping` returns `{content:[{type:"text",text:"pong"}]}`. clean.
- Reflection block present + correct.

### Verdict

T-be-skeleton APPROVED. Engineer may mark complete + commit.
