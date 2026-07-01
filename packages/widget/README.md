# @caputchin/widget

The customer-facing CAPTCHA web component. Drop `<caputchin-widget>` (the cap check) or `<caputchin-game>` (a game challenge) into any page and it handles challenge flow, game iframe isolation, and token injection automatically.

## Install

```sh
npm install @caputchin/widget
```

Or via CDN (no bundler required):

```html
<script src="https://cdn.jsdelivr.net/npm/@caputchin/widget@3/dist/widget.js" async defer></script>
```

## Usage

```html
<!-- Plain cap check (checkbox; add the `invisible` attribute for no visible UI) -->
<caputchin-widget sitekey="cpt_pub_..."></caputchin-widget>

<!-- Game challenge: use the caputchin-game element -->
<caputchin-game
  sitekey="cpt_pub_..."
  game="owner/repo"
></caputchin-game>

<!-- Game host only, no cap verification: omit the sitekey or add `no-verify` -->
<caputchin-game game="owner/repo" no-verify></caputchin-game>
```

On completion the widget injects `<input name="caputchin-token">` into the enclosing form (and fires a `pass` event carrying the token). Post that field to your backend and verify it against `/siteverify`.

`<caputchin-widget>` runs the cap check; control when it starts with `trigger` (`auto` default, `click`, `form-submit`, or `manual`). `<caputchin-game>` hosts a game challenge and runs the cap gate when a `sitekey` is present and `no-verify` is not set (omit the sitekey or add `no-verify` for game-only).

The game iframe is sandboxed (`allow-scripts` only, opaque origin), so no third-party game script touches the host page.

## Live theming and language

`skin` and `locale` are live: change either attribute on a mounted element and it re-themes or re-localizes in place, with no remount and no re-verification. An already-solved token (and the injected `caputchin-token` field) is preserved, so a visitor who has passed the check does not have to solve it again after a theme or language switch.

```js
const el = document.querySelector('caputchin-widget');
el.setAttribute('skin', 'dark');   // recolors in place
el.setAttribute('locale', 'ar');   // re-localizes in place, RTL-aware
```

When `skin` is `auto` (or unset) the widget follows the visitor's operating-system light/dark preference and updates automatically when it changes. An explicit `skin` value always wins.

For `<caputchin-game>`, a live `skin` or `locale` change re-themes the surrounding widget shell in place. A game that is already open in its iframe keeps its current theme until it next starts.

## Full reference

- [API reference](./docs/README.md): attributes, events, error codes, and types, generated from source.
- [Customer docs portal](https://docs.caputchin.com): guides and end-to-end integration walkthroughs.
