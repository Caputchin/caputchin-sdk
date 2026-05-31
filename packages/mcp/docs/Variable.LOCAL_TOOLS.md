# Variable: LOCAL\_TOOLS

> `const` **LOCAL\_TOOLS**: [`LocalTool`](TypeAlias.LocalTool.md)[]

All offline (no-auth) MCP tools bundled with this package. `createServer`
registers every entry here regardless of whether `CAPUTCHIN_TOKEN` is set.
Currently includes `caputchin_widget_snippet` (HTML mount snippet) and
`caputchin_siteverify_example` (backend verification code sample).
