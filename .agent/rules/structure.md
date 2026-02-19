---
trigger: always_on
---

# Code Structure & Dependency Rules

## Layer Dependencies

Import direction MUST follow these rules strictly:

| Layer | ✅ Can import from | 🚫 CANNOT import from |
| ----- | ------------------ | ---------------------- |
| `src/features/*` | `core`, `db`, `config`, `lib` | Other sibling features (use `features/common` if shared) |
| `src/core` | `config`, `lib` | `features` (exception: `loader.ts`) |
| `src/db` | (keep pure) | `features`, `core` |

## Repository Pattern

- All DB operations MUST go through **Repository** classes in `src/db/repositories/`.
- NEVER use raw `db` client or SQL in commands/services.
- For error handling conventions, see [coding-rules.md](coding-rules.md).

## Module Loading

- Commands, handlers, and `setup.ts` MUST use **`default export`** to be loaded by `src/core/loader.ts`.

## Feature Directory Conventions

Each feature directory under `src/features/[name]/` follows this pattern:

| File/Dir | Purpose | Required? |
| --- | --- | --- |
| `commands/` | Slash command definitions | Yes |
| `handlers/` | Button, modal, select menu handlers | If needed |
| `services/` | Domain logic, business rules | If needed |
| `components/` | UI builders (embeds, action rows, modals) | If needed |
| `utils/` | Feature-specific helper functions | If needed |
| `constants.ts` | **All** constants for this feature (see [coding-rules.md](coding-rules.md)) | Yes |
| `types.ts` | Feature-specific type definitions (**only** when the feature defines its own types; do NOT create it solely to re-export types from `@db/types` or another layer — import from the source directly) | If needed |
| `setup.ts` | Register event listeners on client ready | If needed |

## Setup Pattern

When a feature needs to register event listeners (e.g., `messageReactionAdd`):

1. Create `src/features/[name]/setup.ts`
2. Export a default async function that registers handlers
3. The loader calls this automatically when the client is ready

```typescript
// src/features/[name]/setup.ts
import type { Client } from "discord.js";

export default async function setup(client: Client): Promise<void> {
    registerMyHandler(client);
}
```
