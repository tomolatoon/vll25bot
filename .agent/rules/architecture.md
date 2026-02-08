---
trigger: always_on
---

# Architecture Rules

## Dependency Rules
To maintain a clean structure, strictly follow these dependency directions:

1. **Features Layer (`src/features/*`)**:
    - ✅ Can import from `src/core`, `src/db`, `src/config`, `src/lib`.
    - 🚫 CANNOT import from other sibling features (unless moved to `src/features/common`).
2. **Core Layer (`src/core`)**:
    - ✅ Can import from `src/config`, `src/lib`.
    - 🚫 CANNOT import from `src/features` (Exceptions: `loader.ts` for dynamic loading).
3. **DB Layer (`src/db`)**:
    - 🚫 Should not import from `src/features` or `src/core` if possible (Keep it pure).

## Repository Pattern
- **Access Policy**: All database operations MUST be performed through **Repository** classes (`src/db/repositories/*.ts`).
- **Prohibition**: Do NOT use the raw `db` client or SQL queries directly within Commands or Services.
- **Error Handling**:
    - Retrun `Promise<T | null>` for optional data (e.g., `findById`).
    - Throw **Exceptions** for unexpected infrastructure errors (e.g., connection failed).

## Module Loading
- **Default Export**: Commands and Services should use `default export` to be compatible with the dynamic loader (`src/core/loader.ts`).
