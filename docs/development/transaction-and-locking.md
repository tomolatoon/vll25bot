# トランザクションと楽観的ロック

vll25bot におけるトランザクション処理と楽観的ロック（Optimistic Locking）の実装について説明します。

## 概要

Phase 2 の実装により、以下の機能が追加されました：

- **トランザクション処理**: 複数のDB操作を原子的に実行
- **楽観的ロック**: 同時更新時の競合検出とデータ整合性の保証

これにより、複数ユーザーが同時にリマインダーを操作しても、データの整合性が保たれます。

---

## トランザクション処理

### 概要

トランザクションは、複数のデータベース操作を「全て成功」または「全て失敗」のいずれかにまとめる仕組みです。

### 実装

**ファイル**: `src/db/client.ts`

```typescript
export class DatabaseClient {
    /**
     * トランザクション内で複数のDB操作を実行する
     * @param fn - トランザクション内で実行する関数
     * @returns 関数の戻り値
     * @throws トランザクション内でエラーが発生した場合、ロールバックして例外をスロー
     */
    public transaction<T>(fn: () => T): T {
        return this.db.transaction(fn)();
    }
}
```

### 使用例

#### 基本的な使い方

```typescript
import { db } from "@db/client";

// 複数の操作を原子的に実行
db.transaction(() => {
    repository.update(id1, { message: "更新1" });
    repository.update(id2, { message: "更新2" });
    // 両方成功するか、両方失敗するか
});
```

#### エラーハンドリング

```typescript
try {
    const result = db.transaction(() => {
        const reminder1 = repository.update(id1, { ... });
        const reminder2 = repository.update(id2, { ... });
        return { reminder1, reminder2 };
    });

    console.log("トランザクション成功:", result);
} catch (error) {
    console.error("トランザクション失敗（ロールバック済み）:", error);
}
```

#### 実用例: 複数リマインダーの一括移動

```typescript
async function moveRemindersToChannel(
    guildId: string,
    oldChannelId: string,
    newChannelId: string
): Promise<number> {
    return db.transaction(() => {
        const reminders = repository.findAll({
            guildId,
            channelId: oldChannelId
        });

        let count = 0;
        for (const reminder of reminders) {
            repository.update(reminder.id, {
                channelId: newChannelId
            });
            count++;
        }

        return count;
    });
}
```

### トランザクションの仕組み

1. `transaction()` メソッドが呼ばれると、SQLite の `BEGIN TRANSACTION` が実行される
2. 関数内の全ての操作が成功すれば、`COMMIT` が実行される
3. いずれかの操作が失敗すれば、`ROLLBACK` が実行され、全ての変更が取り消される

---

## 楽観的ロック (Optimistic Locking)

### 概要

楽観的ロックは、同時更新時の競合を検出する仕組みです。各レコードに `version` カラムを持たせ、更新時にバージョン番号をチェックすることで、競合を検出します。

### 仕組み

```
┌────────────────────────────────────────────────────────────┐
│ ユーザーA                    ユーザーB                      │
├────────────────────────────────────────────────────────────┤
│ 1. リマインダー取得          1. リマインダー取得            │
│    { id: "123", version: 0 }    { id: "123", version: 0 }  │
│                                                              │
│ 2. 編集開始                  2. 編集開始                    │
│    message: "会議" → "重要"     remindAt: 10:00 → 11:00    │
│                                                              │
│ 3. 更新実行 ✅                                              │
│    UPDATE ... WHERE id=123                                  │
│    AND version=0                                            │
│    SET version=1                                            │
│                                                              │
│                             4. 更新実行 ❌                   │
│                                UPDATE ... WHERE id=123      │
│                                AND version=0  ← 一致しない！│
│                                → ConcurrencyError           │
└────────────────────────────────────────────────────────────┘
```

### 実装

#### データベーススキーマ

```sql
CREATE TABLE reminders (
    -- ... 他のカラム ...
    version INTEGER NOT NULL DEFAULT 0
);
```

#### Repository 層

**ファイル**: `src/db/repositories/reminder-repository.ts`

```typescript
async update(
    id: string,
    data: Partial<ReminderData>,
): Promise<Reminder | null> {
    // 更新前のデータを取得（現在の version を確認）
    const existing = await this.findById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
            updates.push(`${key} = ?`);
            params.push(value);
        }
    }

    if (updates.length === 0) return existing;

    // version を自動インクリメント
    updates.push("version = version + 1");

    // WHERE 句で現在の version を確認（楽観的ロック）
    params.push(id);
    params.push(existing.version);

    const sql = `UPDATE reminders SET ${updates.join(", ")} WHERE id = ? AND version = ?`;

    try {
        const result = db.run(sql, params);

        // 更新行数が 0 = version が一致しない = 競合発生
        if (result.changes === 0) {
            throw new ConcurrencyError(
                "リマインダーが他のユーザーによって更新されました。"
            );
        }

        // 更新後のオブジェクトを返す
        return {
            ...existing,
            ...data,
            version: existing.version + 1,
        };
    } catch (error) {
        if (error instanceof ConcurrencyError) {
            throw error;
        }
        throw new DatabaseError("更新に失敗しました", error);
    }
}
```

#### Service 層

**ファイル**: `src/features/remind/services/reminder-service.ts`

```typescript
import { ConcurrencyError } from "@db/errors";

public async update(
    id: string,
    updates: Partial<ReminderData>,
): Promise<Reminder | null> {
    try {
        const existing = await this.repository.findById(id);
        if (!existing) return null;

        // ... バリデーション ...

        const updated = await this.repository.update(id, updates);
        return updated;
    } catch (error) {
        // 楽観的ロック競合エラーは呼び出し元で処理するため再スロー
        if (error instanceof ConcurrencyError) {
            logger.warn(`⚠️ 競合検出: ${id}`);
            throw error;
        }
        logger.error("更新失敗:", error);
        return null;
    }
}
```

#### Handler 層（UI）

**ファイル**: `src/features/remind/handlers/modal-edit.ts`

```typescript
import { ConcurrencyError } from "@db/errors";

try {
    const updated = await reminderService.update(reminderId, {
        message: newMessage,
        remindAt: dateValidation.date?.getTime(),
    });

    if (!updated) {
        await interaction.reply({
            content: "❌ 更新に失敗しました",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    await interaction.reply({
        content: "✅ 更新しました",
        flags: MessageFlags.Ephemeral,
    });
} catch (error) {
    // 楽観的ロック競合エラー
    if (error instanceof ConcurrencyError) {
        await interaction.reply({
            content: "⚠️ このリマインダーは他のユーザーによって更新されました。\n最新のデータを確認してから再度編集してください。",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }
    // その他のエラー
    await interaction.reply({
        content: "❌ 予期しないエラーが発生しました。",
        flags: MessageFlags.Ephemeral,
    });
}
```

### 楽観的ロックのメリット

✅ **競合検出**: 同時更新時に片方の変更が失われるのを防ぐ
✅ **デッドロック回避**: 悲観的ロックと異なり、ロック待ちが発生しない
✅ **パフォーマンス**: 読み取り操作にロックが不要
✅ **ユーザー体験**: 競合時に適切なフィードバック

### 楽観的ロックのデメリット

❌ **競合頻度が高い場合**: 頻繁に競合が発生すると、リトライが必要になる
❌ **実装の複雑さ**: エラーハンドリングが必要

vll25bot のような Discord Bot では、同じリマインダーを複数ユーザーが同時に編集することは稀なため、楽観的ロックが適しています。

---

## テスト

### 楽観的ロックのテスト例

```typescript
import { describe, test, expect } from "bun:test";
import { ReminderRepository } from "@db/repositories/reminder-repository";
import { ConcurrencyError } from "@db/errors";

describe("楽観的ロック", () => {
    test("競合時に ConcurrencyError をスロー", async () => {
        const repository = new ReminderRepository();

        // リマインダーを作成
        const reminder = await repository.create({
            channelId: "123",
            message: "テスト",
            remindAt: Date.now() + 3600000,
            createdBy: "user1",
            guildId: "guild1",
        });

        // 同じレコードを2回取得（2つの編集セッションをシミュレート）
        const session1 = await repository.findById(reminder.id);
        const session2 = await repository.findById(reminder.id);

        expect(session1?.version).toBe(0);
        expect(session2?.version).toBe(0);

        // session1 で更新成功
        const updated1 = await repository.update(session1!.id, {
            message: "変更1"
        });
        expect(updated1?.version).toBe(1);

        // session2 で更新しようとすると、version が古いため失敗
        await expect(
            repository.update(session2!.id, { message: "変更2" })
        ).rejects.toThrow(ConcurrencyError);
    });
});
```

### トランザクションのテスト例

```typescript
test("トランザクション: エラー時にロールバック", async () => {
    const repository = new ReminderRepository();

    // リマインダーを2つ作成
    const reminder1 = await repository.create({ ... });
    const reminder2 = await repository.create({ ... });

    try {
        db.transaction(() => {
            repository.update(reminder1.id, { message: "更新1" });

            // 意図的にエラーを発生させる
            throw new Error("テストエラー");

            repository.update(reminder2.id, { message: "更新2" });
        });
    } catch (error) {
        // エラーをキャッチ
    }

    // 両方のリマインダーが元のまま（ロールバックされている）
    const check1 = await repository.findById(reminder1.id);
    const check2 = await repository.findById(reminder2.id);

    expect(check1?.message).not.toBe("更新1");
    expect(check2?.message).not.toBe("更新2");
});
```

---

## ベストプラクティス

### トランザクションの使用

- ✅ **複数の操作を原子的に実行したい場合**に使用
- ✅ **短時間で完了する操作**に限定（長時間のロックを避ける）
- ❌ **単一の操作**には不要（オーバーヘッドが増える）

### 楽観的ロックの使用

- ✅ **ユーザーからの入力を受け付ける更新操作**で使用
- ✅ **競合時にはユーザーに適切なエラーメッセージを表示**
- ❌ **競合頻度が非常に高い場合**は悲観的ロックを検討

### エラーハンドリング

- ✅ `ConcurrencyError` は必ず Handler 層でキャッチしてユーザーに通知
- ✅ エラーメッセージは具体的に（「更新済み」「再読み込みが必要」など）
- ✅ ログには競合の詳細を記録（デバッグ用）

---

## 関連ドキュメント

- [データベース設計](database.md)
- [アーキテクチャルール](rules.md)
- [エラーハンドリング](../features/remind.md#エラーハンドリング)
