---
trigger: always_on
---

# Coding Style & Conventions

## File & Naming Conventions
- **Classes**: `PascalCase` (e.g., `ReminderRepository`)
- **Files (Class)**: `kebab-case`, matching the class name (e.g., `reminder-repository.ts`)
- **Files (Utilities/Other)**: `kebab-case` (e.g., `date-utils.ts`)
- **Variables/Functions**: `camelCase` (e.g., `findUserById`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRIES`)

## Specific Coding Rules

### 1. Template Literals
- **Line Breaks**: Use actual line breaks in the code file instead of `\n` characters within template literals for improved readability.
  ```typescript
  // Bad
  const msg = `Line 1\nLine 2`;
  
  // Good
  const msg = `Line 1
  Line 2`;  
  ```

### 2. Formatting & Linting
- **Format**: Run `bun format` after making changes.
- **Lint**: Run `bun lint-fix` to resolve issues.

### 3. Error Handling
- Use **Exceptions** for unexpected errors.
- Use **Null Returns** (`T | null`) for expected "not found" scenarios in Repositories.
- top-level commands should have `try-catch` blocks to handle errors gracefully and reply to the user.
