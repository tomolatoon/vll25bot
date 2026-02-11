---
description: 新しいフィーチャーの追加手順
---

```
Step 1: Create `src/features/[name]/` directory
Step 2: Create `constants.ts` — define ALL constants (IDs, colors, timers, limits) upfront
Step 3: Create `types.ts` — define feature-specific types (if needed)
Step 4: Implement commands in `commands/`
Step 5: Implement handlers in `handlers/` — use constants for `idPrefix`
Step 6: Implement services in `services/` (if domain logic needed)
Step 7: Implement UI builders in `components/` — use constants for custom IDs
Step 8: Create `setup.ts` (if event listeners needed) — default export
// turbo-all
Step 9: bun format
Step 10: bun lint-fix
Step 11: bun test
Step 12: Update `README.md` to reflect new feature
```
