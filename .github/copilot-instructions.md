# Copilot Instructions — vll25bot

## プロジェクト概要

Discord.js v14 + Bun + TypeScript の Discord Bot。主要機能はリマインダー（`remind`）とその他小規模コマンド（`misc`）。

## アーキテクチャ

3層構造で、依存方向は **Feature → Core/DB → Config/Lib** の一方向のみ。Feature 間の相互依存は禁止。

- **Core層** (`src/core/`): `CustomClient` → `Loader` → `Registry` の順で起動。`Loader` が `src/features/*/` を自動スキャンし、`commands/`・`handlers/`・`setup.ts` を動的 import する。
- **DB層** (`src/db/`): `bun:sqlite` による SQLite。`DatabaseClient` はシングルトン。データアクセスは必ず `src/db/repositories/` の Repository クラス経由。
- **Feature層** (`src/features/`): 機能単位のディレクトリ。大規模機能は `commands/`, `handlers/`, `services/`, `components/`, `utils/`, `constants.ts`, `types.ts`, `setup.ts` で構成。

## 新コマンド追加パターン

- **単純コマンド**: `src/features/misc/commands/<name>.ts` に `Command` を `default export`。Loader が自動検出する。
- **大規模機能**: `src/features/<name>/` にディレクトリを作成し、`commands/<name>.ts` で `SlashCommandBuilder` + `execute` を実装、`default export`。サブコマンドは親ファイル（例: `remind.ts`）が集約して `switch` で分岐。
- **ハンドラー**: `ButtonHandler`/`ModalHandler`/`SelectMenuHandler` を `handlers/` に配置し `default export`。`customId` は `"{idPrefix}:{args}"` 形式。ID 定数は `constants.ts` に定義し `:` を含めない。

## コーディング規約

- ランタイム: **Bun**（`bun:sqlite`, `bun:test`, `.env` 自動読み込み）
- リンター/フォーマッター: **Biome**（インデント: スペース4、ダブルクォート、セミコロンあり、trailing comma あり）
- 命名: ファイル `kebab-case`、クラス `PascalCase`、関数/変数 `camelCase`、定数 `UPPER_SNAKE_CASE`
- 環境変数: `src/config/env.ts` で Zod バリデーション済みの `env` オブジェクトを使う
- パスエイリアス: `@core/*`, `@db/*`, `@features/*`, `@config/*`, `@lib/*`, `@utils/*`, `@/*`
- ログ: `@utils/logger` の `logger` シングルトンを使用（絵文字プレフィックス付き）
- ドキュメント・コメントは日本語

## 開発ワークフロー

```bash
bun run dev          # ホットリロード付き起動
bun run deploy --guild  # ギルドコマンド登録（即反映）
bun test             # Bun テストランナー実行
bun lint-fix         # Biome 自動修正
bun format           # Biome フォーマット
```

コミット前に `bun lint-fix` と `bun format` を必ず実行。コミットメッセージは `feat:`, `fix:`, `refac:`, `docs:` 等のプレフィックス付き日本語 or 英語。

## テスト

- テストファイルは `tests/` に配置、`bun:test` の `describe`/`test`/`expect` を使用
- 時刻依存テストは `setSystemTime()` で固定（例: [tests/date-parser.test.ts](../tests/date-parser.test.ts)）

## 重要な注意点

- Feature の `setup.ts` は `export async function setup(client: Client)` をエクスポートする。Loader が自動で検出・Registry に登録し、`clientReady` 時に実行される。
- サービスクラス（例: `ReminderService`）はシングルトンパターン（`getInstance()`）。
- マジックナンバーは `constants.ts` に集約。許容例: `/ 1000`, `parseInt(..., 10)`, `0`, `1`, `-1`。
