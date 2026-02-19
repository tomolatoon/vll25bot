---
description: コード変更後の仕上げ（format / lint / test）
---

Run these commands after every code change, in order:

```
// turbo-all
Step 1: bun format
Step 2: bun lint-fix
Step 3: bun test
```

If any step fails, fix the issues before proceeding.
