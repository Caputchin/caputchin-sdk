# Manifest and publishing

`caputchin.json` is your game's manifest: the source of truth for the marketplace
indexer and the server-resolved presets. The SDK never reads it in the browser
(`register` gets no manifest); the server reads the file, resolves presets and the
preferred footprint, and ships those to the widget at runtime.

## What goes in `caputchin.json`

| Field | Purpose |
| --- | --- |
| `entry` | Path to the built playable bundle. With `npm`, the indexer resolves a jsDelivr URL. |
| `npm` | Your npm package coordinate (used by the indexer; informational at runtime). |
| `run` | Optional dedicated headless replay artifact: `{ entry, modules? }`. Omit to replay the live `entry` directly. `modules` ships `.wasm` / helper `.js` (up to 16, name must match `/^[a-zA-Z0-9_-]+\.(wasm\|js)$/`). |
| `preferred` | Preferred presentation footprint (`width`, `height`). |
| `minSolveMs` | Minimum plausible human solve time, in ms. The platform rejects a round whose real elapsed time is below it (an offline solver finishes in ~0). Set conservatively, well under your slowest real player. Omit for no floor. |
| `configurations` / `locales` / `skins` | `{ presets, schema? }` blocks the server resolves and layers per mount. |
| `license` | SPDX identifier. Required for marketplace listing; must be on the approved permissive whitelist. |
| `terms_accepted` | Literal `true`. Required for marketplace listing (accepts the submission terms). |
| `marketplace` | UI metadata (name, description, preview, author, support flags). Present only for marketplace-listed games. |
| `id` | Optional and unused by the SDK; the marketplace derives the id from the GitHub coordinate. |

A **customer-hosted-only** game (runs on sites via `game-src`, never listed) can
omit `license`, `terms_accepted`, and `marketplace`.

### Minimal customer-hosted manifest

```json
{
  "npm": "@you/my-game",
  "entry": "dist/my-game.js",
  "run": { "entry": "dist/run.js" },
  "preferred": { "width": 800, "height": 420 },
  "minSolveMs": 2000
}
```

### Marketplace-listed manifest (adds the required opt-in fields)

```json
{
  "terms_accepted": true,
  "license": "MIT",
  "npm": "@you/my-game",
  "entry": "dist/my-game.js",
  "run": { "entry": "dist/run.js" },
  "preferred": { "width": 800, "height": 420 },
  "minSolveMs": 2000,
  "marketplace": {
    "name": "My Game",
    "description": "One-line pitch.",
    "preview": "preview.gif",
    "support": { "responsive": true, "touch": true, "accessible": true, "audio": "optional" }
  }
}
```

## Publish to the marketplace

1. Build the game and confirm determinism: `caputchin-selfcheck` is green (see
   [determinism-replay.md](determinism-replay.md)). A non-deterministic artifact
   is rejected at index time.
2. Put `caputchin.json` at the repo root with the `marketplace` block,
   `terms_accepted: true`, and an approved `license`.
3. Add the GitHub topic `caputchin-game` to the repository.
4. The indexer crawls tagged public repos (daily, plus on demand) and lists the
   game. The game id is derived from the GitHub coordinate (`owner/repo`, or
   `owner/repo/leaf` for a collection), so it cannot be squatted.

Once listed, sites reference it as `game="owner/repo"` on the `caputchin-game`
element (the `caputchin` skill's widget reference).

## Notes

- The approved license whitelist and the reasons a submission can fail are at
  caputchin.com/docs/marketplace/publish-failed-reference. Submission terms are
  at caputchin.com/legal/submission-terms.
- `_default: true` marks the default preset within a `presets` block; jsonb key
  ordering means you should set it explicitly rather than relying on which preset
  appears first.

## Learn more

- game-sdk manifest reference (`GameManifest`): https://github.com/Caputchin/caputchin-sdk/tree/main/packages/game-sdk/docs
- Customer docs portal (marketplace): https://docs.caputchin.com
