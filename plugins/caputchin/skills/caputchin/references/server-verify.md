# Server-side verification

The token from the widget's `pass` event proves nothing until your server
confirms it. This is the half that actually stops bots: a forged or replayed
token fails here.

## The call

`POST https://verify.caputchin.com/v1/siteverify` with a JSON body:

| Field | Value |
| --- | --- |
| `secret` | Your site secret key. Server-only. Never in client code or a public repo. |
| `response` | The token from `e.detail.token` (the widget's `pass` event). |

Response JSON:

| Field | Meaning |
| --- | --- |
| `success` | `true` only when the token is valid, unused, unexpired, and the verification passed. Gate on this. |
| `error-codes` | Array of reason strings present when `success` is `false`. |

Verify on receipt. The token is single-use and short-lived: do not cache it,
do not verify it twice, do not accept it from anywhere but the request you are
checking.

## Snippets by language

These mirror the output of the `caputchin_siteverify_example` MCP tool. `token`
is the value the client submitted; the secret comes from an environment
variable, never a literal.

**Node / JavaScript / TypeScript (Node 18+, built-in fetch):**

```js
const res = await fetch("https://verify.caputchin.com/v1/siteverify", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ secret: process.env.CAPUTCHIN_SECRET, response: token }),
});
const verdict = await res.json();
if (!verdict.success) throw new Error(verdict["error-codes"].join(","));
```

**Python:**

```python
import os, requests
res = requests.post(
    "https://verify.caputchin.com/v1/siteverify",
    json={"secret": os.environ["CAPUTCHIN_SECRET"], "response": token},
    timeout=10,
)
verdict = res.json()
if not verdict.get("success"):
    raise RuntimeError(verdict.get("error-codes"))
```

**Go:**

```go
body, _ := json.Marshal(map[string]string{
    "secret":   os.Getenv("CAPUTCHIN_SECRET"),
    "response": token,
})
res, err := http.Post(
    "https://verify.caputchin.com/v1/siteverify",
    "application/json",
    bytes.NewReader(body),
)
if err != nil { return err }
defer res.Body.Close()
var verdict struct{ Success bool `json:"success"` }
json.NewDecoder(res.Body).Decode(&verdict)
if !verdict.Success { return fmt.Errorf("captcha failed") }
```

**PHP:**

```php
$res = file_get_contents('https://verify.caputchin.com/v1/siteverify', false, stream_context_create([
    'http' => [
        'method'  => 'POST',
        'header'  => 'content-type: application/json',
        'content' => json_encode([
            'secret'   => getenv('CAPUTCHIN_SECRET'),
            'response' => $token,
        ]),
    ],
]));
$verdict = json_decode($res, true);
if (!$verdict['success']) {
    throw new Exception(implode(',', $verdict['error-codes']));
}
```

**curl (smoke test):**

```bash
curl -sS -X POST https://verify.caputchin.com/v1/siteverify \
  -H "content-type: application/json" \
  -d "{\"secret\":\"$CAPUTCHIN_SECRET\",\"response\":\"$TOKEN\"}"
```

The exact verification host can be overridden in self-hosted or staging setups
via the `CAPUTCHIN_VERIFY_HOST` environment variable on the MCP server; the
public default is `verify.caputchin.com`.

## Handling the outcome

- `success: true`: proceed with the request (create the account, submit the
  form, send the message).
- `success: false`: reject and ask the visitor to retry. Surface a generic
  message to the user; log `error-codes` for yourself. Common reasons are an
  expired or already-used token and a token that does not match the site key.
- **Network error / timeout reaching siteverify:** decide a policy deliberately.
  Fail closed (reject) for high-value actions; fail open only where a brief
  outage must not block users, and log it.

## Tip: generate a snippet on demand

If you have the Caputchin MCP server connected, the offline tool
`caputchin_siteverify_example` returns a ready snippet for `node`, `javascript`,
`typescript`, `python`, `go`, `php`, or `curl` without any API call. See
[mcp.md](mcp.md).

## Learn more

- Customer docs portal: https://docs.caputchin.com
- Client side that produces the token: [widget-integration.md](widget-integration.md)
