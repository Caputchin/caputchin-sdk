# Type Alias: LocalTool

> **LocalTool** = `object`

Descriptor for one local (offline) MCP tool. Registered in
[LOCAL\_TOOLS](Variable.LOCAL_TOOLS.md) and served by `createServer` without any API call.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="description"></a> `description` | `string` | Human-readable description surfaced in MCP `tools/list` responses. |
| <a id="handler"></a> `handler` | (`args`) => `Promise`\<`string`\> | Execute the tool. |
| <a id="inputschema"></a> `inputSchema` | `z.ZodTypeAny` | Zod schema used to validate the tool's input arguments before calling `handler`. |
| <a id="name"></a> `name` | `string` | MCP tool name (snake_case, e.g. `"caputchin_widget_snippet"`). |
