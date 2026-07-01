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

## Live attributes

Several attributes update in place on a mounted element, with no remount, preserving an already-solved token (and the injected `caputchin-token` field), so a visitor who has passed the check does not have to solve it again after the change:

- `skin` and `locale` re-theme and re-localize in place (RTL-aware). The new preset is resolved from the server, and a solved token is preserved.
- `width`, `height`, and `size` on `<caputchin-widget>`, and `width`, `height`, `overlay-width`, and `overlay-height` on `<caputchin-game>`, resize live.

```js
const el = document.querySelector('caputchin-widget');
el.setAttribute('skin', 'dark');   // recolors in place
el.setAttribute('locale', 'ar');   // re-localizes in place, RTL-aware
el.setAttribute('width', '360');   // resizes in place
```

When `skin` is `auto` (or unset) the widget follows the visitor's operating-system light/dark preference and updates automatically when it changes. An explicit `skin` value always wins.

For `<caputchin-game>`, a live `skin` or `locale` change re-themes the surrounding widget shell in place; a game already running in its iframe keeps its current theme until it next starts. A live geometry change re-mounts the game at the new size, which restarts it, except that a finished (already-verified) game keeps its size and is not restarted. Attributes other than the ones listed above are read once at mount; change them by removing and re-adding the element.

## Full reference

- [API reference](./docs/README.md): attributes, events, error codes, and types, generated from source.
- [Customer docs portal](https://docs.caputchin.com): guides and end-to-end integration walkthroughs.
