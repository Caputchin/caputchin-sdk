# Type Alias: CreateServerOptions

> **CreateServerOptions** = `object`

Options for [createServer](Function.createServer.md).

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="localonly"></a> `localOnly?` | `boolean` | When `true`, skip the remote-catalogue fetch and do not read `CAPUTCHIN_TOKEN` from the environment. Only the local-only tools ([LOCAL\_TOOLS](Variable.LOCAL_TOOLS.md)) register; management tools are unavailable. Useful for offline development or when no Caputchin account is needed. |
