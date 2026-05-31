# Function: createServer()

> **createServer**(`env?`, `options?`): `Server`

Compose the MCP server.

The SDK no longer holds its own tool catalogue. At
server creation it captures the env config and registers two
top-level handlers (`tools/list`, `tools/call`); both merge:

 - Local-only tools (`local-tools.ts`): offline snippet generators
   that need no Caputchin account.
 - Remote tools fetched from the platform's `/api/mcp` endpoint
   (the canonical management-surface catalogue).

The remote fetch is lazy (first `tools/list` call triggers it). If
the platform is unreachable the local tools still work; the bridge
tools surface as absent with an explanatory message on a no-arg-call
to `caputchin_remote_unavailable`.

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `env` | `ProcessEnv` | `process.env` |
| `options` | [`CreateServerOptions`](TypeAlias.CreateServerOptions.md) | `{}` |

## Returns

`Server`
