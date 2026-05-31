# Interface: MarketplaceMetadata

Marketplace-discovery metadata block in `caputchin.json`. Presence of
 this block is the "yes, please index this" signal - a manifest with
 runtime blocks but no `marketplace` object is a valid customer-hosted
 game that the marketplace simply ignores. None of these fields are read
 at runtime by the widget or the SDK; they drive the marketplace card
 + browse filters and the indexer's bundle-URL resolution.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="author"></a> `author?` | `object` | Optional author block. Each subfield is optional. `name` and `url` may render on the marketplace detail page as an author byline. `email` is never shown publicly; the platform uses it only to notify the author when the daily index run fails to register their game. Omit the whole block to fall back to the GitHub owner for display and to receive no failure notifications. |
| `author.email?` | `string` | - |
| `author.name?` | `string` | - |
| `author.url?` | `string` | - |
| <a id="description"></a> `description?` | `string` | - |
| <a id="name"></a> `name?` | `string` | - |
| <a id="preview"></a> `preview?` | `string` | - |
| <a id="support"></a> `support?` | `object` | - |
| `support.accessible?` | `boolean` | - |
| `support.audio?` | `string` | - |
| `support.responsive?` | `boolean` | - |
| `support.touch?` | `boolean` | - |
| <a id="version"></a> `version?` | `string` | - |
