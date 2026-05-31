# Interface: LocaleKeySchema

Documentation entry for a single text key in `locales.presets`.
 Optional and additive: omitting `schema` entirely or omitting individual
 keys does not affect resolution. Schema is consumed by author tooling,
 translator workflows, and the future per-site-key override dashboard;
 the widget runtime ignores it.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="description"></a> `description` | `string` | Longer helper text: what this string IS in the UX, not where it appears in code. |
| <a id="name"></a> `name` | `string` | Short readable label translators see in tooling and dashboard. |
| <a id="tokens"></a> `tokens?` | `string`[] | Token placeholder names this string interpolates (without braces). Declared once at the manifest level so dashboards can render labeled inputs and CI checks can assert every locale preserves the tokens. Omit when the string has no interpolation. |
