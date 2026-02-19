---
trigger: always_on
---

# Coding Rules

## Naming Conventions

| Target | Style | Example |
| --- | --- | --- |
| Classes | `PascalCase` | `ReminderRepository` |
| Files (class) | `kebab-case` matching class | `reminder-repository.ts` |
| Files (other) | `kebab-case` | `date-utils.ts` |
| Variables / Functions | `camelCase` | `findUserById` |
| Constants | `UPPER_SNAKE_CASE` | `CHECK_INTERVAL_MS` |

## Template Literals

Use actual line breaks instead of `\n` for readability:

```typescript
// ❌ Bad
const msg = `Line 1\nLine 2`;

// ✅ Good
const msg = `Line 1
Line 2`;
```

## Error Handling

| Scenario | Approach |
| --- | --- |
| Unexpected errors | Throw **Exceptions** |
| "Not found" in repositories | Return `T \| null` |
| Top-level commands | Wrap in `try-catch`, reply to user gracefully |

## Contract Programming

For APIs (functions, methods, classes), document **preconditions** and **postconditions** using JSDoc or comments.

---

## Magic Numbers — PROHIBITED

**All numeric/string literals with non-obvious meaning MUST be named constants.**

### ✅ Allowed exceptions (no constant needed)
- `/ 1000` — Unix timestamp conversion (standard idiom)
- `parseInt(..., 10)` — Radix specification (standard idiom)
- `0`, `1`, `-1` — Obvious boundary values
- Color codes embedded in data structures with comments (e.g., fortune arrays)

### ❌ Must be constants
- Timer intervals and delays (e.g., `60 * 1000` → `CHECK_INTERVAL_MS`)
- String length limits (e.g., `50` → `LIST_MESSAGE_PREVIEW_LENGTH`)
- Buffer/threshold values (e.g., express as sum: `CHECK_INTERVAL_MS + SCHEDULE_BUFFER_MS`)
- Array indices used as fallbacks (e.g., `3` → `FALLBACK_FORTUNE_INDEX`)
- Weights or probability totals (e.g., `100` → `TOTAL_WEIGHT`)

---

## Constants Management

### Placement

| Scope | Location |
| --- | --- |
| Feature-specific | `src/features/[feature]/constants.ts` |
| Shared across features | `src/lib/constants.ts` |
| File-local only | Top of the file (if truly internal and not reused) |

### Rules
- **One source of truth**: Each constant is defined in exactly one place.
- **Export eagerly**: If a constant is used in more than one file within a feature, it belongs in `constants.ts`.
- **Group by category**: Use section comments (`// ─── Category ───`) for organization.

---

## Handler ID Conventions

Discord custom IDs follow the format: `prefix:arg1:arg2:...`

### Rules

1. **`:` is a separator, NOT part of the prefix.**
   - Constants store the prefix WITHOUT `:`.
   - `:` is added at the concatenation point.

```typescript
// ❌ Bad — `:` baked into constant / idPrefix
export const BUTTON_ID = "remind_edit:" as const;
idPrefix: "remind_edit:",

// ✅ Good — `:` separated at concatenation
export const BUTTON_ID_REMIND_EDIT = "remind_edit" as const;
idPrefix: BUTTON_ID_REMIND_EDIT,
.setCustomId(`${BUTTON_ID_REMIND_EDIT}:${reminderId}`)
```

2. **All `idPrefix` values MUST be defined constants**, not string literals.

3. **Naming pattern**:

| Handler type | Prefix pattern | Example |
| --- | --- | --- |
| Buttons | `BUTTON_ID_[FEATURE]_[ACTION]` | `BUTTON_ID_REMIND_EDIT` |
| Modals | `MODAL_ID_[FEATURE]_[ACTION]` | `MODAL_ID_REMIND_EDIT` |
| Select menus | `[FEATURE]_[LIST]_PREFIX` | `LIST_SELECT_PREFIX` |
| Disabled buttons | `DISABLED_ID_[ACTION]` | `DISABLED_ID_EDIT` |
| Catch-all | `[FEATURE]_CATCH_ALL_PREFIX` | `LIST_NAV_CATCH_ALL_PREFIX` |

4. **Registry resolution**: `idPrefix` is matched by `split(":")[0]` exact match first, then `startsWith` fallback. Keep `idPrefix` values `:` -free so they resolve in the first pass.

---

## customId Parsing Pattern

When extracting arguments from a `customId` string (format: `prefix:arg1:arg2:...`), always use destructuring assignment with an undefined guard:

```typescript
// ❌ Bad — [1] may be undefined, no guard
const reminderId = interaction.customId.split(":")[1];

// ✅ Good — destructuring + early return
const [, reminderId] = interaction.customId.split(":");
if (!reminderId) return;
```

This applies to all `ButtonHandler`, `ModalHandler`, and `SelectMenuHandler` implementations.

---

## Handler Validation Pattern

Handlers that operate on a user-owned resource MUST use the shared validation utility instead of re-implementing ownership checks manually.

```typescript
// ❌ Bad — manual, duplicates logic, misses guildId check
const reminder = await reminderService.getReminderById(id);
if (reminder.createdBy !== interaction.user.id) { ... }

// ✅ Good — centralised, consistent, includes guildId check
const validation = await validateReminderForUpdate(id, interaction.user.id, interaction.guildId);
if (!validation.success) {
    await interaction.reply({ content: `❌ ${validation.error}`, flags: MessageFlags.Ephemeral });
    return;
}
const reminder = validation.reminder; // already fetched, no extra DB round-trip
```

---

## Service vs Handler Responsibility

Service methods (e.g., `delete()`, `cancel()`) are responsible for **their own side-effects** — including updating the original reply message.

Handlers **MUST NOT duplicate** this by fetching and editing the same Discord message themselves.

```typescript
// ❌ Bad — handler re-fetches and edits replyMessageId that service already updated
await reminderService.delete(id);
const ch = await interaction.client.channels.fetch(reminder.replyChannelId);
await (await ch.messages.fetch(reminder.replyMessageId)).edit(...); // duplicate!

// ✅ Good — service handles replyMessage, handler only updates the interaction message
await reminderService.delete(id);
await interaction.update({ embeds: [...], components: [...] });
```

---

## Type Import Policy

Import types directly from the layer that defines them. Do **not** create pass-through re-export files.

```typescript
// ❌ Bad — a re-export file that adds no value
// features/remind/types.ts: export type { Reminder } from "@db/types";
import type { Reminder } from "../types"; // indirection for nothing

// ✅ Good — import from the source
import type { Reminder } from "@db/types";
```

`types.ts` in a feature directory should only exist when the feature **defines its own types**. If it only re-exports from another layer, delete it and import directly.

---

## Language Policy — Japanese Only

All human-readable text in the codebase MUST be written in **Japanese**.

| Target | Example |
| --- | --- |
| Code comments (`//`, `/* */`) | `// リマインダーの検証` |
| JSDoc (`/** */`) | `/** リマインダーを削除する */` |
| Log messages (`logger.*`) | `logger.error("❌ 作成に失敗:")` |
| `throw new Error(...)` messages | `throw new Error("作成に失敗しました")` |
| `console.*` messages | `console.error("❌ 環境変数が不正です")` |

### ❌ Prohibited

```typescript
// Generate SET clause
logger.error("Failed to create reminder:", error);
throw new Error("Failed to find reminder");
```

### ✅ Correct

```typescript
// SET句を生成
logger.error("❌ リマインダーの作成に失敗:", error);
throw new Error("リマインダーの検索に失敗しました");
```

### Exceptions (English allowed)
- Type names, variable names, function names (follow Naming Conventions)
- EBNF grammar definitions (when quoting technical specs)
- Library API names or property name references
