# Managing Caputchin via MCP

`@caputchin/mcp` is a stdio MCP server that lets an AI agent manage Caputchin
resources (sites, keys, troops, stats, security, games) by calling tools instead
of hand-writing REST calls. Prefer these tools over raw HTTP: they are typed,
validated, and track the canonical management API.

This requires a Caputchin account and runs as a local process with network
access, so it fits Claude Code and other desktop MCP clients. It does not run in
the Claude API sandbox (no network there).

## Connect

The server binary is `caputchin-mcp`. Authenticate with a Caputchin personal
access token in `CAPUTCHIN_TOKEN`.

**Claude Code:**

```bash
claude mcp add caputchin --env CAPUTCHIN_TOKEN=cpt_pat_YOUR_TOKEN -- npx -y @caputchin/mcp
```

**Generic MCP client (`mcpServers` config):**

```json
{
  "mcpServers": {
    "caputchin": {
      "command": "npx",
      "args": ["-y", "@caputchin/mcp"],
      "env": { "CAPUTCHIN_TOKEN": "cpt_pat_YOUR_TOKEN" }
    }
  }
}
```

Get a token from the Caputchin dashboard (personal access token / PAT). Treat it
like a password: it is the agent's full management credential. Without a token
(or with `localOnly`), only the two offline tools below register; the management
tools are hidden.

## Two offline tools (no token needed)

These are pure code generators, useful even before an account exists:

| Tool | Returns |
| --- | --- |
| `caputchin_widget_snippet` | An HTML snippet that mounts the widget. |
| `caputchin_siteverify_example` | A backend verify snippet for `node`, `javascript`, `typescript`, `python`, `go`, `php`, or `curl`. |

## Tool catalog (management)

The full catalog is fetched live from the server, so it grows without an SDK
upgrade; call `caputchin_ping` and list tools to see the current set. The
groups below cover the common surface.

| Group | Representative tools |
| --- | --- |
| Health | `caputchin_ping` |
| Account / billing | `caputchin_get_account`, `caputchin_me_billing` |
| Sites | `caputchin_list_sites`, `caputchin_create_site`, `caputchin_get_site`, `caputchin_update_site`, `caputchin_delete_site`, `caputchin_rotate_site_secret` |
| Tokens (API keys) | `caputchin_list_tokens`, `caputchin_create_token`, `caputchin_rotate_token`, `caputchin_revoke_token` |
| Security config | `caputchin_get_site_security`, `caputchin_update_site_security`, `caputchin_get_troop_security`, `caputchin_update_troop_security`, `caputchin_get_site_cap_config`, `caputchin_update_site_cap_config` |
| Stats (site) | `caputchin_site_stats`, `caputchin_site_stats_dashboard`, `caputchin_site_stats_activity`, `caputchin_site_stats_durations`, `caputchin_site_stats_rejections`, `caputchin_list_site_sessions` |
| Stats (troop) | `caputchin_troop_stats`, `caputchin_troop_stats_dashboard`, `caputchin_troop_stats_activity`, `caputchin_troop_stats_durations`, `caputchin_troop_stats_rejections`, `caputchin_quick_stats_sites`, `caputchin_quick_stats_troops` |
| Delivery | `caputchin_site_delivery_dashboard`, `caputchin_troop_delivery_dashboard` |
| Audit logs | `caputchin_account_audit_logs`, `caputchin_site_audit_logs`, `caputchin_troop_audit_logs` |
| Troops (teams) | `caputchin_create_troop`, `caputchin_get_troop`, `caputchin_list_troops`, `caputchin_rename_troop`, `caputchin_delete_troop` |
| Troop members / PATs | `caputchin_list_troop_members`, `caputchin_add_troop_member`, `caputchin_update_troop_member`, `caputchin_remove_troop_member`, `caputchin_list_troop_pats`, `caputchin_attach_troop_pat`, `caputchin_detach_troop_pat`, `caputchin_update_troop_pat` |
| Games (config) | `caputchin_list_games`, `caputchin_get_game`, `caputchin_search_games`, `caputchin_list_game_presets`, `caputchin_set_game_preset`, `caputchin_set_game_default`, `caputchin_delete_game_preset` |
| Custom games | `caputchin_register_customized_game`, `caputchin_list_customized_games`, `caputchin_update_customized_game`, `caputchin_delete_customized_game`, `caputchin_repin_customized_game`, `caputchin_get_custom_game_schema`, `caputchin_set_custom_game_schema`, `caputchin_get_custom_game_run`, `caputchin_upload_custom_game_run`, `caputchin_delete_custom_game_run` |
| White-label | `caputchin_list_white_label_presets`, `caputchin_set_white_label_preset`, `caputchin_set_white_label_default`, `caputchin_delete_white_label_preset` |
| Hosted verification | `caputchin_get_hosted_verification`, `caputchin_set_hosted_verification`, `caputchin_test_hosted_verification` |
| Seats | `caputchin_get_seats`, `caputchin_mint_seat_pat`, `caputchin_invite_seat_user`, `caputchin_revoke_seat_pat`, `caputchin_remove_seat_user` |

## Common workflows

- **Onboard a new site:** `caputchin_create_site` to get the public site key and
  secret, then `caputchin_get_site` to confirm, then hand the keys to the
  integration (the `caputchin` skill's widget + verify references).
- **Rotate a leaked secret:** `caputchin_rotate_site_secret`, then update the
  backend's `CAPUTCHIN_SECRET`. Rotate PATs with `caputchin_rotate_token`.
- **Investigate failures:** `caputchin_site_stats_rejections` and
  `caputchin_list_site_sessions` to see why verifications are being rejected.
- **Tighten security:** `caputchin_get_site_security` then
  `caputchin_update_site_security` (and the troop-level equivalents for a team
  default).

## Learn more

- MCP package reference: https://github.com/Caputchin/caputchin-sdk/tree/main/packages/mcp/docs
- Customer docs portal: https://docs.caputchin.com
