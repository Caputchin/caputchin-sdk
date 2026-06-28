# Caputchin agent skills

Official [agent skills](https://agentskills.io) that teach AI coding agents how to
use [Caputchin](https://caputchin.com), a game-based human-verification and
bot-protection service (a CAPTCHA alternative).

This plugin bundles two skills:

| Skill | What it covers |
| --- | --- |
| `caputchin` | Integrate the widget, verify tokens server-side, manage Caputchin through the MCP server, and troubleshoot integrations. |
| `caputchin-game-development` | Build a custom verification game: the `register` entry point, the deterministic server-replay `run` contract, the determinism kit, engine presets, the `caputchin.json` manifest, and marketplace publishing. |

Each skill is a thin router; depth lives in `skills/<name>/references/*.md`, loaded
on demand. The skills are stack-agnostic (plain HTML plus any backend language)
and built on the published `@caputchin/*` packages.

## Install (Claude Code)

```text
/plugin marketplace add Caputchin/caputchin-sdk
/plugin install caputchin@caputchin
```

The skills then trigger automatically when you work on Caputchin integration or
game development. `/plugin marketplace update` pulls newer versions.

## Use elsewhere

The skill folders under `skills/` are standard `SKILL.md` packages, portable to
any agent that reads the open Agent Skills format. To publish or mirror them to
other channels (skills.sh, claude.ai, the Claude API, third-party directories),
see [PUBLISHING.md](PUBLISHING.md).

## Security

Install these skills only from the official source
(`Caputchin/caputchin-sdk`). A skill carries instructions an agent will follow;
treat any copy from an unverified source as untrusted and audit it first.

## License

Apache-2.0, same as the rest of [caputchin-sdk](https://github.com/Caputchin/caputchin-sdk).
