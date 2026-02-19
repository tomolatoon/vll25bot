---
trigger: always_on
---

# Project Overview

**vll25bot** is a Discord bot for the VLL25 community.

| Item       | Value                            |
| ---------- | -------------------------------- |
| Language   | TypeScript (strict mode)         |
| Runtime    | Bun                              |
| Framework  | Discord.js                       |
| DB         | bun:sqlite (direct, no ORM)      |
| Priorities | Maintainability, Type Safety     |

## Directory Structure

The project follows a **Vertical Slice Architecture** — code is organized by feature, not by technical layer.

```
src/
├── config/              # Environment variables (Zod validated)
├── core/                # Framework core (Client, Loader, Registry, Types)
├── db/                  # Data access layer (Client, Repositories)
├── features/            # Feature domains (see structure.md for details)
│   └── [feature]/
│       ├── commands/    #   Slash command definitions
│       ├── handlers/    #   Interaction handlers
│       ├── services/    #   Domain logic
│       ├── components/  #   UI builders
│       └── ...          #   constants.ts, types.ts, setup.ts, utils/
├── lib/                 # Shared utilities (logger, date parser)
└── index.ts             # Application entry point
```
