# データベース設計

vll25bot のデータベース設計とスキーマ定義について説明します。

## 概要

- **データベース**: SQLite (bun:sqlite)
- **ファイルパス**: `data/reminders.db`
- **パターン**: Repository Pattern
- **マイグレーション**: 自動マイグレーション（起動時に実行）

## スキーマ定義

### reminders テーブル

リマインダーの情報を格納するテーブルです。

```sql
CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    channelId TEXT NOT NULL,
    message TEXT NOT NULL,
    remindAt INTEGER NOT NULL,
    createdAt INTEGER NOT NULL,
    createdBy TEXT NOT NULL,
    guildId TEXT NOT NULL,
    replyMessageId TEXT,
    replyChannelId TEXT,
    version INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_remindAt ON reminders(remindAt);
```

#### カラム説明

| カラム名 | 型 | NULL | 説明 |
|---------|-----|------|------|
| id | TEXT | NOT NULL | リマインダーの一意識別子 (UUID v4) |
| channelId | TEXT | NOT NULL | リマインダーを送信するチャンネルID |
| message | TEXT | NOT NULL | リマインダーのメッセージ本文 |
| remindAt | INTEGER | NOT NULL | リマインド実行日時 (Unixタイムスタンプ、ミリ秒) |
| createdAt | INTEGER | NOT NULL | リマインダー作成日時 (Unixタイムスタンプ、ミリ秒) |
| createdBy | TEXT | NOT NULL | リマインダー作成者のユーザーID |
| guildId | TEXT | NOT NULL | リマインダーが作成されたサーバーID |
| replyMessageId | TEXT | NULL | リマインダー作成時の返信メッセージID |
| replyChannelId | TEXT | NULL | リマインダー作成時の返信チャンネルID |
| version | INTEGER | NOT NULL | 楽観的ロック用のバージョン番号（デフォルト: 0） |

#### インデックス

- **idx_remindAt**: `remindAt` カラムにインデックスを作成し、期限切れリマインダーの検索を高速化

## TypeScript 型定義

データベースのスキーマは TypeScript の型として定義されています。

**ファイル**: `src/db/types.ts`

```typescript
export interface Reminder {
    id: string;
    channelId: string;
    message: string;
    remindAt: number;          // Unixタイムスタンプ (ミリ秒)
    createdAt: number;         // Unixタイムスタンプ (ミリ秒)
    createdBy: string;
    guildId: string;
    replyMessageId?: string | null;
    replyChannelId?: string | null;
    version: number;           // 楽観的ロック用
}

// リマインダー作成時のデータ型（id, createdAt は自動生成）
export type ReminderData = Omit<Reminder, "id" | "createdAt">;

// リマインダー検索フィルター
export interface FilterOptions {
    channelId?: string;
    guildId?: string;
    minRemindAt?: number;
    maxRemindAt?: number;
}
```

## マイグレーション

データベースのスキーマ変更は、起動時に自動的に適用されます。

**ファイル**: `src/db/client.ts`

### マイグレーション履歴

#### 1. replyMessageId, replyChannelId カラムの追加 (v2.0.0)
```typescript
private migrateAddReplyMessageColumns() {
    // replyMessageId, replyChannelId カラムを追加
    // 既存のテーブルにカラムが存在しない場合のみ実行
}
```

#### 2. version カラムの追加 (v2.1.0 - Phase 2)
```typescript
private migrateAddVersionColumn() {
    // version カラムを追加（楽観的ロック用）
    // 既存のレコードは version = 0 で初期化
}
```

### マイグレーションの仕組み

1. Bot起動時に `DatabaseClient.init()` が実行される
2. `PRAGMA table_info(reminders)` でテーブル構造を確認
3. 必要なカラムが存在しない場合、`ALTER TABLE` で追加
4. マイグレーション完了のログを出力

## Repository Pattern

データベースへのアクセスは Repository パターンで抽象化されています。

**ファイル**: `src/db/repositories/reminder-repository.ts`

### 主要メソッド

```typescript
class ReminderRepository {
    // リマインダーを作成（id, createdAt, version は自動設定）
    async create(data: ReminderData): Promise<Reminder>

    // IDでリマインダーを取得
    async findById(id: string): Promise<Reminder | null>

    // フィルタ条件でリマインダーを検索
    async findAll(filter?: FilterOptions): Promise<Reminder[]>

    // リマインダーを更新（楽観的ロックあり）
    async update(id: string, data: Partial<ReminderData>): Promise<Reminder | null>

    // リマインダーを削除
    async delete(id: string): Promise<void>

    // フィルタ条件で一括削除
    async deleteMany(filter: FilterOptions): Promise<void>
}
```

### 使用例

```typescript
import { ReminderRepository } from "@db/repositories/reminder-repository";

const repository = new ReminderRepository();

// リマインダーを作成
const reminder = await repository.create({
    channelId: "123456789",
    message: "会議の時間です",
    remindAt: Date.now() + 3600000, // 1時間後
    createdBy: "user123",
    guildId: "guild456",
});

// リマインダーを検索
const reminders = await repository.findAll({
    guildId: "guild456",
    minRemindAt: Date.now(),
});

// リマインダーを更新
await repository.update(reminder.id, {
    message: "重要：会議の時間です",
});

// リマインダーを削除
await repository.delete(reminder.id);
```

## エラーハンドリング

データベース操作のエラーは、カスタムエラークラスで管理されています。

**ファイル**: `src/db/errors.ts`

```typescript
// 基本エラークラス
class DatabaseError extends Error
    - データベース操作の一般的なエラー

// 専用エラークラス
class NotFoundError extends DatabaseError
    - レコードが見つからない場合

class ValidationError extends DatabaseError
    - バリデーションエラー

class ConcurrencyError extends DatabaseError
    - 楽観的ロック競合エラー
```

### エラーの使用例

```typescript
try {
    await repository.update(id, updates);
} catch (error) {
    if (error instanceof ConcurrencyError) {
        // 競合エラー: 他のユーザーが更新済み
        console.log("データが更新されています。再読み込みしてください。");
    } else if (error instanceof DatabaseError) {
        // その他のデータベースエラー
        console.error("データベースエラー:", error.message);
    }
}
```

## パフォーマンス最適化

### インデックス

- `remindAt` カラムにインデックスを作成し、期限切れリマインダーの検索を高速化

### クエリ最適化

- `update()` メソッドは更新後のオブジェクトを返すため、再取得のクエリが不要
- フィルタ検索では WHERE 句でインデックスを活用

### トランザクション

複数の操作を原子的に実行する場合は、トランザクションを使用します。

```typescript
import { db } from "@db/client";

db.transaction(() => {
    // この中の全操作が成功するか、全て失敗するかのいずれか
    repository.update(id1, { ... });
    repository.update(id2, { ... });
});
```

詳細は [トランザクションと楽観的ロック](transaction-and-locking.md) を参照してください。

## 関連ドキュメント

- [トランザクションと楽観的ロック](transaction-and-locking.md)
- [ディレクトリ構成](structure.md)
- [アーキテクチャルール](rules.md)
