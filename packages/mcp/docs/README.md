# @caputchin/mcp

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [CreateServerOptions](TypeAlias.CreateServerOptions.md) | Options for [createServer](Function.createServer.md). |
| [LocalTool](TypeAlias.LocalTool.md) | Descriptor for one local (offline) MCP tool. Registered in [LOCAL\_TOOLS](Variable.LOCAL_TOOLS.md) and served by `createServer` without any API call. |

## Variables

| Variable | Description |
| ------ | ------ |
| [LOCAL\_TOOLS](Variable.LOCAL_TOOLS.md) | All offline (no-auth) MCP tools bundled with this package. `createServer` registers every entry here regardless of whether `CAPUTCHIN_TOKEN` is set. Currently includes `caputchin_widget_snippet` (HTML mount snippet) and `caputchin_siteverify_example` (backend verification code sample). |

## Functions

| Function | Description |
| ------ | ------ |
| [createServer](Function.createServer.md) | Compose the MCP server. |
