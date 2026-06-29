# Widget integration

How to mount the Caputchin widget on a page, choose the right form, and get the
token to your backend. The widget ships as `@caputchin/widget` and registers two
custom elements. This is stack-agnostic; framework notes are at the end.

## Install

Two ways. Pick one.

**Script tag (no bundler):**

```html
<script src="https://cdn.jsdelivr.net/npm/@caputchin/widget@3/dist/widget.js"></script>
```

**npm (bundlers / frameworks):**

```bash
npm install @caputchin/widget
```

```js
import "@caputchin/widget"; // registers the custom elements as a side effect
```

The `@3` in the CDN URL pins the current major version. The only key that ever
belongs on the client is the public site key (`cpt_pub_...`) from your dashboard.

## Choose the element and form

| Goal | Element + attributes |
| --- | --- |
| Invisible check (no UI, runs per trigger) | `caputchin-widget` with the `invisible` boolean attribute |
| Visible checkbox + brand strip | `caputchin-widget` (default, no `invisible`) |
| Game challenge from the marketplace | `caputchin-game` with `game="owner/repo"` |
| Random game from a pool | `caputchin-game` with `games="ownerA/repoA,ownerB/repoB"` |
| Your own self-hosted game bundle | `caputchin-game` with `game-src="https://..."` |

### `caputchin-widget` (cap check only)

```html
<caputchin-widget sitekey="cpt_pub_YOUR_KEY"></caputchin-widget>
```

Attributes:

| Attribute | Values | Notes |
| --- | --- | --- |
| `sitekey` | `cpt_pub_...` | Required. Without it the widget stays inert and emits a `warn` error event. |
| `invisible` | boolean (present/absent) | No visible UI; verification still runs per `trigger`. There is no `mode` attribute. |
| `trigger` | `auto`, `click`, `form-submit`, `manual` | When verification begins: on mount, on the checkbox, on the enclosing form submit, or when you call `start()`. |
| `size` | `normal`, `compact` | Checkbox density. |
| `width` / `height` | `auto`, `full`, or a pixel number | Layout sizing. |
| `skin` | preset name / `auto` | Visual skin; `auto` honors `prefers-color-scheme`. Inline JSON is rejected on this element; style via `--cpt-skin-*` CSS vars and `::part()`. |
| `locale` | preset name / ISO code | Shell language. Inline JSON rejected here. |

For `trigger="manual"`, start it yourself: `element.start()`.

### `caputchin-game` (game challenge)

```html
<caputchin-game sitekey="cpt_pub_YOUR_KEY" game="owner/repo" layout="modal"></caputchin-game>
```

Key attributes (beyond `sitekey`, `skin`, `locale`, `width`, `height`):

| Attribute | Values | Notes |
| --- | --- | --- |
| `game` | one marketplace id (`owner/repo` or `owner/repo/leaf`) | Resolved to a bundle server-side. |
| `games` | comma-separated ids | Widget picks one at random per session. |
| `game-src` | HTTPS URL | A bundle you host yourself; bypasses marketplace resolution. |
| `layout` | `auto`, `inline`, `modal`, `fullscreen` | How the game presents. Trigger is derived from layout (inline opens on mount, modal/fullscreen open on click) unless you set `trigger="manual"`. |
| `no-verify` | boolean | Run the game with no cap gate (still receives overrides). Implied when there is no `sitekey`. |

On `caputchin-game` without a sitekey, the `pass` event carries `token: null`
(game-only, nothing to verify).

## Get the token (the part people miss)

The token reaches your server two ways. Use whichever fits your stack.

**1. Hidden form field (classic form posts).** Put the element inside your
`<form>`. On success the widget auto-injects a hidden input named
`caputchin-token`, so a normal submit sends it like any other field; your server
reads `caputchin-token` from the form body and passes it as the `response` to
siteverify. With `trigger="form-submit"` the widget runs as the form submits,
gating the submission on verification. No JavaScript required.

**2. The `pass` event (SPA, fetch, custom flows).** Read the token from the
event detail and send it yourself:

```js
const el = document.querySelector('caputchin-widget'); // or 'caputchin-game'
el.addEventListener('pass', (e) => {
  const token = e.detail.token;        // send this to your server as `response`
  // e.detail.score, e.detail.durationMs are analytics only, never trust signals
});
```

## Events you can listen for

| Event | `detail` | Use |
| --- | --- | --- |
| `pass` | `{ token, score, durationMs }` | Verification released; grab the token. |
| `error` | `{ code, message, severity, originalCode? }` | Something degraded or failed; see below. |
| `start` | start payload | Verification began. |
| `dialog-shown` / `dialog-hidden` | visibility detail | Game overlay opened/closed. |
| `layout-resolved` | `{ layout, source }` | Which layout the game settled on. |
| `nickname` | nickname detail | Optional player nickname signal. |

### Error handling

`error.detail.severity` is `warn` (degraded but running) or `error` (broke).
Branch on `error.detail.code`:

| Code | Severity | Meaning |
| --- | --- | --- |
| `invalid-config` | warn | A rejected attribute (e.g. missing/garbled value). |
| `invalid-call` | warn | A method called when not valid (e.g. `start()` on a non-manual trigger). |
| `verification-failed` | error | The cap gate failed. |
| `game-load-failed` | error | The game bundle could not load. |
| `gate-unavailable` | error | The verification backend was unreachable. |
| `game-error-relayed` | error | The game itself reported an error. |

Filter on `severity` rather than hardcoding a code-to-severity table.

## Framework notes

The elements are standard custom elements, so they work in any framework that
renders HTML. The only cross-framework gotchas are the usual web-component ones:

- **React (<19):** custom events do not bind via JSX `onPass`. Get a ref and
  `addEventListener('pass', ...)` in an effect; remove it on cleanup. React 19+
  supports custom element events and properties directly.
- **Vue:** tell the compiler these are custom elements (`isCustomElement` /
  `compilerOptions.isCustomElement`) so it does not warn or try to resolve them
  as components. Listen with `@pass`.
- **Angular:** add `CUSTOM_ELEMENTS_SCHEMA` to the module/component.
- **SSR:** the element only activates in the browser; render the tag in markup
  and let it upgrade on hydration. Do not import the package on the server.

## Learn more

- Widget API reference (every attribute, event, and type):
  https://github.com/Caputchin/caputchin-sdk/tree/main/packages/widget/docs
- Customer docs portal: https://docs.caputchin.com
- After the client side works, verify the token: [server-verify.md](server-verify.md)
