# Interface: GameContext

Per-session context the widget passes to the game factory as a third arg.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="config"></a> `config` | `ResolvedConfig` \| `null` | - |
| <a id="locale"></a> `locale` | `ResolvedLocale` \| `null` | - |
| <a id="seed"></a> `seed` | [`Seed`](TypeAlias.Seed.md) \| `null` | Per-round replay seed: server-derived, the same value the server re-derives at replay. Seed all game randomness from it (e.g. `cap.rng(seed)`) so the live play is replayable. Null when the widget runs the game outside a verified session (no seed issued). |
| <a id="skin"></a> `skin` | `ResolvedSkin` \| `null` | - |
