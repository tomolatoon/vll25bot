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
- **`docs/**: Update when features or project structure change.
- **`.agent/rules/`**: Update when architectural decisions or coding conventions change.