# @caputchin/widget

The customer-facing CAPTCHA web component. Drop `<caputchin-widget>` into any page and it handles challenge flow, game iframe isolation, and token injection automatically.

## Install

```sh
npm install @caputchin/widget
```

Or via CDN (no bundler required):

```html
<script src="https://cdn.jsdelivr.net/npm/@caputchin/widget@1/dist/widget.global.js"></script>
```

## Usage

```html
<caputchin-widget sitekey="cpt_pub_..."></caputchin-widget>

<caputchin-widget
  sitekey="cpt_pub_..."
  game="@cooperative-games/bubble-pop"
></caputchin-widget>
```

The widget injects `<input name="caputchin-token">` into the enclosing form on completion. Post that field to your backend and verify it against `/siteverify`.

The game iframe is sandboxed (`allow-scripts` only, opaque origin) — no third-party game script touches the host page. See [ADR-0015](../../docs/adr/0015-sandbox-game-iframe.md).

## Full reference

[docs/widget.md](../../docs/widget.md) — attributes, events, modes, error codes, programmatic API.

[Integration guide](../../docs/guides/integrate-widget.md) — end-to-end walkthrough.
