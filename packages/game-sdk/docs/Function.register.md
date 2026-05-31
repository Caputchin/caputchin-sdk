# Function: register()

> **register**(`factory`): `void`

Register the game's factory with the iframe's Caputchin global; the widget
 iframe runtime invokes it on kickoff. No manifest is passed: the SERVER
 resolves presets + the preferred footprint (from the indexed `caputchin.json`
 / dashboard-authored schemas) and ships them down via the bootstrap +
 kickoff message, so the in-frame manifest is never read at runtime. The
 `caputchin.json` file stays the author + marketplace-indexer source of truth
 (typed by [GameManifest](Interface.GameManifest.md)); it just isn't handed to `register`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `factory` | [`GameFactory`](TypeAlias.GameFactory.md) |

## Returns

`void`
