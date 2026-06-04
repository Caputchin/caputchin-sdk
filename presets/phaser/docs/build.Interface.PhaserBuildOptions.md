# Interface: PhaserBuildOptions

Inputs for [definePhaserBuild](build.Function.definePhaserBuild.md).

## Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| <a id="gameid"></a> `gameId` | `readonly` | `string` | Game id slug. Live bundle is emitted as `<gameId>.js`. |
| <a id="liveentry"></a> `liveEntry?` | `readonly` | `string` | Live (render) entry. Defaults to `src/index.ts`. |
| <a id="runentry"></a> `runEntry?` | `readonly` | `string` | Headless replay entry. Defaults to `src/run.ts`. |
