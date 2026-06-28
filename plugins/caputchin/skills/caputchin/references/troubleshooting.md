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

| Reason in `error-codes` / symptom | Cause | Fix |
| --- | --- | --- |
| Token expired | Verified too late, or the token sat in a queue | Verify on receipt; tokens are short-lived. |
| Token already used | Verified twice, or replayed | Verify exactly once per token; never cache or reuse. |
| Key mismatch | The secret does not pair with the site key that issued the token | Use the secret from the same site as the public key on the page. |
| Wrong secret | Using the public key, a PAT, or a stale secret as `secret` | `secret` is the site secret key, server-side only, not the `cpt_pub_` key and not a PAT. |
| Domain not allowed | The page origin is not on the site's allowlist | Add the origin in the dashboard (or via `caputchin_update_site`). |
| Always fails in dev | Localhost not allowed, or clock skew | Allow your dev origin; ensure the server clock is roughly correct (token expiry is time-based). |

## CSP: hosts to allow

A locked-down CSP silently breaks the widget. Allow the Caputchin hosts:

```
script-src  https://cdn.jsdelivr.net ;   # if loading the widget from the CDN
connect-src https://verify.caputchin.com ;
frame-src   https://verify.caputchin.com ;  # for game challenges that mount an iframe
```

Adjust hosts if you self-host the bundle or run a custom verification host. After
changing CSP, hard-reload; the browser caches policy aggressively.

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
