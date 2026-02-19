# アーキテクチャルール (Rules)

vll25bot の開発におけるアーキテクチャ上のルールです。
保守性を維持するために、以下のルールを遵守してください。

## 依存関係ルール (Dependency Rules)

ディレクトリ間の import は、以下の方向にのみ許可されます。

1. **Feature層 (`src/features/*`)**
    - ✅ **依存OK**: `src/core`, `src/db`, `src/config`, `src/lib`
    - 🚫 **依存NG**: 他の Feature (`src/features/other-feature`)

2. **Core層 (`src/core`)**
    - ✅ **依存OK**: `src/config`, `src/lib`
    - 🚫 **依存NG**: `src/features`

3. **DB層 (`src/db`)**
    - 可能な限り他の層に依存せず、純粋なデータアクセス層として保ってください。

## Repository パターン
- データベース操作は必ず **Repositoryクラス** (`src/db/repositories/*.ts`) を介して行ってください。
- Command や Service から直接 `db.query` などを呼び出してはいけません。
- **エラーハンドリング**:
    - データが見つからない場合: `null` を返す (`Promise<T | null>`)
    - 接続エラーなど予期しない場合: 例外をスローする

## モジュールローディング
- Command や Service ファイルは `default export` を使用してください。
- これは `src/core/loader.ts` が動的にモジュールをロードする際の仕様です。

## コーディング規約

- **命名規則**:
    - クラス: PascalCase (`ReminderRepository`)
    - ファイル: kebab-case (`reminder-repository.ts`)
    - 関数/変数: camelCase (`findUserById`)
    - 定数: UPPER_SNAKE_CASE (`CHECK_INTERVAL_MS`)
- **エラー処理**:
    - 予期しないエラーは例外をスローし、トップレベル（Command実行部）で catch してユーザーにエラーメッセージを返してください。
    - ログを適切に記録してください（`src/lib/logger.ts` を使用してください）。
- **マジックナンバー禁止**:
    - 意味のある数値・文字列リテラルは名前付き定数にしてください。
    - 定数は `src/features/[feature]/constants.ts` に集約してください。
    - 許容例: `/ 1000`（Unix timestamp変換）、`parseInt(..., 10)`、`0`, `1`, `-1`
- **ハンドラーID規約**:
    - カスタムIDの定数は `:` を含めず、連結時に `:` を付与してください。
    - `idPrefix` は文字列リテラルではなく、必ず定数を使用してください。
    - 命名: `BUTTON_ID_[FEATURE]_[ACTION]`, `MODAL_ID_[FEATURE]_[ACTION]` 等
- **customId 解析パターン**:
    - `customId` から引数を取り出す際は必ず分割代入 + `undefined` チェックを使ってください。
    - ❌ `const id = interaction.customId.split(":")[1];`（`undefined` チェックなし）
    - ✅ `const [, id] = interaction.customId.split(":");` + `if (!id) return;`
- **ハンドラーのバリデーションパターン**:
    - ユーザー所有リソースを操作するハンドラーでは、手動で所有権チェックを実装せず、共通バリデーション関数 (`validateReminderForUpdate` 等) を使ってください。
    - バリデーション関数は存在確認・所有権確認・guildId確認を一括で行い、確認済みオブジェクトも返すため、追加の DB アクセスが不要になります。
- **サービスとハンドラーの責務分担**:
    - `delete()` や `cancel()` などのサービスメソッドは、自身の副作用（元Replyメッセージの更新など）を内包します。
    - ハンドラーは同じ Discord メッセージをサービスと**二重に更新してはいけません**。ハンドラーはインタラクション元のメッセージ更新 (`interaction.update()`) のみ担当してください。
- **型インポートポリシー**:
    - 型は定義元の層から直接インポートしてください。`@db/types` の型を Feature の `types.ts` で再エクスポートするだけのファイルは作らないでください。
    - `types.ts` は Feature 固有の型を定義する場合のみ作成してください。
