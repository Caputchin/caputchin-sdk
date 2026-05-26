# @caputchin/widget

The customer-facing CAPTCHA web component. Drop `<caputchin-widget>` into any page and it handles challenge flow, game iframe isolation, and token injection automatically.

## Install

```sh
npm install @caputchin/widget
```

Or via CDN (no bundler required):

```html
<script src="https://cdn.jsdelivr.net/npm/@caputchin/widget@1/dist/widget.js" async defer></script>
```

## Usage

```html
<caputchin-widget sitekey="cpt_pub_..."></caputchin-widget>

<caputchin-widget
  sitekey="cpt_pub_..."
  game="@cooperative-games/bubble-pop"
></caputchin-widget>

<!-- game host only, no bot-prevention -->
<caputchin-widget
  mode="game-only"
  game="@cooperative-games/bubble-pop"
></caputchin-widget>
```

The widget injects `<input name="caputchin-token">` into the enclosing form on completion. Post that field to your backend and verify it against `/siteverify`.

Modes — `auto` (default), `form-submit`, `manual`, `game-only`. The first three run Cap and produce a token; `game-only` skips Cap entirely and just hosts the game. Omitting `sitekey` is shorthand for `game-only`.

The game iframe is sandboxed (`allow-scripts` only, opaque origin) — no third-party game script touches the host page.

## Full reference

[docs/widget.md](../../docs/widget.md) — attributes, events, modes, error codes, programmatic API.

[Integration guide](../../docs/guides/integrate-widget.md) — end-to-end walkthrough.
