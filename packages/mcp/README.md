# @caputchin/mcp

Model Context Protocol server for Caputchin over stdio. Works with Claude
Desktop, Cursor, Claude Code, and any other MCP client that speaks stdio.

This package is a thin stdio adapter: it proxies the canonical management
tool catalogue served by Caputchin's `/mcp` HTTP endpoint, and adds
offline developer-onboarding tools (HTML and backend snippet generators)
that need no Caputchin account. The full tool list is defined in
[caputchin-platform/apps/web/src/lib/mcp-tools.ts](https://github.com/Caputchin/caputchin-platform/blob/main/apps/web/src/lib/mcp-tools.ts)
and updates the moment a new platform version deploys, no SDK release
needed to pick up new tools.

## Install + run

```sh
npx @caputchin/mcp
```

Set the management token before launching:

| Env var | Required | Default | Notes |
|---|---|---|---|
| `CAPUTCHIN_TOKEN` | yes (default mode) | (none) | Management token starting with `cpt_pat_`. Mint one from the dashboard. |
| `CAPUTCHIN_API_HOST` | no | `https://api.caputchin.com` | Override for staging or self-hosted deployments. Trailing slashes are stripped. The endpoint is `${CAPUTCHIN_API_HOST}/mcp`. |

Run in local-only mode (no token; only the offline snippet generators load):

```sh
npx @caputchin/mcp --local-only
```

## Claude Desktop config

```json
{
  "mcpServers": {
    "caputchin": {
      "command": "npx",
      "args": ["-y", "@caputchin/mcp"],
      "env": {
        "CAPUTCHIN_TOKEN": "cpt_pat_..."
      }
    }
  }
}
```

## Tool surface

### Remote tools (proxied from `/mcp`)

Fetched live from the platform on first `tools/list`; cached for the
session. Adding or removing a tool only requires a platform deploy,
this package does not need a release. See the
[Management API docs](https://github.com/Caputchin/caputchin/blob/main/docs/management-api.md)
and the [canonical catalogue source](https://github.com/Caputchin/caputchin-platform/blob/main/apps/web/src/lib/mcp-tools.ts)
for the complete list of tool names + input schemas.

If the platform endpoint is unreachable at startup, the SDK still serves
the local tools and exposes a sentinel `caputchin_remote_unavailable`
tool whose description carries the failure reason, your agent learns
why the management surface is empty without you having to debug
network state.

### Local tools (no network)

| Tool | Description |
|---|---|
| `caputchin_widget_snippet` | Generate an HTML snippet that mounts the widget. |
| `caputchin_siteverify_example` | Copy-paste backend `/siteverify` snippet (node, javascript, typescript, python, go, php, curl). |

## Migrating from `@caputchin/mcp@1.x`

The 1.x line shipped its own bundled tool catalogue. 2.0.0 deletes that
catalogue and switches to live proxy of `/api/mcp`. Customer-visible
implications:

- Tool names + input shapes are identical (they always were, the
  bundled catalogue mirrored the platform).
- New tools added to the platform after `@1.0.0` are now reachable
  without an SDK upgrade.
- Customers pinned on `@1.x` continue to work; that branch is no longer
  updated. Upgrade to `@2.x` to get catalogue freshness.

## Full reference

- [docs/management-api.md](https://github.com/Caputchin/caputchin/blob/main/docs/management-api.md): Management API surface
- [docs/api.md](https://github.com/Caputchin/caputchin/blob/main/docs/api.md): Runtime endpoints (browser-side + customer backend)
