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
