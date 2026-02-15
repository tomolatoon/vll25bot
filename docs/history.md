# バージョン履歴

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
