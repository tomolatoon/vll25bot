---
trigger: always_on
---

# Development Workflow

## Finishing a Code Change

**After every code change, you MUST automatically run the `/finish` workflow.** Do NOT wait for the user to ask.

## Adding a New Feature

Run `/new-feature` workflow when adding a new feature.

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

| Prefix | Usage |
| --- | --- |
| `feat:` | New feature |
| `fix:` | Bug fix and fixes with behavior changes |
| `lint:` | Lint fix |
| `refac:` | Code restructuring (without behavior change) |
| `rec:` | Code restructuring (with behavior changes) |
| `docs:` | Documentation update only |
| `chore:` | Small changes (that does not match any other prefix) |

## Documentation Maintenance

- **`README.md`**: Update when features or project structure change.
- **`docs/`**: Update when features or project structure change.
- **`.agent/rules/`**: Update when architectural decisions or coding conventions change.
- **`CLAUDE.md`**: Keep in sync with `.agent/rules/` — this is the Claude Code equivalent of the always_on rules.
- **`.claude/commands/`**: Keep in sync with `.agent/workflows/` — Claude Code slash commands.

> **Bidirectional sync rule**: When you modify `.agent/rules/` or `.agent/workflows/`, also update the corresponding `CLAUDE.md` or `.claude/commands/` files — and vice versa.

## Claude Code Slash Commands

The following project-level slash commands are available in Claude Code:

| Command | File | Description |
| --- | --- | --- |
| `/finish` | `.claude/commands/finish.md` | Run format → lint-fix → test after code changes |
| `/new-feature` | `.claude/commands/new-feature.md` | Step-by-step guide for adding a new feature |