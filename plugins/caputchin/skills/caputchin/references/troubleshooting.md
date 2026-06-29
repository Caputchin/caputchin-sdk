# Troubleshooting

Diagnose the common Caputchin integration failures. Most reduce to one of three
root causes: a blocked network (CSP), a key/host mismatch, or trusting the client
instead of the server. Work top-down.

## The widget does not render (blank space)

| Likely cause | Check | Fix |
| --- | --- | --- |
| Content Security Policy blocks the script or its calls | Browser console shows a CSP violation for `cdn.jsdelivr.net` or `verify.caputchin.com` | Allow the Caputchin hosts in your CSP (see the CSP section below). This is the most common cause. |
| Script never loaded | Network tab: the `widget.js` request is missing or 404 | Confirm the `<script src>` URL and that it is not blocked by an ad blocker or a bundler misconfig. |
| Missing or wrong site key | An `error` event with `code: "invalid-config"`, `severity: "warn"` | Set a valid public `sitekey` (`cpt_pub_...`). Without it the widget stays inert. |
| Invisible by design | You set the `invisible` attribute | That is expected: no UI renders, verification still runs per `trigger`. Listen for `pass`. |
| Element not upgraded (framework/SSR) | The tag is in the DOM but inert | Ensure the package is imported client-side and the framework treats it as a custom element (see widget-integration framework notes). |

## Verification keeps failing (`success: false`)

| `error-codes` value / symptom | Cause | Fix |
| --- | --- | --- |
| `timeout-or-duplicate` | Token expired (10 minute TTL) or already verified once | Verify on receipt, exactly once; never cache or reuse. Re-challenge the visitor. |
| `invalid-input-response` | The `response` token was missing or malformed | Send the real token (the `pass` event's `detail.token`, or the auto-injected `caputchin-token` form field). |
| `site-mismatch` | The token was issued for a different site than this `secret` | Use the secret from the SAME site as the public key on the page. |
| Wrong value as `secret` | Passing the `cpt_pub_` public key or a PAT as `secret` | `secret` is the site secret key, server-side only. |
| Always fails in dev | Server clock skew (the TTL is time-based), or a mismatched key pair | Check the server clock; confirm the secret pairs with the page's public key. |

If a site restricts which origins may embed it, the widget will not issue a token
on a disallowed origin (you see an `error` event, not a siteverify failure); add
the origin in the dashboard or via `caputchin_update_site`.

## CSP: hosts to allow

A locked-down CSP silently breaks the widget. Allow the Caputchin hosts:

```
script-src  https://cdn.jsdelivr.net ;                                  # only if you load widget.js from the CDN
connect-src https://verify.caputchin.com https://games.caputchin.com ;  # verification + marketplace game bundles
```

The game challenge renders in a `srcdoc` iframe (inline HTML), so no external
`frame-src` host is required. If you load a self-hosted or jsDelivr-hosted custom
game bundle, add that origin (for example `https://cdn.jsdelivr.net`) to
`connect-src`. If you run a custom verification host, swap `verify.caputchin.com`
for it. After changing CSP, hard-reload; the browser caches policy aggressively.

## The token is null

On `caputchin-game` without a `sitekey`, `pass` carries `token: null` by design
(game-only, no verification). Add a `sitekey` to get a verifiable token.

## "It works in the browser but bots still get through"

You are trusting the client. A `pass` event, a non-null `score`, or a short
`durationMs` are not proof. Gate the request on `siteverify` returning
`success: true` on your server. `score` and `durationMs` are analytics only.

## Still stuck

- Inspect rejections directly: the MCP tools `caputchin_site_stats_rejections`
  and `caputchin_list_site_sessions` ([mcp.md](mcp.md)).
- Re-read the two halves in the parent skill's mental model; a mismatch between
  the client key and the server secret is the usual culprit.
- Customer docs portal: https://docs.caputchin.com
