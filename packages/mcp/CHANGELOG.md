# Changelog

## [2.0.0](https://github.com/Caputchin/caputchin-sdk/compare/mcp-v1.0.0...mcp-v2.0.0) (2026-05-18)


### ⚠ BREAKING CHANGES

* **mcp:** rename plan tiers free→solo, paid→alpha (BREAKING)
* **mcp:** drop ratelimit_duration_ms from cap-config tool (platform-locked at 1 minute)

### Features

* **mcp:** drop allowed_domains from create/update site tools (cap-side cors_origins is SoT) ([4e0971d](https://github.com/Caputchin/caputchin-sdk/commit/4e0971d9d74b111fe4e6d4520644b3cb5089e486))
* **mcp:** drop ratelimit_duration_ms from cap-config tool (platform-locked at 1 minute) ([7520566](https://github.com/Caputchin/caputchin-sdk/commit/75205664787b023f99d68f33b8cd714e468d0903))
* **mcp:** drop webhook secret from hosted-verification, add test delivery tool ([5c162b6](https://github.com/Caputchin/caputchin-sdk/commit/5c162b67f38b30e6cb5c3a39310ffe82d2bc3a6f))
* **mcp:** refresh ratelimit_max description (per-second window, plan-capped) ([afb342d](https://github.com/Caputchin/caputchin-sdk/commit/afb342d0f15bdb80b278c42d6e8386bb096cc13e))
* **mcp:** rename plan tiers free→solo, paid→alpha (BREAKING) ([a6b8f9d](https://github.com/Caputchin/caputchin-sdk/commit/a6b8f9d66fa928670bfec597f17441bafda9ad8c))


### Reverts

* release-please PR [#10](https://github.com/Caputchin/caputchin-sdk/issues/10) due to broken title pattern config ([52b9413](https://github.com/Caputchin/caputchin-sdk/commit/52b9413168769ade1b94f31ad091403e81481317))

## 1.0.0 (2026-05-13)


### Features

* **backend:** scaffold @caputchin/mcp skeleton with stdio MCP server ([cb95812](https://github.com/Caputchin/caputchin-sdk/commit/cb95812b55520ad3717c746e549bde364c3c27ef))
* **mcp:** add caputchin_get_site_cap_config + caputchin_update_site_cap_config tools ([9d02bde](https://github.com/Caputchin/caputchin-sdk/commit/9d02bde2af3fb60459c4107c57de1f2633ed986f))
* **mcp:** add local-only snippet tools, tests, README ([5dfc0bd](https://github.com/Caputchin/caputchin-sdk/commit/5dfc0bdda5a0d8d9b32e3ee1753d3eaac5cb02b0))
* **mcp:** add me/* tools — get_account, change_email, list_sessions, revoke_session ([1d3f7a2](https://github.com/Caputchin/caputchin-sdk/commit/1d3f7a2ebc31faca243bf1bc0d9c22bae57ca373))
* **mcp:** wire management tools (sites, tokens, hosted-verification) ([fc52497](https://github.com/Caputchin/caputchin-sdk/commit/fc524976fc58e435156fca51637b354f25b1803e))


### Bug Fixes

* **mcp:** address QA minors M9 M10 M11 in README and tools tests ([01ee659](https://github.com/Caputchin/caputchin-sdk/commit/01ee6592b73fd8aa4aece47c76b22ee2a6a2b582))
* **mcp:** consolidate tests, rename env var, redact tokens, catch network errors ([779489b](https://github.com/Caputchin/caputchin-sdk/commit/779489be462d8bbcc50df5dfbcb2e306b15ad461))
* **mcp:** type fetchSpy with MockInstance + add workspace verify script ([5e99e31](https://github.com/Caputchin/caputchin-sdk/commit/5e99e317de1375c43adfe86bb17824f73b984f4f))
