# SkillShub Rust CLI

The Rust CLI lives in `cli/` and provides the `skhub` command.

## Commands

- `skhub config show`
- `skhub config set-repo <url>`
- `skhub login --username <name> --password <password>`
- `skhub whoami`
- `skhub logout`
- `skhub package <dir>`
- `skhub publish <zip> --title "My Skill"`
- `skhub install <slug> --codex|--cursor|--claude|--openclaw`

## Local Development

```bash
cd cli
cargo check
cargo run -- --help
```

## Packaging Rules

Current Rust CLI rules:

- `SKILL.md` is required in the skill directory
- `SKILL.md` frontmatter is the primary author metadata source
- `manifest.json` is not used anymore and will be excluded from packaging
- `_meta.json` is optional and reserved for platform/package metadata
- `package` creates a zip archive from the full directory tree
- `publish` currently requires `--title`

## Install Targets

- `--codex` installs to `.agents/skills/<slug>/`
- `--cursor` installs to `.cursor/rules/skhub-<slug>.mdc`
- `--claude` installs to `.skhub/claude/skills/<slug>.md` and updates `CLAUDE.md`
- `--openclaw` installs to `skills/<slug>/`

## API Dependencies

The Rust CLI currently integrates with these backend endpoints:

- `POST /api/auth/login`
- `POST /api/skills/upload`
- `GET /api/registry/skills/:slug`
- `GET /api/registry/skills/:slug/versions/:version/bundle`
- `GET /api/skills/:id/archive`
