# @caputchin/mcp

Model Context Protocol server for Caputchin — exposes the Management API and
offline developer helpers over stdio. Works with Claude Desktop, Cursor, Claude
Code, and any other MCP client that speaks stdio.

Transport: stdio. A future hosted HTTP transport at `/api/mcp` (JSON-RPC 2.0)
is planned for clients that prefer streaming HTTP — this package is the
stdio-only distribution and adds local-only snippet generators that need no
Caputchin account.

## Install + run

```sh
npx @caputchin/mcp
```

Set two env vars before launching:

| Env var | Required | Default | Notes |
|---|---|---|---|
| `CAPUTCHIN_TOKEN` | yes (default mode) | — | Management token starting with `cpt_pat_`. Mint one from the dashboard. |
| `CAPUTCHIN_API_HOST` | no | `https://api.caputchin.com` | Override for staging or self-hosted deployments. Trailing slashes are stripped. |

Run in local-only mode (no token, no bridge tools — just the snippet generators):

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

### Bridge tools (require `CAPUTCHIN_TOKEN`)

Each maps 1:1 to the [Management API](../../docs/management-api.md). A future
hosted HTTP mount at `/api/mcp` is planned — this package is the stdio path.

| Tool | Description |
|---|---|
| `caputchin_check_auth` | Verify the management token and API host; returns the site list on success. |
| `caputchin_list_sites` | List all site keys owned by the account. |
| `caputchin_create_site` | Create a new site key (secret returned ONCE). |
| `caputchin_get_site` | Fetch one site by id. |
| `caputchin_update_site` | Update name / allowed_domains / tier / disabled. |
| `caputchin_delete_site` | Delete a site permanently. |
| `caputchin_rotate_site_secret` | Issue a fresh site secret; old one stops verifying. |
| `caputchin_site_stats` | Aggregate counters per site. |
| `caputchin_list_tokens` | List management tokens (metadata only). |
| `caputchin_create_token` | Mint a management token (value returned ONCE). |
| `caputchin_revoke_token` | Revoke a management token by id. |
| `caputchin_get_hosted_verification` | Fetch hosted-verification config for a site. |
| `caputchin_set_hosted_verification` | Set hosted-verification config (paid tier). |

### Local tools (no network)

| Tool | Description |
|---|---|
| `caputchin_widget_snippet` | Generate an HTML snippet that mounts the widget. |
| `caputchin_siteverify_example` | Copy-paste backend `/siteverify` snippet (node, javascript, typescript, python, go, php, curl). |

## Full reference

- [docs/management-api.md](../../docs/management-api.md) — Management API surface
- [docs/api.md](../../docs/api.md) — Runtime endpoints (browser-side + customer backend)
- [docs/architecture.md](../../docs/architecture.md) — How this fits into Caputchin
