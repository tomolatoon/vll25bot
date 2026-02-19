# バージョン履歴

## v2.1.1 (2026/02/20) - コード品質改善

コードレビューで発見された設計・実装上の問題点を全件修正。

### バグ修正

- **二重メッセージ更新の解消** (`action-cancel.ts`)
  - `reminderService.delete()` が内部で元Replyメッセージを更新するにもかかわらず、ハンドラーが同じメッセージを再度更新していた問題を修正

### 設計改善

- **`updateOriginalMessage()` の統合** (`reminder-service.ts`)
  - `updateOriginalMessageAsCancelled()` と `updateOriginalMessageAsEdited()` が共通構造のため `private updateOriginalMessage()` に統合
- **所有権チェックの統一** (`list-edit.ts`, `modal-edit.ts`)
  - `list-edit.ts` の手動実装を `validateReminderForUpdate()` に統一（guildId チェック追加）
  - `modal-edit.ts` でモーダル submit 時の所有権確認が欠落していたため追加
- **`ConcurrencyError` 処理の統一** (`reminder-service.ts`, `commands/cancel.ts`)
  - `cancel()` が全エラーを汎用メッセージで吸収していた問題を修正し `reason: "conflict"` を追加

### 型安全性の向上

- **`customId.split(":")[1]` の undefined チェック追加**（`action-cancel.ts`, `action-edit.ts`, `action-copy-id.ts`, `action-reload.ts`, `modal-edit.ts`）
- **`parseSortOrder()` 型ガード追加** (`utils/list.ts`)
  - `as SortOrder` による検証なしキャストを安全な関数に置き換え

### 構造整理

- **`features/remind/types.ts` 削除** — 再エクスポートのみで独自定義なし。全インポートを `@db/types` へ統一（8ファイル更新）
- **`version: 0` 欠落の修正** (`reminder-service.ts`, `migration.ts`)

### ドキュメント・ルール更新

- `.agent/rules/coding-rules.md`: customId解析・ハンドラーバリデーション・責務分担・型インポートポリシーを追記
- `.agent/rules/structure.md` / `docs/development/rules.md` / `docs/development/structure.md`: 上記ルールを反映

## v2.1.0 (2026/02/15) - Phase 2

データベースの整合性とセキュリティを大幅に強化。

### データベース機能の強化

- **楽観的ロック (Optimistic Locking)** の実装
  - `reminders` テーブルに `version` カラムを追加
  - 同時更新時の競合を検出し、データの整合性を保証
  - 競合時にはユーザーに適切なエラーメッセージを表示
- **トランザクション処理** の実装
  - 複数のDB操作を原子的に実行可能に
  - エラー時の自動ロールバック
- **カスタムエラークラス** の整備
  - `DatabaseError`, `NotFoundError`, `ValidationError`, `ConcurrencyError`
  - エラーの原因を保持する `cause` パラメータの追加
- **パフォーマンス最適化**
  - `update()` メソッドが更新後のオブジェクトを返すように変更
  - DB再取得クエリの削減

### コード品質の向上

- **ログローテーション** の実装
  - 古いログファイル（デフォルト: 7日以上前）を自動削除
  - `LOG_RETENTION_DAYS` 環境変数で保持期間を設定可能
- **コード規約の統一**
  - `console.*` を `logger` に置き換え
  - `setup.ts` を `default export` に統一
- **エラーハンドリングの改善**
  - Repository 層で `DatabaseError` を使用
  - Service 層で `ConcurrencyError` を適切に処理
  - Handler 層でユーザーに競合を通知

### ドキュメント整備

- [データベース設計](development/database.md) を新規作成
- [トランザクションと楽観的ロック](development/transaction-and-locking.md) を新規作成
- スキーマ定義、マイグレーション、エラーハンドリングの詳細を文書化

## v2.0.0 (2026/02/10)

リマインド機能が大幅に強化され，ドキュメント整備やファイル構造を大規模に改修．

リマインドには次のような新機能が追加．

- リマインドが秒単位の正確な送信
- リマインドの編集機能
- リマインド一覧のページネーション
- リマインドの詳細表示機能
- embed による構造化された表示

コマンドの変更は次のよう．

- `/remind`
  - `/remind modify`（新規追加）
  - `/remind cancel`（`/remind remove` からの改名）
  - `/remind list`（`/remind list-all` を吸収）
  - `/remind show`（新規追加）
- `/fetch`（新規追加）

## v1.0.0 (2026/01/30)

以下の機能を一通り実装．リマインドが json で管理されていたり，ドキュメント整備やファイル構造の観点から取り急ぎの実装．

- `/ping`
- `/omikuji`
- `/kanwa`
- `/remind`
  - `/remind add`
  - `/remind remove`
  - `/remind list`
  - `/remind list-all`
