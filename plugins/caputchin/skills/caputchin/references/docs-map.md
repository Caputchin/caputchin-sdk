# Docs map

When a question is not fully answered by this skill, point to the authoritative
source instead of guessing. Caputchin has two doc surfaces:

- **Customer docs portal:** https://docs.caputchin.com (guides, concepts, how-tos)
- **SDK API reference (TypeDoc, on GitHub):** generated from source, always
  matches the published package:
  https://github.com/Caputchin/caputchin-sdk/tree/main/packages

## Question to source

| The question is about... | Go to |
| --- | --- |
| What Caputchin is, how verification works conceptually | https://docs.caputchin.com (getting started / understanding) |
| Quickstart, first integration | https://docs.caputchin.com getting-started |
| Every widget attribute, event, type | packages/widget/docs on GitHub |
| Customizing the widget look (skins, CSS parts, white-label) | https://docs.caputchin.com widget-customization |
| Server-side verification details | https://docs.caputchin.com plus this skill's server-verify reference |
| Site keys, secret management, rotation | https://docs.caputchin.com site-keys |
| Troops (teams), members, PAT management | https://docs.caputchin.com troops |
| Account, billing, seats, audit logs | https://docs.caputchin.com account-management |
| Hosted (no-code) verification | https://docs.caputchin.com hosted-verification |
| The management API surface (REST / OpenAPI) | https://docs.caputchin.com references |
| The MCP server and its tools | packages/mcp/docs on GitHub, plus this skill's mcp reference |
| Building a verification game | https://docs.caputchin.com game development, plus the `caputchin-game-development` skill |
| Publishing a game to the marketplace | https://docs.caputchin.com marketplace |

## Rule

Prefer the TypeDoc reference for exact signatures, attributes, events, and types
(it cannot drift from the code). Prefer the portal for concepts, flows, and
account or dashboard tasks. If the two ever disagree, the TypeDoc reference wins
for API shape; flag the discrepancy.
