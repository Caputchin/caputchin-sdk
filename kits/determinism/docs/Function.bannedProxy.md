# Function: bannedProxy()

> **bannedProxy**(`fail`): `unknown`

Build the value that replaces a banned global: a Proxy (over a function
target) so it fails LOUD on every use shape - calling it (`fetch()`),
constructing it (`new Date()`), AND reading any property
(`crypto.getRandomValues`, `Intl.DateTimeFormat`, `navigator.language`) - the
last is why a plain throwing function is not enough for namespace globals,
where method access would otherwise be a cryptic `undefined is not a
function`. `typeof` still reports `'function'` so benign feature-detection
doesn't trip; symbol reads return `undefined` so host coercion machinery is
left alone.

The thrown value is the caller's: the shim throws a human-readable Error, the
prober throws a tagged error it uses to name the touched surface - so the
Proxy mechanics are shared but each consumer keeps its own failure signal.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `fail` | () => `never` | Invoked on every access; must throw (its return type is `never`). |

## Returns

`unknown`
