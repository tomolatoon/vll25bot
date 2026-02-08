---
trigger: always_on
---

# AI Agent Guidelines

This file serves as the central source of truth for AI agents (and human developers) working on the **vll25bot** project.

## Project Overview
**vll25bot** is a Discord bot for the VLL25 community, built with **TypeScript** and **Discord.js**.
The project prioritizes **maintainability**, **type safety**, and a **clean architecture** to support future feature expansions.

## Project Structure
We adopt a **Vertical Slice Architecture**-inspired structure to organize code by feature.

```
src/
  ├── config/           # Configuration & Environment Variables (Zod)
  ├── core/             # Framework Core (Client, Loader, Registry, Base Types)
  ├── db/               # Data Access Layer (Singleton Client, Repositories)
  ├── features/         # Feature Domains (e.g., reminders)
  │   └── [feature]/
  │       ├── commands/    # Slash Command Definitions
  │       ├── handlers/    # Interaction Handlers (Buttons, Modals)
  │       └── [service].ts # Domain Logic
  ├── lib/              # Shared Utilities (Logger, DateParser)
  └── index.ts          # Application Entry Point
```

## Workflow & Standards

### 1. Test & Lint
- **Always** run formatting and linting before finishing a task.
    - Format: `bun format`
    - Lint: `bun lint-fix`
- Run tests to ensure no regressions.
    - Test: `bun test`

### 2. Documentation
- Update `README.md` if new features are added.
- Maintain these `.agent/` rules if architectural decisions change.

### 3. Commit Messages
- Use clear, descriptive messages (e.g., "feat: add reminder repository", "fix: resolve date parsing issue").

## Sub-Rules
Refer to the specific rule files for detailed standards:
- [Architecture & Patterns](rules/architecture.md)
- [Coding Style & Conventions](rules/coding-style.md)
