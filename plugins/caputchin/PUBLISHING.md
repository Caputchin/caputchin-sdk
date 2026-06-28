# Publishing the Caputchin skills

The skills live in this one repo and everything else points back to it. There is
a single source of truth (`plugins/caputchin/skills/*`), and each distribution
channel either scrapes this public repo, stores a pointer to it, or takes a
manual submission that links to it. You do not maintain per-channel copies.

Distribution is organized in four tiers. Tier A and the automation in Tier D are
built into this repo; Tier B and Tier C also need a one-time human action
(account, web form, or `git push`), documented here as a runbook.

> Activation note: Tiers B, C, and D only take effect once the repo is pushed to
> GitHub. Pushing is an explicit, separate operator decision.

## Tier A: canonical repo + Claude Code marketplace (built)

Already in the repo:

- `.claude-plugin/marketplace.json` (the catalog; marketplace name `caputchin`).
- `plugins/caputchin/.claude-plugin/plugin.json` (the plugin; `version` is
  intentionally omitted so every git commit counts as a new version, which keeps
  maintenance to zero). Set a `version` later if you want pinned release channels.
- The two skills and this plugin's README.

Users install with:

```text
/plugin marketplace add Caputchin/caputchin-sdk
/plugin install caputchin@caputchin
```

## Tier B: skills.sh + GitHub auto-scrapers (one-time setup)

`skills.sh` is a cross-agent, git-based registry: it indexes the public repo and
serves the skills to 40+ agent clients. It reads each skill's `SKILL.md` name and
the git remote; the content stays here.

One-time, per skill directory (after a push):

```sh
cd plugins/caputchin/skills/caputchin            && npx skills publish
cd plugins/caputchin/skills/caputchin-game-development && npx skills publish
```

This needs a skills.sh account/token the first time; follow the CLI prompt. The
CI workflow can automate re-publishing on release (Tier D).

GitHub-scraping indexes (SkillsMP, LobeHub, and similar) pick up public repos
automatically. To help discovery, set repository topics once:

```sh
gh repo edit Caputchin/caputchin-sdk \
  --add-topic agent-skills --add-topic claude-code \
  --add-topic skill --add-topic caputchin
```

## Tier C: curated directories (manual submission)

These need a web form or account and cannot be automated. They add a trust signal
(some scan submissions) and reach beyond Claude. For a security product, prefer
these verified channels in your docs over the mass-scrape dumps.

| Directory | What to submit | Why |
| --- | --- | --- |
| Agensi (agensi.io) | The skill(s) for review (ship free; waive revenue) | Runs a security scan; the listing is a public trust signal. |
| claudemarketplaces.com | This repo's marketplace URL | Lists the Claude Code marketplace for discovery. |
| MCP Market | The plugin (it ships an MCP server) | Reaches users browsing MCP-connected tooling. |
| ClaudeSkills.info | The skill(s) via the community form | Free Claude-focused registry. |

## Tier D: CI automation (built)

`.github/workflows/publish-skills.yml`:

- On pull request and push: validates every `SKILL.md` frontmatter (name format,
  description length and absence of angle brackets) with a self-contained check,
  so a malformed skill fails CI.
- On a published GitHub release (or manual dispatch): builds a `.skill` zip per
  skill and attaches it to the release, and runs `npx skills publish` for each
  skill, gated behind the `SKILLS_SH_TOKEN` repository secret (it no-ops until the
  secret is set, so it never fires prematurely).

## Other surfaces (manual, portable)

The same `SKILL.md` folders work on other Claude surfaces:

- **claude.ai:** zip a skill folder and upload it in Settings > Features. A `.skill`
  zip is produced by the CI release job, or locally with the skill-creator
  `package_skill.py` script.
- **Claude API:** upload via the `/v1/skills` endpoints (workspace-wide). Note the
  API code-execution sandbox has no network, so the `caputchin` skill's MCP and
  live-verify steps cannot run there; the instructional content still applies.

## One rule for all channels

Tell users to install only from the official source. A skill is executable
guidance; provenance matters, especially for a verification vendor.
