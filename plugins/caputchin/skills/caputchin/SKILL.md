---
name: caputchin
description: Integrate and operate Caputchin, a game-based human-verification and bot-protection service (a CAPTCHA alternative). Use this whenever the user is adding bot, spam, or abuse protection to a website, web app, sign-up, login, or form; embedding or configuring the Caputchin widget (the caputchin-widget or caputchin-game custom element); getting or rotating a site key; verifying a Caputchin token on the server with the siteverify endpoint; managing Caputchin sites, secret keys, troops, members, usage stats, audit logs, or security settings through the Caputchin MCP server; or troubleshooting why the widget will not render, the token is rejected, or verification keeps failing. Works with plain HTML and any backend language (stack-agnostic). Reach for it even when the user does not name Caputchin explicitly but clearly needs human verification or wants to stop bots.
license: Apache-2.0
metadata:
  source: https://github.com/Caputchin/caputchin-sdk
---

# Caputchin

Caputchin is a human-verification service: a CAPTCHA alternative where a visitor
proves they are human (an invisible proof-of-work check, a checkbox, or a short
game) and your server confirms the result before trusting the request.

## Mental model (read this first)

Verification is always two halves. Get this right and most problems disappear:

1. **Client** mounts the Caputchin widget with your **public site key**
   (`cpt_pub_...`). On success the widget emits a `pass` event carrying an
   opaque **token**.
2. **Server** sends that token plus your **secret key** to the `siteverify`
   endpoint and reads `success`. Only the server outcome is trustworthy. Never
   gate on anything the client reports (score, duration); those are analytics.

The token is single-use and short-lived: verify it server-side immediately, once.

Two custom elements ship in `@caputchin/widget`:

| Element | Use it for |
| --- | --- |
| `caputchin-widget` | The plain cap check: a checkbox, or fully invisible. No game. |
| `caputchin-game` | A game-based challenge (marketplace game, a pool, or your own bundle), with optional cap verification alongside. |

## Router: pick the task, read the reference

Each reference is self-contained. Read the one that matches; do not load them all.

| The user wants to... | Read |
| --- | --- |
| Put the widget on a page, choose visible vs invisible vs game, wire the token | [references/widget-integration.md](references/widget-integration.md) |
| Verify the token on the backend (any language), handle outcomes and errors | [references/server-verify.md](references/server-verify.md) |
| Create or manage sites, keys, troops, stats, or security via an AI agent | [references/mcp.md](references/mcp.md) |
| Fix a blank widget, a rejected token, CSP errors, or failing verification | [references/troubleshooting.md](references/troubleshooting.md) |
| Find the right official doc for a question this skill does not cover | [references/docs-map.md](references/docs-map.md) |

## Fastest correct path (invisible check)

When the user just wants to protect a form and asks for the shortest setup, give
them both halves. Details, options, and framework notes are in the references.

Client (any HTML page):

```html
<script src="https://cdn.jsdelivr.net/npm/@caputchin/widget@3/dist/widget.js"></script>
<caputchin-widget sitekey="cpt_pub_YOUR_KEY" invisible trigger="form-submit"></caputchin-widget>
```

Read the token from the `pass` event and send it to your backend:

```js
document.querySelector('caputchin-widget')
  .addEventListener('pass', (e) => {
    // e.detail.token is the value your server verifies. Submit it with the form.
  });
```

Server (verify before trusting the request):

```js
const res = await fetch("https://verify.caputchin.com/v1/siteverify", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ secret: process.env.CAPUTCHIN_SECRET, response: token }),
});
const verdict = await res.json();
if (!verdict.success) throw new Error(verdict["error-codes"].join(","));
```

## Rules that keep integrations correct

- **The secret key is server-only.** Never ship it to the browser, a mobile app
  bundle, or a public repo. The public site key (`cpt_pub_...`) is the only key
  that belongs on the client.
- **Trust the server, not the client.** A `pass` event means the visitor
  finished, not that the request is safe. The request is safe only after
  `siteverify` returns `success: true`.
- **One token, one verification.** Tokens are single-use and expire. Verify on
  receipt; do not cache or replay them.
- **Allow the Caputchin hosts in your CSP.** A locked-down `connect-src` /
  `script-src` is the most common cause of a silent blank widget. See the
  troubleshooting reference.

## Learn more

- Customer docs portal: https://docs.caputchin.com
- Widget API reference (TypeDoc): https://github.com/Caputchin/caputchin-sdk/tree/main/packages/widget/docs
- Building a game instead of embedding one: the `caputchin-game-development` skill.
