# vll25bot — Project Guide for Claude Code

## Project Overview

**vll25bot** is a Discord bot for the VLL25 community.

| Item       | Value                        |
| ---------- | ---------------------------- |
| Language   | TypeScript (strict mode)     |
| Runtime    | Bun                          |
| Framework  | Discord.js                   |
| DB         | bun:sqlite (direct, no ORM)  |
| Priorities | Maintainability, Type Safety |

## Directory Structure

The project follows a **Vertical Slice Architecture** — code is organized by feature, not by technical layer.

```
src/
├── config/              # Environment variables (Zod validated)
├── core/                # Framework core (Client, Loader, Registry, Types)
├── db/                  # Data access layer (Client, Repositories, Errors)
├── features/            # Feature domains
│   └── [feature]/
│       ├── commands/    #   Slash command definitions
│       ├── handlers/    #   Interaction handlers (buttons, modals, selects)
│       ├── services/    #   Domain logic / business rules
│       ├── components/  #   UI builders (embeds, action rows, modals)
│       ├── utils/       #   Feature-specific helpers
│       ├── constants.ts #   ALL constants for this feature
│       └── setup.ts     #   Event listener registration (if needed)
├── lib/                 # Shared utilities (logger, date parser)
└── index.ts             # Application entry point
```

---

## Layer Dependency Rules

Import direction MUST follow these rules:

| Layer | ✅ Can import from | 🚫 CANNOT import from |
| ----- | ------------------ | ---------------------- |
| `src/features/*` | `core`, `db`, `config`, `lib` | Other sibling features |
| `src/core` | `config`, `lib` | `features` (except `loader.ts`) |
| `src/db` | (keep pure) | `features`, `core` |

### Repository Pattern

- All DB operations MUST go through **Repository** classes in `src/db/repositories/`.
- NEVER use raw `db` client or SQL in commands/services.
- Error handling: "not found" → return `null`; unexpected errors → throw.

### Feature Directory Conventions

| File/Dir | Purpose | Required? |
| --- | --- | --- |
| `commands/` | Slash command definitions | Yes |
| `handlers/` | Button, modal, select menu handlers | If needed |
| `services/` | Domain logic, business rules | If needed |
| `components/` | UI builders (embeds, action rows, modals) | If needed |
| `utils/` | Feature-specific helper functions | If needed |
| `constants.ts` | **All** constants for this feature | Yes |
| `types.ts` | Feature-specific type definitions (**only** when the feature defines its own types; do NOT create it solely to re-export from `@db/types`) | If needed |
| `setup.ts` | Register event listeners on client ready | If needed |

### Module Loading

Commands, handlers, and `setup.ts` MUST use **`default export`** to be loaded by `src/core/loader.ts`.

---

## Coding Rules

### Naming Conventions

| Target | Style | Example |
| --- | --- | --- |
| Classes | `PascalCase` | `ReminderRepository` |
| Files (class) | `kebab-case` matching class | `reminder-repository.ts` |
| Files (other) | `kebab-case` | `date-utils.ts` |
| Variables / Functions | `camelCase` | `findUserById` |
| Constants | `UPPER_SNAKE_CASE` | `CHECK_INTERVAL_MS` |

### Template Literals

Use actual line breaks instead of `\n`:

```typescript
// ❌ Bad
const msg = `Line 1\nLine 2`;

// ✅ Good
const msg = `Line 1
Line 2`;
```

### Error Handling

| Scenario | Approach |
| --- | --- |
| Unexpected errors | Throw **Exceptions** |
| "Not found" in repositories | Return `T \| null` |
| Top-level commands | Wrap in `try-catch`, reply to user gracefully |

### Contract Programming

For APIs (functions, methods, classes), document **preconditions** and **postconditions** using JSDoc or comments.

### Magic Numbers — PROHIBITED

All numeric/string literals with non-obvious meaning MUST be named constants.

✅ Allowed: `/ 1000` (timestamp), `parseInt(..., 10)` (radix), `0 / 1 / -1` (boundary values)

❌ Must be constants: timer intervals, string length limits, buffer values, array index fallbacks.

### Constants Management

| Scope | Location |
| --- | --- |
| Feature-specific | `src/features/[feature]/constants.ts` |
| Shared across features | `src/lib/constants.ts` |
| File-local only | Top of file |

Rules: one source of truth per constant. Export eagerly within a feature.

### Handler ID Conventions

Discord custom IDs follow the format: `prefix:arg1:arg2:...`

1. **`:` is a separator, NOT part of the prefix** — store constants WITHOUT `:`.
2. All `idPrefix` values MUST be defined constants, not string literals.

```typescript
// ❌ Bad
export const BUTTON_ID = "remind_edit:" as const;

// ✅ Good
export const BUTTON_ID_REMIND_EDIT = "remind_edit" as const;
.setCustomId(`${BUTTON_ID_REMIND_EDIT}:${reminderId}`)
```

Naming: `BUTTON_ID_[FEATURE]_[ACTION]`, `MODAL_ID_[FEATURE]_[ACTION]`, `[FEATURE]_[LIST]_PREFIX`

### customId Parsing Pattern

Always use destructuring + undefined guard when extracting customId arguments:

```typescript
// ❌ Bad — [1] may be undefined
const reminderId = interaction.customId.split(":")[1];

// ✅ Good
const [, reminderId] = interaction.customId.split(":");
if (!reminderId) return;
```

### Handler Validation Pattern

Handlers operating on user-owned resources MUST use shared validation utilities — never re-implement manually:

```typescript
// ❌ Bad — duplicates logic, misses guildId check
const reminder = await reminderService.getReminderById(id);
if (reminder.createdBy !== interaction.user.id) { ... }

// ✅ Good — centralised, consistent, no extra DB round-trip
const validation = await validateReminderForUpdate(id, interaction.user.id, interaction.guildId);
if (!validation.success) {
    await interaction.reply({ content: `❌ ${validation.error}`, flags: MessageFlags.Ephemeral });
    return;
}
const reminder = validation.reminder;
```

### Service vs Handler Responsibility

Service methods (`delete()`, `cancel()`, etc.) own their side-effects — including updating the original reply message. Handlers **MUST NOT duplicate** this:

```typescript
// ❌ Bad — duplicates what service already does
await reminderService.delete(id);
await (await ch.messages.fetch(reminder.replyMessageId)).edit(...);

// ✅ Good — service handles replyMessage; handler handles interaction message
await reminderService.delete(id);
await interaction.update({ embeds: [...], components: [...] });
```

### Type Import Policy

Import types directly from the defining layer. Do NOT create pass-through re-export files:

```typescript
// ❌ Bad
import type { Reminder } from "../types"; // features/remind/types.ts just re-exports @db/types

// ✅ Good
import type { Reminder } from "@db/types";
```

### Language Policy — Japanese Only

All human-readable text MUST be in **Japanese**: comments, JSDoc, log messages, error messages.

```typescript
// ❌ Bad
logger.error("Failed to create reminder:", error);

// ✅ Good
logger.error("❌ リマインダーの作成に失敗:", error);
```

Exceptions (English OK): type names, variable names, function names, EBNF grammar, library API references.

---

## Development Workflow

### After Every Code Change

**Automatically run the `/finish` workflow** after every code change. Do NOT wait for the user to ask.

### Adding a New Feature

Run `/new-feature` workflow when adding a new feature.

### Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

| Prefix | Usage |
| --- | --- |
| `feat:` | New feature |
| `fix:` | Bug fix and fixes with behavior changes |
| `lint:` | Lint fix |
| `refac:` | Restructuring (no behavior change) |
| `rec:` | Restructuring (with behavior change) |
| `docs:` | Documentation only |
| `chore:` | Small changes |

### Documentation Maintenance

- **`docs/`**: Update when features or project structure change.
- **`.agent/rules/`**: Update when architectural decisions or coding conventions change.
- **`CLAUDE.md`**: Keep in sync with `.agent/rules/` — this is the Claude Code equivalent of the always_on rules.
- **`.claude/commands/`**: Keep in sync with `.agent/workflows/` — Claude Code slash commands.

> **Bidirectional sync rule**: When you modify `CLAUDE.md` or `.claude/commands/`, also update the corresponding `.agent/rules/` or `.agent/workflows/` files — and vice versa.
