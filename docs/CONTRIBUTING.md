# 開発者ガイド (CONTRIBUTING)

## 📚 ドキュメント構成

### 1. [環境構築とデプロイ (Setup)](operation/setup.md)
- 開発環境のセットアップ方法 (`bun install`)
- `.env` の設定
- Discord Developer Portal での Bot 作成手順
- デプロイコマンド (`bun run deploy`)

### 2. 開発ガイド (Development)
Bot の機能追加や修正を行うためのガイドラインです。

- **[アーキテクチャ (Structure)](development/structure.md)**
    - `src/` 以下のディレクトリ構成と役割
- **[アーキテクチャルール (Rules)](development/rules.md)**
    - Feature層、Core層、DB層の依存関係ルール
    - **必読**: import の制限事項について
- **[データベース設計 (Database)](development/database.md)**
    - データベーススキーマとマイグレーション
    - Repository パターンの使い方
    - エラーハンドリング
- **[トランザクションと楽観的ロック (Transaction & Locking)](development/transaction-and-locking.md)**
    - トランザクション処理の実装方法
    - 楽観的ロックによる同時更新の競合検出
    - ベストプラクティス
- **[コマンドの追加方法 (Add Command)](development/add-command.md)**
    - 新しいスラッシュコマンドを追加する手順
    - `features/misc` と `features/*` の使い分け基準
- **[ワークフロー (Workflows)](development/workflows.md)**
    - テストの実行 (`bun test`)
    - Lint と Format (`bun lint`, `bun format`)

### 3. 機能仕様書 (Features)
各機能の詳細仕様です。

- **[リマインダー機能 (Remind)](features/remind.md)**
- **[その他機能 (Misc)](features/misc.md)**

## 🚀 明確なルール
- **コミットメッセージ**: わかりやすい日本語または英語で記述してください。
- **Lint/Format**: コミット前に必ず `bun lint-fix` と `bun format` を実行してください。
- **ドキュメント更新**: 機能を追加・変更した場合は、必ず対応するドキュメントも更新してください。
