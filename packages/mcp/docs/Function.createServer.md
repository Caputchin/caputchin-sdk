# Function: createServer()

> **createServer**(`env?`, `options?`): `Server`

Compose the MCP server.

The SDK no longer holds its own tool catalogue. At server creation it
captures the env config and registers two top-level handlers
(`tools/list`, `tools/call`); both merge:

- Local-only tools ([LOCAL\_TOOLS](Variable.LOCAL_TOOLS.md)): offline snippet generators
  that need no Caputchin account.
- Remote tools fetched lazily from the platform's `/api/mcp` endpoint
  (the canonical management-surface catalogue) on the first `tools/list`
  call.

If the platform is unreachable the local tools still work; remote tools
surface as absent with an explanatory `caputchin_remote_unavailable` entry.

## Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `env` | `ProcessEnv` | `process.env` | Process environment to read `CAPUTCHIN_TOKEN` and `CAPUTCHIN_API_HOST` from. Defaults to `process.env`. |
| `options` | [`CreateServerOptions`](TypeAlias.CreateServerOptions.md) | `{}` | Optional [CreateServerOptions](TypeAlias.CreateServerOptions.md). Pass `{ localOnly: true }` to skip the remote catalogue entirely. |

## Returns

`Server`

A configured `@modelcontextprotocol/sdk` `Server` instance ready
  to connect to a transport.
