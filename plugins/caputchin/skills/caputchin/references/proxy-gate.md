# Proxy page-gate

A third way to integrate Caputchin, distinct from the inline widget. Instead of embedding the widget on a page, you put a full-page verification in front of a whole site or route at the customer's **reverse proxy**. One solve grants a short-lived pass (a first-party cookie) that clears the visitor's later requests until it expires. The protected app is not modified at all.

## When to reach for this

- The host cannot embed the widget: a compiled single-page login portal, an appliance, an internal tool behind an auth proxy. **Authelia** is the canonical case (its login UI is a Go binary with no injection slot and no plugin hook), so the two inline halves have nowhere to attach.
- You want "prove you are human before you reach this site" rather than a check on one specific form.

For a normal page or form that CAN embed the widget, use the inline model instead (see widget-integration.md and server-verify.md). Reach for the gate only when there is no place to mount the widget or the goal is to gate a whole site.

## How it works

The gate is hosted by Caputchin; the customer wires their existing reverse proxy to it. Three endpoints on `verify.caputchin.com`:

- `GET /v1/gate/authz?site=<cpt_pub>`: the per-request check the proxy calls (nginx `auth_request` / Traefik `forwardAuth`). Reads the `cpt_gate` cookie, returns 204 (allow) or 401 (challenge).
- `GET /v1/gate/challenge?site=<cpt_pub>&return=<url>`: the hosted interstitial the proxy redirects an un-cleared visitor to. It runs the game.
- `POST /v1/gate/clear`: the challenge page posts the solved token here; the server mints the pass and hands it back for the customer callback to set as a cookie.

Flow: request a gated URL, proxy asks `authz`, no pass so redirect to `challenge`, solve the game, the page posts the pass to a small `/__cpt/callback` on the customer's own origin, the callback sets the `cpt_gate` cookie and redirects the visitor onward. Later requests carry the cookie and pass `authz` until the pass expires.

## Key facts

- Enabled per site key, on the **Alpha plan and up**. Settings: clearance TTL and fail mode (fail-closed blocks on an outage, fail-open allows).
- The pass is a signed, short-TTL, site-bound cookie. It is not tied to IP or device. Its protection is the short TTL plus the cookie attributes the customer callback sets: `HttpOnly; Secure; SameSite=Lax`. The callback must also confirm its redirect target is same-origin.
- The widget still writes no storage. The cookie is a first-party functional cookie the customer's proxy sets on the customer's own domain, in the same category as an auth portal's own session cookie. Disclose it in the cookie policy.
- Turn on the site-key-wide preview mode first to run the gate in monitor mode (log, do not block) while confirming the wiring.

## Full setup

The per-proxy recipes (nginx, Traefik, Caddy), the callback contract, and the Authelia worked example live in the Proxy page-gate docs: https://docs.caputchin.com/proxy-page-gate/reverse-proxy-recipes

Point the user there for the concrete config; this reference is for deciding whether the gate is the right integration and understanding the shape.
