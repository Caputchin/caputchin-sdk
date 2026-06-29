# Publishing the Caputchin skills

The skills live in this one repo and everything else points back to it. There is
a single source of truth (`plugins/caputchin/skills/*`), and each distribution
channel either indexes this public repo, installs from it directly, or takes a
manual submission that links to it. You do not maintain per-channel copies.

Distribution is organized in four tiers. Tiers A, B, and D are built into this
repo and run automatically once changes are on `main`. Tier C is a manual
runbook (web forms / accounts).

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

## Tier B: skills.sh, gh skill, and GitHub auto-scrapers (no account)

There is **no skills.sh account or signup**. skills.sh is a discovery CLI over
public GitHub repos, and GitHub's own `gh skill` is the first-party publisher.
Neither needs a separate account: `gh skill` authenticates with your existing
`gh auth`. Because this repo is public with spec-compliant `SKILL.md` files, it
is already eligible.

How others find and install the skills (no account on either side):

```sh
npx skills find caputchin            # search the skills.sh directory
npx skills add Caputchin/caputchin-sdk   # install (auto-discovers the nested skills)
gh skill search caputchin            # search via GitHub
gh skill install Caputchin/caputchin-sdk
```

Publishing is `gh skill publish` (validates against the agentskills.io spec and
creates a GitHub release). It is **automated in CI** (Tier D), so a normal skills
change on `main` publishes itself. To publish a release by hand:

```sh
gh skill publish                       # interactive: pick a tag, creates a release
gh skill publish --tag skills-v1.0.0   # non-interactive (CI auto-tags skills-v<run-number>)
gh skill publish --dry-run             # validate only, no publish
```

GitHub-scraping indexes (SkillsMP, LobeHub, and similar) pick up public repos
automatically; the discovery topics (`agent-skills`, `claude-code`,
`claude-code-plugin`, `skill`, `captcha`) are already set on the repo. Optional
supply-chain hardening that `gh skill publish` recommends:

```sh
gh repo edit Caputchin/caputchin-sdk --enable-secret-scanning --enable-secret-scanning-push-protection
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

`.github/workflows/publish-skills.yml`, using GitHub's first-party `gh skill`
(no external token; it authenticates with the workflow's built-in
`GITHUB_TOKEN`):

- On pull request and push: `gh skill publish --dry-run` validates every skill
  against the agentskills.io spec (names, required frontmatter, metadata), so a
  malformed skill fails CI.
- On push to `main` that touches the skills (or via manual dispatch):
  `gh skill publish --tag skills-v<run>` creates a GitHub release for the skills,
  then attaches a `.skill` zip per skill for claude.ai upload. The `skills-v*`
  tags are namespaced apart from release-please's package tags (`mcp-v*`,
  `widget-v*`), so the two release streams do not collide.

## Other surfaces (manual, portable)

The same `SKILL.md` folders work on other Claude surfaces:

- **claude.ai:** upload a skill in Settings > Features. Grab the `.skill` zip
  attached to the latest `skills-v*` release (built by Tier D), or build one
  locally with the skill-creator `package_skill.py` script.
- **Claude API:** upload via the `/v1/skills` endpoints (workspace-wide). Note the
  API code-execution sandbox has no network, so the `caputchin` skill's MCP and
  live-verify steps cannot run there; the instructional content still applies.

## One rule for all channels

Tell users to install only from the official source. A skill is executable
guidance; provenance matters, especially for a verification vendor.
